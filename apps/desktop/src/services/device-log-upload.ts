import { fetchWithAuth } from "../lib/fetch-with-auth";
import { loadLatestLogFile, logTimeRange } from "../lib/log-parse";
import { authStore } from "../stores/auth";

import { logger } from "./logger";

export type UploadLogResult = { id: string; filename: string };

/** Read the current session log file and upload it to the server for this device. */
export async function uploadCurrentLog(): Promise<UploadLogResult> {
  const { serverUrl, deviceId } = authStore.state;
  if (!deviceId) throw new Error("No device registered yet");

  const file = await loadLatestLogFile();
  if (file.error) throw new Error(file.error);
  if (!file.content.trim()) throw new Error("Log file is empty");

  const { startedAt, endedAt } = logTimeRange(file.entries);

  const response = await fetchWithAuth(`${serverUrl}/api/device-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      filename: file.name,
      content: file.content,
      lineCount: file.entries.length,
      startedAt,
      endedAt,
    }),
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

  const data = (await response.json()) as { id: string };
  logger.info(`[device-logs] uploaded ${file.name} (${file.content.length} bytes) → ${data.id}`);
  return { id: data.id, filename: file.name };
}
