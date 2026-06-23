import { readFile } from "@tauri-apps/plugin-fs";

import { computeHash } from "./hash";
import { logger } from "./logger";

export async function uploadLocalFile(
  localPath: string,
  syncFolderId: string,
  relativePath: string,
  deviceId: string,
  version: number,
  serverUrl: string,
  accessToken: string,
): Promise<{ contentHash: string }> {
  const rawData = await readFile(localPath);
  const data = new Uint8Array(rawData instanceof Uint8Array ? rawData.buffer : rawData);
  const contentHash = await computeHash(data);

  const form = new FormData();
  form.append("syncFolderId", syncFolderId);
  form.append("deviceId", deviceId);
  form.append("relativePath", relativePath);
  form.append("contentHash", contentHash);
  form.append("size", String(data.byteLength));
  form.append("mtime", new Date().toISOString());
  form.append("version", String(version));
  form.append("file", new Blob([data]), relativePath.split("/").at(-1) ?? "file");

  const response = await fetch(`${serverUrl}/api/sync/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${text}`);
  }

  logger.info(`Uploaded: ${relativePath}`);
  return { contentHash };
}
