import { FolderIcon, TreeItem, buildTree, iconBg, iconBorder } from "@file-sync/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Monitor, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import {
  getApiSyncFoldersByIdOptions,
  getApiSyncFoldersOptions,
  getApiSyncStateBySyncFolderIdOptions,
  getApiSyncStateBySyncFolderIdQueryKey,
} from "../generated/@tanstack/react-query.gen";

type FileEntry = { id: string; relativePath: string; size: number; mtime: string };
type ServerLink = { deviceId: string; deviceName: string; platform: string; localPath: string };
type ServerFolder = { id: string; name: string; createdAt: string; links: ServerLink[] };
type SyncFolder = { id: string; name: string; iconKey: string; iconColor: string | undefined };

export function FolderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const folderId = id ?? "";
  const queryClient = useQueryClient();
  const [devicesOpen, setDevicesOpen] = useState(false);

  const { data: foldersRaw } = useQuery(getApiSyncFoldersOptions());
  const folder = ((foldersRaw as SyncFolder[] | undefined) ?? []).find((f) => f.id === folderId);

  const { data: serverFolderRaw, isLoading: isServerLoading } = useQuery(
    getApiSyncFoldersByIdOptions({ path: { id: folderId } }),
  );
  const serverFolder = serverFolderRaw as ServerFolder | undefined;

  const { data: stateRaw, isLoading: isFilesLoading } = useQuery(
    getApiSyncStateBySyncFolderIdOptions({ path: { syncFolderId: folderId } }),
  );
  const entries = (stateRaw as FileEntry[] | undefined) ?? [];
  const tree = buildTree(entries);

  function handleRefresh() {
    void queryClient.invalidateQueries({
      queryKey: getApiSyncStateBySyncFolderIdQueryKey({ path: { syncFolderId: folderId } }),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/folders"
          className="flex size-8 items-center justify-center rounded-xl text-[hsl(var(--text-muted))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))]"
        >
          <ArrowLeft className="size-4" />
        </Link>

        {folder ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: iconBg(folder.iconColor),
                borderColor: iconBorder(folder.iconColor),
              }}
            >
              <FolderIcon
                iconKey={folder.iconKey}
                color={folder.iconColor ?? undefined}
                className="size-4 text-[hsl(var(--brand-from))]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-[hsl(var(--text))]">
                {folder.name}
              </h1>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                {t("folders.files", { count: entries.length })}
              </p>
            </div>
          </div>
        ) : (
          <h1 className="flex-1 truncate text-xl font-semibold text-[hsl(var(--text))]">
            {folderId}
          </h1>
        )}

        <Button variant="ghost" size="icon" onClick={handleRefresh} title={t("common.refresh")}>
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Linked devices (collapsible) */}
      <div className="mb-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3"
          onClick={() => setDevicesOpen((v) => !v)}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
            {t("folders.linkedDevices")}
          </span>
          <div className="flex items-center gap-2">
            {isServerLoading && (
              <span className="size-3 animate-spin rounded-full border border-current border-t-transparent text-[hsl(var(--text-faint))]" />
            )}
            <ChevronDown
              className={`size-3.5 text-[hsl(var(--text-faint))] transition-transform ${devicesOpen ? "" : "-rotate-90"}`}
            />
          </div>
        </button>

        {devicesOpen && (
          <>
            {serverFolder?.links.length === 0 && (
              <p className="px-4 py-3 text-xs text-[hsl(var(--text-faint))]">
                {t("folders.noDevices")}
              </p>
            )}
            {serverFolder?.links.map((link) => (
              <div
                key={link.deviceId}
                className="flex items-start gap-3 border-b border-[hsl(var(--border-subtle))] px-4 py-3 last:border-0"
              >
                <Monitor className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[hsl(var(--text))]">
                      {link.deviceName}
                    </span>
                    <span className="capitalize text-xs text-[hsl(var(--text-faint))]">
                      {link.platform}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[hsl(var(--text-faint))]">
                    {link.localPath}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* File tree */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-4 py-3">
          <FolderIcon
            iconKey={folder?.iconKey ?? "folder"}
            color={folder?.iconColor}
            className="size-3.5 text-[hsl(var(--brand-from))]"
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
            {t("folders.files", { count: entries.length })}
          </span>
        </div>

        <div className="p-2">
          {isFilesLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[hsl(var(--text-muted))]">
              <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("common.loading")}
            </div>
          ) : tree.length === 0 ? (
            <p className="py-12 text-center text-sm text-[hsl(var(--text-muted))]">
              {t("folders.noFiles")}
            </p>
          ) : (
            tree.map((node) => <TreeItem key={node.path} node={node} depth={0} />)
          )}
        </div>
      </div>
    </div>
  );
}
