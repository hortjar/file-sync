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
  if (!deviceId) return;

  const relativePath = localPath.replace(localBase, "").replace(/^[/\\]/u, "");

  if (isDelete) {
    await fetchWithAuth(`${serverUrl}/api/sync/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncFolderId, relativePath, deviceId }),
    });
    return;
  }

  const { readFile } = await import("@tauri-apps/plugin-fs");
  const rawData = await readFile(localPath);
  const data = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
  const contentHash = await computeHash(data);

  if (isExpectedWrite(localPath, contentHash)) {
    logger.debug(`Skipping expected write: ${relativePath}`);
    return;
  }

  const versionStore = useFileVersionsStore.getState();
  const nextVersion = versionStore.getVersion(syncFolderId, relativePath) + 1;

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

  if (result === "up-to-date") {
    logger.debug(`Up to date: ${relativePath}`);
    return;
  }

  if (result === "conflict") {
    logger.warn(`Conflict detected: ${relativePath}`);
    void queryClient.invalidateQueries({ queryKey: getApiConflictsQueryKey() });
    return;
  }

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
}

export async function startSyncEngine(): Promise<() => void> {
  const unlisten = await listen<FileChangeEvent>("fs:change", ({ payload }) => {
    const { kind, paths, syncFolderId, localBase } = payload;
    const isDelete = kind.toLowerCase().includes("remove");

    for (const filePath of paths) {
      const key = `${syncFolderId}::${filePath}`;
      clearTimeout(debounceTimers.get(key));
      debounceTimers.set(
        key,
        setTimeout(() => {
          debounceTimers.delete(key);
          void handleFileChange(filePath, syncFolderId, localBase, isDelete).catch(
            (syncError: unknown) => {
              logger.error("Sync engine error", syncError);
              useSyncStatusStore.getState().setStatus("error", "Sync error — check logs");
            },
          );
        }, 300),
      );
    }
  });

  logger.info("Sync engine started");
  return unlisten;
}
