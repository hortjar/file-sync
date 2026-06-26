import { join } from "@tauri-apps/api/path";
import { exists, readDir, readFile } from "@tauri-apps/plugin-fs";

import { fetchWithAuth } from "../lib/fetch-with-auth";
import { authStore } from "../stores/auth";

import { downloadFile } from "./downloader";
import { computeHash } from "./hash";
import { logger } from "./logger";
import { pushLocalFile } from "./sync-engine";

// Mirror of the watcher's skip rules (src-tauri/src/watcher.rs) so the initial
// scan ignores the same noise the live watcher does.
const SKIP_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini", ".git", "node_modules"]);

function shouldSkip(name: string): boolean {
  return SKIP_NAMES.has(name) || name.endsWith(".tmp") || name.endsWith(".part");
}

/** Recursively collect every file path under `dir`, descending into subfolders. */
async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readDir(directory);
  const files: string[] = [];
  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;
    const fullPath = await join(directory, entry.name);
    if (entry.isDirectory) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile) {
      files.push(fullPath);
    }
  }
  return files;
}

type RemoteEntry = {
  id: string;
  relativePath: string;
  contentHash: string;
  size: number;
  mtime: string;
  version: number;
};

export async function reconcile(syncFolderId: string, localBasePath: string): Promise<void> {
  const { serverUrl, deviceId } = authStore.state;
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
    `[reconcile] download pass for ${syncFolderId}: ${downloaded} downloaded, ${skipped} up-to-date`,
  );

  // Upload pass: walk the local tree (including subfolders) and push any files
  // that aren't current on the server. `pushLocalFile` runs `/api/sync/check`
  // first, so files already up-to-date (e.g. just downloaded) are skipped.
  let scanned = 0;
  try {
    const localFiles = await walkFiles(localBasePath);
    scanned = localFiles.length;
    for (const filePath of localFiles) {
      try {
        await pushLocalFile(filePath, syncFolderId, localBasePath);
      } catch (error: unknown) {
        logger.error(`[reconcile] upload failed for ${filePath}`, error);
      }
    }
  } catch (error: unknown) {
    logger.error(`[reconcile] local scan failed for ${syncFolderId}`, error);
  }

  logger.info(`[reconcile] upload pass for ${syncFolderId}: scanned ${scanned} local file(s)`);
}
