import { FolderIcon, iconBg, iconBorder } from "@file-sync/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, LinkIcon, Plus, RefreshCw, Trash2 } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import i18n from "../i18n/index";
import { toast } from "../lib/toast";

import { FolderIconPicker } from "../components/FolderIconPicker";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import {
  deleteApiSyncFoldersByIdMutation,
  getApiSyncFoldersOptions,
  getApiSyncFoldersQueryKey,
  patchApiSyncFoldersByIdMutation,
  postApiSyncFoldersByIdLinksMutation,
  postApiSyncFoldersMutation,
} from "../generated/@tanstack/react-query.gen";
import { requestFolderPermissions } from "../services/permission-check";
import { reconcile } from "../services/reconciler";
import { useAuthStore } from "../stores/auth";
import { setFolderPath, useLinksStore } from "../stores/links";

type LinkedDevice = { name: string; platform: string };
type SyncFolder = {
  id: string;
  name: string;
  iconKey: string;
  iconColor: string | undefined;
  createdAt: string;
  devices: LinkedDevice[];
};

function toMessage(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : i18n.t("common.unknownError");
}

function permissionMessage(canRead: boolean, canWrite: boolean): string | undefined {
  const hint = i18n.t("permissions.settingsHint");
  if (!canRead && !canWrite) return i18n.t("permissions.cantAccess", { hint });
  if (!canRead) return i18n.t("permissions.cantRead", { hint });
  if (!canWrite) return i18n.t("permissions.cantWrite", { hint });
  return undefined;
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[hsl(var(--brand-from)/.2)] bg-[hsl(var(--brand-from)/.1)]">
        <FolderIcon iconKey="folder" className="size-8 text-[hsl(var(--brand-from)/.6)]" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-[hsl(var(--text))]">
        {t("folders.emptyTitle")}
      </h3>
      <p className="mb-6 max-w-xs text-sm text-[hsl(var(--text-muted))]">{t("folders.emptyHint")}</p>
      <Button onClick={onOpen}>
        <Plus className="size-4" />
        {t("folders.createFirst")}
      </Button>
    </div>
  );
}

type FolderCardProperties = {
  folder: SyncFolder;
  linkedPath: string | undefined;
  deviceId: string | undefined;
  onLink: (folder: SyncFolder) => void;
  onDelete: (id: string) => void;
  onPickAppearance: (folder: SyncFolder) => void;
  onViewDetail: (folder: SyncFolder) => void;
  isDeleting: boolean;
};

function FolderCard({
  folder,
  linkedPath,
  deviceId,
  onLink,
  onDelete,
  onPickAppearance,
  onViewDetail,
  isDeleting,
}: FolderCardProperties) {
  const { t } = useTranslation();
  const otherDevices = folder.devices;
  const uniqueDeviceNames = [...new Set(otherDevices.map((d) => d.name))];

  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-[var(--shadow-sm)]"
      onClick={() => onViewDetail(folder)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onViewDetail(folder);
      }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onPickAppearance(folder);
          }}
          title={t("folders.changeIconColor")}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all"
          style={{
            backgroundColor: iconBg(folder.iconColor),
            borderColor: iconBorder(folder.iconColor),
          }}
        >
          <FolderIcon
            iconKey={folder.iconKey}
            color={folder.iconColor ?? undefined}
            className="size-5 text-[hsl(var(--brand-from))]"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[hsl(var(--text))]">{folder.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {linkedPath ? (
              <span className="truncate text-xs text-[hsl(var(--text-faint))]">{linkedPath}</span>
            ) : (
              <span className="text-xs text-[hsl(var(--text-faint))]">
                {t("folders.createdOn", { date: new Date(folder.createdAt).toLocaleDateString() })}
              </span>
            )}
            {uniqueDeviceNames.length > 0 && (
              <span className="text-xs text-[hsl(var(--text-faint))] opacity-60">
                {t("folders.alsoOn", { devices: uniqueDeviceNames.join(", ") })}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {deviceId ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onLink(folder);
              }}
            >
              <LinkIcon className="size-3.5" />
              {linkedPath ? t("folders.changePath") : t("folders.linkFolder")}
            </Button>
          ) : (
            <span className="text-xs text-[hsl(var(--text-faint))]">{t("folders.registering")}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            loading={isDeleting}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onDelete(folder.id);
            }}
            className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))]"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
      {children}
    </p>
  );
}

