import { join } from "@tauri-apps/api/path";
import { exists, readFile } from "@tauri-apps/plugin-fs";

import { fetchWithAuth } from "../lib/fetch-with-auth";
import { useAuthStore } from "../stores/auth";

import { downloadFile } from "./downloader";
import { computeHash } from "./hash";
import { logger } from "./logger";

type RemoteEntry = {
  id: string;
  relativePath: string;
  contentHash: string;
  size: number;
  mtime: string;
  version: number;
};

export async function reconcile(syncFolderId: string, localBasePath: string): Promise<void> {
  const { serverUrl, deviceId } = useAuthStore.getState();
  if (!deviceId || !serverUrl) return;

  logger.info(`Reconciling sync folder ${syncFolderId}`);

  const response = await fetchWithAuth(`${serverUrl}/api/sync/state/${syncFolderId}`);

  if (!response.ok) {
    logger.error(`Failed to fetch sync state: ${response.status}`);
    return;
  }

  const remoteEntries = (await response.json()) as RemoteEntry[];

  for (const entry of remoteEntries) {
    const localPath = await join(localBasePath, entry.relativePath);
    const isFilePresent = await exists(localPath);

    if (!isFilePresent) {
      logger.debug(`Downloading missing file: ${entry.relativePath}`);
      await downloadFile(
        entry.id,
        syncFolderId,
        localBasePath,
        entry.relativePath,
        entry.contentHash,
        entry.version,
        serverUrl,
      );
      continue;
    }

    const rawData = await readFile(localPath);
    const fileData = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
    const localHash = await computeHash(fileData);

    if (localHash !== entry.contentHash) {
      logger.debug(`Server is newer, downloading: ${entry.relativePath}`);
      await downloadFile(
        entry.id,
        syncFolderId,
        localBasePath,
        entry.relativePath,
        entry.contentHash,
        entry.version,
        serverUrl,
      );
    }
  }

  logger.info(`Reconciliation complete for ${syncFolderId}`);
}
