import { join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";

import { getApiSyncFoldersByIdQueryKey } from "../generated/@tanstack/react-query.gen";
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
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${await response.text()}`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const localPath = await join(localBasePath, relativePath);
  const directory = localPath.split("/").slice(0, -1).join("/");

  await mkdir(directory, { recursive: true });

  markExpectedWrite(localPath, contentHash);
  await writeFile(localPath, buffer);

  useFileVersionsStore.getState().setVersion(syncFolderId, relativePath, version);

  void queryClient.invalidateQueries({
    queryKey: getApiSyncFoldersByIdQueryKey({ path: { id: syncFolderId } }),
  });
  logger.debug(`Downloaded: ${relativePath}`);
}
