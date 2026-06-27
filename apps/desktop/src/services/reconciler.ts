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
 * Log a reconcile failure verbosely: which operation failed, the exact path,
 * whether it looks like a permission/forbidden-path problem, and a full stack
 * trace (the logger serialises Error stacks). Tauri fs errors surface as plain
 * strings with no stack, so we wrap them to synthesise one and pin down where
 * in the reconcile pipeline the failure originated.
 */
function logReconcileError(operation: string, path: string, error: unknown): void {
  const message = errorMessage(error);
  const tag = isPermissionError(message) ? " [permission/forbidden-path]" : "";
  const wrapped = error instanceof Error ? error : new Error(message);
  logger.error(`[reconcile] ${operation} failed — path=${path}${tag} — ${message}`, wrapped);
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
    logReconcileError("readDir", directory, error);
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

  // Verbose summary — each failure was already logged with its own stack trace
  // at the point it happened; this collects them in one place alongside the
  // user-facing toast so the full picture is together in the log.
  logger.error(
    `[reconcile] ${failures.length} path(s) skipped in ${localBasePath} (permission=${isPermission})`,
    failures.map((failure) => `  • ${failure.path}: ${failure.message}`).join("\n"),
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

  let response: Response;
  try {
    response = await fetchWithAuth(`${serverUrl}/api/sync/state/${syncFolderId}`);
  } catch (error: unknown) {
    logReconcileError("fetch sync state", `${serverUrl}/api/sync/state/${syncFolderId}`, error);
    return;
  }

  if (!response.ok) {
    logger.error(
      `[reconcile] failed to fetch sync state for ${syncFolderId}: HTTP ${response.status} ${response.statusText}`,
    );
    return;
  }

  const remoteEntries = (await response.json()) as RemoteEntry[];
  logger.info(`[reconcile] found ${remoteEntries.length} remote entries for ${syncFolderId}`);

  let downloaded = 0;
  let skipped = 0;

  for (const entry of remoteEntries) {
    const localPath = await join(localBasePath, entry.relativePath);

    let isFilePresent: boolean;
    try {
      isFilePresent = await exists(localPath);
    } catch (error: unknown) {
      logReconcileError("exists", localPath, error);
      continue;
    }

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
        logReconcileError("download (missing file)", localPath, error);
      }
      continue;
    }

    let localHash: string;
    try {
      const rawData = await readFile(localPath);
      const fileData = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
      localHash = await computeHash(fileData);
    } catch (error: unknown) {
      logReconcileError("readFile/hash", localPath, error);
      continue;
    }

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
        logReconcileError("download (hash mismatch)", localPath, error);
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
  logger.debug(`[reconcile] walking local tree for ${syncFolderId} at ${localBasePath}`);
  const localFiles = await walkFiles(localBasePath, failures);
  logger.debug(`[reconcile] walk found ${localFiles.length} local file(s) for ${syncFolderId}`);

  for (const filePath of localFiles) {
    try {
      await pushLocalFile(filePath, syncFolderId, localBasePath);
    } catch (error: unknown) {
      failures.push({ path: filePath, message: errorMessage(error) });
      logReconcileError("upload (pushLocalFile)", filePath, error);
    }
  }

  logger.info(
    `[reconcile] upload pass for ${syncFolderId}: scanned ${localFiles.length} local file(s), ${failures.length} failure(s)`,
  );

  warnScanFailures(localBasePath, failures);
}
