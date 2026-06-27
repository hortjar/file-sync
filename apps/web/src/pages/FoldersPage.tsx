import { FolderIcon, PlatformIcon, iconBg, iconBorder } from "@file-sync/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Trash2 } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  deleteApiSyncFoldersByIdMutation,
  getApiSyncFoldersOptions,
  getApiSyncFoldersQueryKey,
  postApiSyncFoldersMutation,
} from "../generated/@tanstack/react-query.gen";
import { downloadFolderZip } from "../lib/download";
import { toast } from "../lib/toast";

type SyncFolder = {
  id: string;
  name: string;
  iconKey: string;
  iconColor: string | undefined;
  createdAt: string;
  devices: { name: string; platform: string }[];
};

export function FoldersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<SyncFolder | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: foldersRaw, isLoading } = useQuery(getApiSyncFoldersOptions());
  const folders = (foldersRaw as SyncFolder[] | undefined) ?? [];

  const folderDeletion = useMutation({
    ...deleteApiSyncFoldersByIdMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      setConfirmDelete(undefined);
      toast.success(t("folders.deleteFolder"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const folderCreation = useMutation({
    ...postApiSyncFoldersMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      setIsCreateOpen(false);
      folderForm.reset();
      toast.success(t("folders.created"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const folderForm = useForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      const name = value.name.trim();
      if (!name) return;
      folderCreation.mutate({ body: { name } });
    },
  });

  function closeCreate() {
    setIsCreateOpen(false);
    folderForm.reset();
  }

  async function downloadFolder(folder: SyncFolder) {
    try {
      await downloadFolderZip(folder.id, folder.name);
    } catch {
      toast.error(t("folders.downloadFailed"));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[hsl(var(--text-muted))]">
        <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("folders.title")}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
            {t("folders.subtitle", { count: folders.length })}
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-3.5" />
          {t("folders.newFolder")}
        </Button>
      </div>

      {folders.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[hsl(var(--brand-from)/.2)] bg-[hsl(var(--brand-from)/.1)]">
            <FolderIcon iconKey="folder" className="size-8 text-[hsl(var(--brand-from)/.6)]" />
          </div>
          <p className="font-medium text-[hsl(var(--text))]">{t("folders.noFolders")}</p>
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("folders.noFoldersHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="group cursor-pointer transition-shadow hover:shadow-[var(--shadow-sm)]"
              onClick={() => void navigate(`/folders/${folder.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
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
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[hsl(var(--text))]">
                    {folder.name}
                  </p>
                  {folder.devices.length > 0 ? (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[hsl(var(--text-faint))]">
                      {folder.devices
                        .filter(
                          (device, index) =>
                            folder.devices.findIndex((other) => other.name === device.name) ===
                            index,
                        )
                        .map((device) => (
                          <span key={device.name} className="inline-flex items-center gap-1">
                            <PlatformIcon platform={device.platform} className="size-3" />
                            {device.name}
                          </span>
                        ))}
                    </span>
                  ) : (
                    <p className="text-xs text-[hsl(var(--text-faint))]">
                      {t("folders.noDevices")}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  title={t("folders.downloadAll")}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    void downloadFolder(folder);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    setConfirmDelete(folder);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))]"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void folderForm.handleSubmit();
            }}
            className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-[var(--shadow-lg)]"
          >
            <h2 className="text-base font-semibold text-[hsl(var(--text))]">
              {t("folders.newFolder")}
            </h2>
            <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
              {t("folders.newFolderHint")}
            </p>
            <folderForm.Field name="name">
              {(field) => (
                <input
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={t("folders.namePlaceholder")}
                  className="mt-4 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-2 text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-faint))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-from))]"
                  autoFocus
                />
              )}
            </folderForm.Field>
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeCreate}>
                {t("common.cancel")}
              </Button>
              <folderForm.Subscribe
                selector={(state) => [state.values.name, state.isSubmitting] as const}
              >
                {([name, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={folderCreation.isPending || isSubmitting}
                    disabled={!name.trim()}
                  >
                    {t("folders.create")}
                  </Button>
                )}
              </folderForm.Subscribe>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-[var(--shadow-lg)]">
            <h2 className="text-base font-semibold text-[hsl(var(--text))]">
              {t("folders.confirmDelete", { name: confirmDelete.name })}
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--text-muted))]">
              {t("folders.confirmDeleteHint")}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDelete(undefined)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={folderDeletion.isPending}
                onClick={() => folderDeletion.mutate({ path: { id: confirmDelete.id } })}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
