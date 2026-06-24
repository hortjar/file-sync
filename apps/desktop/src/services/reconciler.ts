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
  if (!deviceId || !serverUrl) {
    logger.warn(`[reconcile] skipping ${syncFolderId} — no deviceId or serverUrl`);
    return;
  }

  logger.info(`[reconcile] starting for folder ${syncFolderId} at ${localBasePath}`);

  const response = await fetchWithAuth(`${serverUrl}/api/sync/state/${syncFolderId}`);

  if (!response.ok) {
    logger.error(`[reconcile] failed to fetch sync state: ${response.status}`);
    return;
  }

  const remoteEntries = (await response.json()) as RemoteEntry[];
  logger.info(`[reconcile] found ${remoteEntries.length} remote entries for ${syncFolderId}`);

  let downloaded = 0;
  let skipped = 0;

  for (const entry of remoteEntries) {
    const localPath = await join(localBasePath, entry.relativePath);
    const isFilePresent = await exists(localPath);

    if (!isFilePresent) {
      logger.info(`[reconcile] missing locally, downloading: ${entry.relativePath}`);
      try {
        await downloadFile(
          entry.id,
          syncFolderId,
          localBasePath,
          entry.relativePath,
          entry.contentHash,
          entry.version,
          serverUrl,
        );
        downloaded++;
      } catch (error: unknown) {
        logger.error(`[reconcile] download failed for ${entry.relativePath}`, error);
      }
      continue;
    }

    const rawData = await readFile(localPath);
    const fileData = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
    const localHash = await computeHash(fileData);

    if (localHash === entry.contentHash) {
      skipped++;
    } else {
      logger.info(`[reconcile] hash mismatch, downloading: ${entry.relativePath}`);
      try {
        await downloadFile(
          entry.id,
          syncFolderId,
          localBasePath,
          entry.relativePath,
          entry.contentHash,
          entry.version,
          serverUrl,
        );
        downloaded++;
      } catch (error: unknown) {
        logger.error(`[reconcile] download failed for ${entry.relativePath}`, error);
      }
    }
  }

  logger.info(
    `[reconcile] complete for ${syncFolderId}: ${downloaded} downloaded, ${skipped} up-to-date`,
  );
}
