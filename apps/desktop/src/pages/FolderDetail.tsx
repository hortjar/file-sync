import { FolderIcon, TreeItem, buildTree, iconBg, iconBorder } from "@file-sync/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  HardDrive,
  Monitor,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import {
  getApiSyncFoldersByIdOptions,
  getApiSyncFoldersByIdQueryKey,
  getApiSyncFoldersOptions,
  getApiSyncStateBySyncFolderIdOptions,
  getApiSyncStateBySyncFolderIdQueryKey,
} from "../generated/@tanstack/react-query.gen";
import { reconcile } from "../services/reconciler";
import { useAuthStore } from "../stores/auth";
import { useLinksStore } from "../stores/links";

type FileEntry = {
  id: string;
  relativePath: string;
  contentHash: string | null;
  size: number;
  mtime: string;
  version: number;
};

type SyncFolder = {
  id: string;
  name: string;
  iconKey: string;
  iconColor: string | undefined;
};

type ServerLink = {
  deviceId: string;
  deviceName: string;
  platform: string;
  localPath: string;
};

type ServerFolder = {
  id: string;
  name: string;
  createdAt: string;
  links: ServerLink[];
};

export function FolderDetailPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const parameters = useParams({ strict: false });
  const folderId = parameters["id"] ?? "";

  const deviceId = useAuthStore((s) => s.deviceId);
  const folderPaths = useLinksStore((s) => s.folderPaths);
  const localPathInStore = folderPaths[folderId];

  const [isSyncing, setIsSyncing] = useState(false);
  const [isDevicesExpanded, setIsDevicesExpanded] = useState(false);

  const { data: foldersData } = useQuery(getApiSyncFoldersOptions());
  const folder = ((foldersData as SyncFolder[] | undefined) ?? []).find((f) => f.id === folderId);

  const { data: serverFolderRaw, isLoading: isServerFolderLoading } = useQuery(
    getApiSyncFoldersByIdOptions({ path: { id: folderId } }),
  );
  const serverFolder = serverFolderRaw as ServerFolder | undefined;
  const thisDeviceLink = serverFolder?.links.find((l) => l.deviceId === deviceId);

  const {
    data: stateData,
    isLoading: isFilesLoading,
    isError,
  } = useQuery(getApiSyncStateBySyncFolderIdOptions({ path: { syncFolderId: folderId } }));

  const entries = (stateData as FileEntry[] | undefined) ?? [];
  const tree = buildTree(entries);

  function handleRefresh() {
    void queryClient.invalidateQueries({
      queryKey: getApiSyncStateBySyncFolderIdQueryKey({ path: { syncFolderId: folderId } }),
    });
    void queryClient.invalidateQueries({
      queryKey: getApiSyncFoldersByIdQueryKey({ path: { id: folderId } }),
    });
  }

  async function handleForceSync() {
    if (!localPathInStore || isSyncing) return;
    setIsSyncing(true);
    try {
      await reconcile(folderId, localPathInStore);
      handleRefresh();
      toast.success("Force sync complete");
    } catch (error: unknown) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/" })}>
          <ArrowLeft className="size-4" />
        </Button>

        {folder && (
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
                color={folder.iconColor}
                className="size-4 text-[hsl(var(--brand-from))]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-[hsl(var(--text))]">{folder.name}</h1>
              {localPathInStore && (
                <p className="truncate text-xs text-[hsl(var(--text-faint))]">{localPathInStore}</p>
              )}
            </div>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-xs text-[hsl(var(--text-faint))]">
            {entries.length} {entries.length === 1 ? "file" : "files"}
          </span>
          {localPathInStore && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleForceSync()}
              title="Force sync"
              loading={isSyncing}
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Server-confirmed sync status */}
      <div className="mb-4 rounded-lg border border-white/[0.07] bg-white/[0.03]">
        <button
          className="flex w-full items-center justify-between border-b border-white/[0.05] px-4 py-3"
          onClick={() => setIsDevicesExpanded((v) => !v)}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
            Linked Devices
          </span>
          <div className="flex items-center gap-2">
            {isServerFolderLoading && (
              <div className="size-3 animate-spin rounded-full border border-current border-t-transparent text-[hsl(var(--text-faint))]" />
            )}
            <ChevronDown
              className={`size-3.5 text-[hsl(var(--text-faint))] transition-transform ${isDevicesExpanded ? "" : "-rotate-90"}`}
            />
          </div>
        </button>

        {isDevicesExpanded && (
          <>
            {serverFolder && serverFolder.links.length === 0 && (
              <p className="px-4 py-3 text-xs text-[hsl(var(--text-faint))]">
                No devices linked yet.
              </p>
            )}

            {serverFolder?.links.map((link) => {
              const isThis = link.deviceId === deviceId;
              return (
                <div
                  key={link.deviceId}
                  className="flex items-start gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0"
                >
                  <Monitor className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--text))]">
                        {link.deviceName}
                      </span>
                      {isThis && (
                        <span className="rounded-full bg-[hsl(var(--brand-from)/.15)] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--brand-from))]">
                          this device
                        </span>
                      )}
                      <span className="capitalize text-xs text-[hsl(var(--text-faint))]">
                        {link.platform}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[hsl(var(--text-faint))]">
                      {link.localPath}
                    </p>
                  </div>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                </div>
              );
            })}

            {/* This device not linked on server */}
            {!isServerFolderLoading && !thisDeviceLink && (
              <div className="flex items-center gap-3 border-t border-white/[0.04] px-4 py-3">
                <XCircle className="size-4 shrink-0 text-[hsl(var(--text-faint))]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    This device is not linked on the server.
                  </p>
                  <p className="mt-0.5 text-xs text-[hsl(var(--text-faint))]">
                    Go back and use "Link folder" to connect a local directory.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local store status row — shows whether in-memory state matches server */}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[hsl(var(--surface-2))] px-3 py-2 text-xs">
        {localPathInStore ? (
          <>
            <HardDrive className="size-3.5 shrink-0 text-[hsl(var(--brand-from))]" />
            <span className="text-[hsl(var(--text-faint))]">Active local path:</span>
            <span className="truncate font-mono text-[hsl(var(--text))]">{localPathInStore}</span>
            <span className="ml-auto shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
              watching
            </span>
          </>
        ) : (
          <>
            <HardDrive className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
            <span className="text-[hsl(var(--text-faint))]">
              No active local path — sync watcher not running on this device
            </span>
          </>
        )}
      </div>

      <div className="rounded-lg border border-white/[0.07] bg-white/[0.03]">
        {isFilesLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
            <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading files…
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-[hsl(var(--text-muted))]">
            Could not load files — check server connection.
          </p>
        ) : tree.length === 0 ? (
          <p className="py-16 text-center text-sm text-[hsl(var(--text-muted))]">
            No files synced yet.
          </p>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <TreeItem key={node.path} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
