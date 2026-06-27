import { fetchWithAuth } from "../lib/fetch-with-auth";
import { authStore } from "../stores/auth";
import { type NotificationEntry, notificationsStore } from "../stores/notifications";

import { uploadCurrentLog } from "./device-log-upload";
import { logger } from "./logger";

// At most one automatic full-log upload per window, so a burst of errors doesn't
// repeatedly re-upload the whole file.
const AUTO_UPLOAD_THROTTLE_MS = 5 * 60 * 1000;

const reportedIds = new Set<string>();
const autoUpload = { lastAt: 0 };

async function pushEvent(entry: NotificationEntry): Promise<void> {
  const { serverUrl, deviceId } = authStore.state;
  if (!deviceId) return;
  try {
    await fetchWithAuth(`${serverUrl}/api/device-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        level: entry.type,
        title: entry.title,
        description: entry.description,
        occurredAt: new Date(entry.timestamp).toISOString(),
      }),
    });
  } catch (error: unknown) {
    // Never toast here — that would create another error notification and loop.
    logger.warn("[device-events] push failed", error);
  }
}

function maybeAutoUploadLog(): void {
  const now = Date.now();
  if (now - autoUpload.lastAt < AUTO_UPLOAD_THROTTLE_MS) return;
  autoUpload.lastAt = now;
  void uploadCurrentLog().catch((error: unknown) => {
    logger.warn("[device-logs] auto-upload failed", error);
  });
}

/**
 * Watch the notification history and, for each new error, push a device event to
 * the account and (throttled) upload the current log. Existing entries at start
 * are treated as already-reported so history isn't replayed.
 */
export function startDeviceReporting(): () => void {
  for (const entry of notificationsStore.state.entries) reportedIds.add(entry.id);

  const subscription = notificationsStore.subscribe(() => {
    for (const entry of notificationsStore.state.entries) {
      if (reportedIds.has(entry.id)) continue;
      reportedIds.add(entry.id);
      if (entry.type !== "error") continue;
      void pushEvent(entry);
      maybeAutoUploadLog();
    }
  });

  logger.info("[device-reporting] started");
  return () => {
    subscription.unsubscribe();
  };
}
