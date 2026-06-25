import { listen } from "@tauri-apps/api/event";

import { getApiConflictsQueryKey } from "../hooks/use-conflict-count";
import { fetchWithAuth } from "../lib/fetch-with-auth";
import { queryClient } from "../lib/query";
import { useAuthStore } from "../stores/auth";
import { useFileVersionsStore } from "../stores/file-versions";
import { useSyncStatusStore } from "../stores/sync-status";

import { isExpectedWrite } from "./downloader";
import { computeHash } from "./hash";
import { logger } from "./logger";
import { uploadLocalFile } from "./uploader";

type FileChangeEvent = {
  kind: string;
  paths: string[];
  syncFolderId: string;
  localBase: string;
};

type CheckResult = { result: "accept" | "conflict" | "up-to-date" };

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function handleFileChange(
  localPath: string,
  syncFolderId: string,
  localBase: string,
  isDelete: boolean,
): Promise<void> {
  const { serverUrl, deviceId } = useAuthStore.getState();
  if (!deviceId) {
    logger.warn("[sync] handleFileChange: no deviceId, skipping");
    return;
  }

  if (isDelete) {
    const relativePath = localPath.replace(localBase, "").replace(/^[/\\]/u, "");
    logger.info(`[sync] delete: ${relativePath}`);
    await fetchWithAuth(`${serverUrl}/api/sync/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncFolderId, relativePath, deviceId }),
    });
    logger.debug(`[sync] delete reported: ${relativePath}`);
    return;
  }

  await pushLocalFile(localPath, syncFolderId, localBase);
}

/**
 * Upload a single local file to the server if it isn't already current there.
 * Shared by the live watcher (`handleFileChange`) and the initial reconcile
 * scan so newly-linked folders push their pre-existing files too.
 */
export async function pushLocalFile(
  localPath: string,
  syncFolderId: string,
  localBase: string,
): Promise<void> {
  const { serverUrl, deviceId } = useAuthStore.getState();
  if (!deviceId) {
    logger.warn("[sync] pushLocalFile: no deviceId, skipping");
    return;
  }

  const relativePath = localPath.replace(localBase, "").replace(/^[/\\]/u, "");
  logger.debug(`[sync] processing change: ${relativePath}`);

  const { readFile } = await import("@tauri-apps/plugin-fs");
  const rawData = await readFile(localPath);
  const data = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
  const contentHash = await computeHash(data);
  logger.debug(`[sync] hash=${contentHash} size=${data.byteLength} for ${relativePath}`);

  if (isExpectedWrite(localPath, contentHash)) {
    logger.debug(`[sync] skipping expected write: ${relativePath}`);
    return;
  }

  const versionStore = useFileVersionsStore.getState();
  const nextVersion = versionStore.getVersion(syncFolderId, relativePath) + 1;
  logger.debug(`[sync] checking ${relativePath} v${nextVersion} hash=${contentHash}`);

  const checkResponse = await fetchWithAuth(`${serverUrl}/api/sync/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      syncFolderId,
      relativePath,
      contentHash,
      size: data.byteLength,
      mtime: new Date().toISOString(),
      version: nextVersion,
      deviceId,
    }),
  });

  const { result } = (await checkResponse.json()) as CheckResult;
  logger.info(`[sync] check result for ${relativePath}: ${result}`);

  if (result === "up-to-date") {
    logger.debug(`[sync] up-to-date: ${relativePath}`);
    return;
  }

  if (result === "conflict") {
    logger.warn(`[sync] conflict detected: ${relativePath}`);
    void queryClient.invalidateQueries({ queryKey: getApiConflictsQueryKey() });
    return;
  }

  logger.info(`[sync] uploading: ${relativePath} v${nextVersion} (${data.byteLength} bytes)`);
  useSyncStatusStore.getState().setStatus("syncing");

  const { accessToken } = useAuthStore.getState();
  await uploadLocalFile(
    localPath,
    syncFolderId,
    relativePath,
    deviceId,
    nextVersion,
    serverUrl,
    accessToken ?? "",
  );
  versionStore.setVersion(syncFolderId, relativePath, nextVersion);
  useSyncStatusStore.getState().markSynced();
  logger.info(`[sync] upload complete: ${relativePath} v${nextVersion}`);
}

export async function startSyncEngine(): Promise<() => void> {
  const unlisten = await listen<FileChangeEvent>("fs:change", ({ payload }) => {
    const { kind, paths, syncFolderId, localBase } = payload;
    const isDelete = kind.toLowerCase().includes("remove");

    logger.debug(
      `[sync] fs:change event kind=${kind} paths=${paths.length} folder=${syncFolderId}`,
    );

    for (const filePath of paths) {
      const key = `${syncFolderId}::${filePath}`;
      clearTimeout(debounceTimers.get(key));
      debounceTimers.set(
        key,
        setTimeout(() => {
          debounceTimers.delete(key);
          void handleFileChange(filePath, syncFolderId, localBase, isDelete).catch(
            (syncError: unknown) => {
              logger.error(`[sync] unhandled error for ${filePath}`, syncError);
              useSyncStatusStore.getState().setStatus("error", "Sync error — check logs");
            },
          );
        }, 300),
      );
    }
  });

  logger.info("[sync] sync engine started");
  return unlisten;
}
