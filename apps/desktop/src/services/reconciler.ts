import { join } from "@tauri-apps/api/path";
import { exists, readDir, readFile } from "@tauri-apps/plugin-fs";
import i18n from "i18next";

import { fetchWithAuth } from "../lib/fetch-with-auth";
import { toast } from "../lib/toast";
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

type ScanFailure = { path: string; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Distinguish "can't access this path" failures (Windows ACLs, Tauri fs scope,
 * a file held open by another process) from incidental I/O errors so the user
 * gets an actionable message instead of a generic one.
 */
function isPermissionError(message: string): boolean {
  return /denied|permission|forbidden|not allowed|os error 5/iu.test(message);
}

/**
 * Recursively collect every file path under `directory`, descending into
 * subfolders. A directory we can't read (forbidden path / permission denied)
 * is recorded in `failures` and skipped rather than aborting the whole scan, so
 * one locked subfolder never blocks the rest of the tree from syncing.
 */
async function walkFiles(directory: string, failures: ScanFailure[]): Promise<string[]> {
  let entries;
  try {
    entries = await readDir(directory);
  } catch (error: unknown) {
    failures.push({ path: directory, message: errorMessage(error) });
    logger.warn(`[reconcile] cannot read directory ${directory}: ${errorMessage(error)}`);
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;
    const fullPath = await join(directory, entry.name);
    if (entry.isDirectory) {
      files.push(...(await walkFiles(fullPath, failures)));
    } else if (entry.isFile) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Surface skipped-file problems to the user via toast + notification history. */
function warnScanFailures(localBasePath: string, failures: ScanFailure[]): void {
  if (failures.length === 0) return;

  const folder = localBasePath.split(/[/\\]/u).findLast(Boolean) ?? localBasePath;
  const isPermission = failures.some((failure) => isPermissionError(failure.message));
  const reason = i18n.t(isPermission ? "sync.scanPermissionReason" : "sync.scanGenericReason");

  logger.error(
    `[reconcile] ${failures.length} path(s) skipped in ${localBasePath}`,
    failures.map((failure) => `${failure.path}: ${failure.message}`).join("; "),
  );

  toast.error(i18n.t("sync.scanIssuesTitle", { folder }), {
    description: i18n.t("sync.scanIssuesDesc", { count: failures.length, reason }),
  });
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
  // Per-directory and per-file failures are collected and surfaced to the user
  // rather than aborting the scan or hiding only in the log.
  const failures: ScanFailure[] = [];
  const localFiles = await walkFiles(localBasePath, failures);

  for (const filePath of localFiles) {
    try {
      await pushLocalFile(filePath, syncFolderId, localBasePath);
    } catch (error: unknown) {
      failures.push({ path: filePath, message: errorMessage(error) });
      logger.error(`[reconcile] upload failed for ${filePath}`, error);
    }
  }

  logger.info(
    `[reconcile] upload pass for ${syncFolderId}: scanned ${localFiles.length} local file(s), ${failures.length} failure(s)`,
  );

  warnScanFailures(localBasePath, failures);
}
