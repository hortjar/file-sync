import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, File, FolderOpen, Monitor, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardTitle } from "../components/ui/card";
import {
  getApiSyncFoldersByIdOptions,
  getApiSyncFoldersOptions,
  getApiSyncStateBySyncFolderIdOptions,
  getApiSyncStateBySyncFolderIdQueryKey,
} from "../generated/@tanstack/react-query.gen";

type FileEntry = { id: string; relativePath: string; size: number; mtime: string };
type ServerLink = { deviceId: string; deviceName: string; platform: string; localPath: string };
type ServerFolder = { id: string; name: string; createdAt: string; links: ServerLink[] };
type SyncFolder = { id: string; name: string };

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index] ?? "B"}`;
}

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

  function handleRefresh() {
    void queryClient.invalidateQueries({
      queryKey: getApiSyncStateBySyncFolderIdQueryKey({ path: { syncFolderId: folderId } }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/folders"
          className="flex size-8 items-center justify-center rounded-xl text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-[hsl(var(--text))]">
            {folder?.name ?? folderId}
          </h1>
          <p className="text-sm text-[hsl(var(--text-muted))]">
            {t("folders.files", { count: entries.length })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh}>
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Linked devices (collapsed by default) */}
      <Card className="mb-4">
        <button
          className="flex w-full items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3"
          onClick={() => setDevicesOpen((v) => !v)}
        >
          <CardTitle className="text-sm">{t("folders.linkedDevices")}</CardTitle>
          <div className="flex items-center gap-2">
            {isServerLoading && (
              <span className="size-3 animate-spin rounded-full border border-current border-t-transparent text-[hsl(var(--text-faint))]" />
            )}
            <ChevronDown
              className={`size-4 text-[hsl(var(--text-faint))] transition-transform ${devicesOpen ? "" : "-rotate-90"}`}
            />
          </div>
        </button>
        {devicesOpen && (
          <CardContent className="p-0">
            {serverFolder?.links.length === 0 && (
              <p className="px-5 py-3 text-sm text-[hsl(var(--text-faint))]">
                {t("folders.noDevices")}
              </p>
            )}
            {serverFolder?.links.map((link) => (
              <div
                key={link.deviceId}
                className="flex items-start gap-3 border-b border-[hsl(var(--border-subtle))] px-5 py-3 last:border-0"
              >
                <Monitor className="mt-0.5 size-4 shrink-0 text-[hsl(var(--text-faint))]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--text))]">{link.deviceName}</p>
                  <p className="truncate font-mono text-xs text-[hsl(var(--text-faint))]">
                    {link.localPath}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* File list */}
      <Card>
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-5 py-3">
          <FolderOpen className="size-4 text-[hsl(var(--brand-from))]" />
          <CardTitle className="text-sm">{t("folders.files", { count: entries.length })}</CardTitle>
        </div>
        <CardContent className="p-2">
          {isFilesLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-[hsl(var(--text-muted))]">
              <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("common.loading")}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-[hsl(var(--text-muted))]">
              {t("folders.noFiles")}
            </p>
          ) : (
            <div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[hsl(var(--surface-2))]"
                >
                  <File className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
                  <span className="flex-1 truncate text-[hsl(var(--text))]">
                    {entry.relativePath}
                  </span>
                  <span className="shrink-0 text-xs text-[hsl(var(--text-faint))]">
                    {formatSize(entry.size)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