export function SyncFoldersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const deviceId = useAuthStore((s) => s.deviceId);
  const folderPaths = useLinksStore((s) => s.folderPaths);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [linkingFolder, setLinkingFolder] = useState<SyncFolder | undefined>(undefined);
  const [appearanceFolder, setAppearanceFolder] = useState<SyncFolder | undefined>(undefined);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useQuery(getApiSyncFoldersOptions());
  const folders = (data as SyncFolder[] | undefined) ?? [];

  const syncedFolders = folders.filter((f) => Object.hasOwn(folderPaths, f.id));
  const unsyncedFolders = folders.filter((f) => !Object.hasOwn(folderPaths, f.id));

  const newFolderMutation = useMutation({
    ...postApiSyncFoldersMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success(t("folders.created"));
    },
    onError: (thrown) => {
      toast.error(t("folders.createFailed"), { description: toMessage(thrown) });
    },
  });

  const appearanceMutation = useMutation({
    ...patchApiSyncFoldersByIdMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
    },
    onError: (thrown) => {
      toast.error(t("folders.appearanceUpdateFailed"), { description: toMessage(thrown) });
    },
  });

  const linkFolderMutation = useMutation({
    ...postApiSyncFoldersByIdLinksMutation(),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      const syncFolderId = variables.path.id;
      const localPath = variables.body.localPath;
      setFolderPath(syncFolderId, localPath);
      void invoke("start_watching", { syncFolderId, localPath });
      void reconcile(syncFolderId, localPath);
      setLinkingFolder(undefined);
      setSelectedPath(undefined);
      toast.success(t("folders.linked"));
    },
    onError: (thrown) => {
      toast.error(t("folders.linkFailed"), { description: toMessage(thrown) });
    },
  });

  const folderDeleteMutation = useMutation({
    ...deleteApiSyncFoldersByIdMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      toast.success(t("folders.deleted"));
    },
    onError: (thrown) => {
      toast.error(t("folders.deleteFailed"), { description: toMessage(thrown) });
    },
  });

  const createForm = useForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      const name = value.name.trim();
      if (!name) return;
      newFolderMutation.mutate({ body: { name } });
    },
  });

  async function pickFolder() {
    const path = await open({ directory: true, multiple: false });
    if (typeof path !== "string") return;

    setSelectedPath(path);
    setPermissionError(undefined);
    setIsCheckingPermission(true);
    try {
      const { canRead, canWrite } = await requestFolderPermissions(path);
      const error = permissionMessage(canRead, canWrite);
      if (error) setPermissionError(error);
    } finally {
      setIsCheckingPermission(false);
    }
  }

  async function handleLink() {
    if (!linkingFolder || !selectedPath || !deviceId) return;

    const { canRead, canWrite } = await requestFolderPermissions(selectedPath);
    const error = permissionMessage(canRead, canWrite);
    if (error) {
      setPermissionError(error);
      return;
    }

    linkFolderMutation.mutate({
      path: { id: linkingFolder.id },
      body: { deviceId, localPath: selectedPath },
    });
  }

  function closeLinkDialog(isOpen: boolean) {
    if (isOpen) return;
    setLinkingFolder(undefined);
    setSelectedPath(undefined);
    setPermissionError(undefined);
  }

  function handleAppearancePick(icon: string, color: string | undefined) {
    if (!appearanceFolder) return;
    appearanceMutation.mutate({
      path: { id: appearanceFolder.id },
      body:
        color === undefined
          ? { iconKey: icon, clearIconColor: true }
          : { iconKey: icon, iconColor: color },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[hsl(var(--text-muted))]">
        <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t("folders.loadingFolders")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="mb-1 text-sm font-medium text-[hsl(var(--text))]">
          {t("folders.loadError")}
        </p>
        <p className="text-xs text-[hsl(var(--text-muted))]">{t("folders.loadErrorHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text))]">{t("folders.title")}</h1>
          <p className="mt-0.5 text-sm text-[hsl(var(--text-muted))]">
            {folders.length === 0
              ? t("folders.noFoldersYet")
              : t("folders.summary", { synced: syncedFolders.length, total: folders.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title={t("folders.refresh")}
            onClick={() =>
              void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() })
            }
          >
            <RefreshCw className="size-4" />
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                {t("folders.newFolder")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("folders.newFolderTitle")}</DialogTitle>
                <DialogDescription>{t("folders.newFolderHint")}</DialogDescription>
              </DialogHeader>
              <form
                id="create-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createForm.handleSubmit();
                }}
              >
                <createForm.Field name="name">
                  {(field) => (
                    <Input
                      name={field.name}
                      label={t("folders.name")}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder={t("folders.namePlaceholder")}
                      required
                      autoFocus
                    />
                  )}
                </createForm.Field>
              </form>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  {t("folders.cancel")}
                </Button>
                <Button form="create-form" type="submit" loading={newFolderMutation.isPending}>
                  {t("folders.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {folders.length === 0 && <EmptyState onOpen={() => setIsCreateOpen(true)} />}

      {syncedFolders.length > 0 && (
        <section className="mb-6">
          <SectionHeader>{t("folders.syncingSection")}</SectionHeader>
          <div className="flex flex-col gap-2">
            {syncedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                linkedPath={folderPaths[folder.id]}
                deviceId={deviceId}
                onLink={(f) => {
                  setLinkingFolder(f);
                  setSelectedPath(undefined);
                  setPermissionError(undefined);
                }}
                onDelete={(id) => folderDeleteMutation.mutate({ path: { id } })}
                onPickAppearance={setAppearanceFolder}
                onViewDetail={(f) => void navigate({ to: "/folders/$id", params: { id: f.id } })}
                isDeleting={folderDeleteMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {unsyncedFolders.length > 0 && (
        <section>
          {syncedFolders.length > 0 && <Separator className="mb-5 bg-white/[0.06]" />}
          <SectionHeader>{t("folders.notSyncedSection")}</SectionHeader>
          <p className="mb-3 text-xs text-[hsl(var(--text-muted))]">
            {t("folders.linkHintPrefix")} <strong>{t("folders.linkHintAction")}</strong>{" "}
            {t("folders.linkHintSuffix")}
          </p>
          <div className="flex flex-col gap-2">
            {unsyncedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                linkedPath={undefined}
                deviceId={deviceId}
                onLink={(f) => {
                  setLinkingFolder(f);
                  setSelectedPath(undefined);
                  setPermissionError(undefined);
                }}
                onDelete={(id) => folderDeleteMutation.mutate({ path: { id } })}
                onPickAppearance={setAppearanceFolder}
                onViewDetail={(f) => void navigate({ to: "/folders/$id", params: { id: f.id } })}
                isDeleting={folderDeleteMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Appearance picker */}
      {appearanceFolder && (
        <FolderIconPicker
          open
          currentIcon={appearanceFolder.iconKey}
          currentColor={appearanceFolder.iconColor}
          onPick={handleAppearancePick}
          onClose={() => setAppearanceFolder(undefined)}
        />
      )}

      {/* Link local folder dialog */}
      <Dialog open={linkingFolder !== undefined} onOpenChange={closeLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("folders.chooseLocalFolder")}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="folders.chooseLocalFolderHint"
                values={{ name: linkingFolder?.name ?? "" }}
                components={[<strong key="name" />]}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-medium text-[hsl(var(--text))]">
                {t("folders.localPath")}
              </span>
              <div className="flex h-9 items-center truncate rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3.5 text-sm text-[hsl(var(--text))]">
                {selectedPath ? (
                  <span className="truncate">{selectedPath}</span>
                ) : (
                  <span className="text-[hsl(var(--text-faint))]">
                    {t("folders.noFolderSelected")}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              className="mt-6 shrink-0"
              onClick={() => void pickFolder()}
              loading={isCheckingPermission}
            >
              {t("folders.browse")}
            </Button>
          </div>

          {permissionError && (
            <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--danger)/.1)] px-3 py-2 text-xs text-[hsl(var(--danger))]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>{permissionError}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkingFolder(undefined)}>
              {t("folders.cancel")}
            </Button>
            <Button
              onClick={() => void handleLink()}
              loading={linkFolderMutation.isPending || isCheckingPermission}
              disabled={!selectedPath || !!permissionError || isCheckingPermission}
            >
              <LinkIcon className="size-4" />
              {t("folders.syncThisFolder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
