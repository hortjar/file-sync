import { dirname, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";

import {
  getApiSyncFoldersByIdQueryKey,
  getApiSyncStateBySyncFolderIdQueryKey,
} from "../generated/@tanstack/react-query.gen";
import { fetchWithAuth } from "../lib/fetch-with-auth";
import { queryClient } from "../lib/query";
import { useFileVersionsStore } from "../stores/file-versions";

import { logger } from "./logger";

const expectedWrites = new Set<string>();

export function markExpectedWrite(localPath: string, contentHash: string): void {
  expectedWrites.add(`${localPath}::${contentHash}`);
}

export function isExpectedWrite(localPath: string, contentHash: string): boolean {
  const key = `${localPath}::${contentHash}`;
  const wasExpected = expectedWrites.has(key);
  expectedWrites.delete(key);
  return wasExpected;
}

export async function downloadFile(
  fileEntryId: string,
  syncFolderId: string,
  localBasePath: string,
  relativePath: string,
  contentHash: string,
  version: number,
  serverUrl: string,
): Promise<void> {
  const url = `${serverUrl}/api/sync/download/${fileEntryId}`;
  logger.info(`[download] fetching ${relativePath} from ${url}`);

  const response = await fetchWithAuth(url);
  logger.info(
    `[download] response status=${response.status} ok=${String(response.ok)} for ${relativePath}`,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed: ${response.status} ${text}`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  logger.info(`[download] buffer size=${buffer.byteLength} bytes for ${relativePath}`);

  const localPath = await join(localBasePath, relativePath);
  const directory = await dirname(localPath);
  logger.info(`[download] localPath=${localPath} directory=${directory}`);

  try {
    await mkdir(directory, { recursive: true });
    logger.info(`[download] mkdir ok: ${directory}`);
  } catch (mkdirError: unknown) {
    logger.error(`[download] mkdir failed for ${directory}`, mkdirError);
    throw mkdirError;
  }

  markExpectedWrite(localPath, contentHash);

  try {
    await writeFile(localPath, buffer);
    logger.info(`[download] writeFile ok: ${localPath}`);
  } catch (writeError: unknown) {
    logger.error(`[download] writeFile failed for ${localPath}`, writeError);
    throw writeError;
  }

  useFileVersionsStore.getState().setVersion(syncFolderId, relativePath, version);

  void queryClient.invalidateQueries({
    queryKey: getApiSyncFoldersByIdQueryKey({ path: { id: syncFolderId } }),
  });
  void queryClient.invalidateQueries({
    queryKey: getApiSyncStateBySyncFolderIdQueryKey({ path: { syncFolderId } }),
  });
  logger.info(`[download] complete: ${relativePath}`);
}
