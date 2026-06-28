import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

import { notificationPrefsStore, setDesktopNotifications } from "../stores/notification-prefs";

import { logger } from "./logger";

/**
 * Show an OS desktop notification for an error or update event.
 *
 * Deliberately a no-op unless ALL hold:
 * - the user enabled desktop notifications,
 * - the OS permission is granted,
 * - the app window is not focused (when it is, the in-app toast is enough).
 *
 * Failures are swallowed — a missing notification must never break a flow.
 */
export async function showDesktopNotification(title: string, body?: string): Promise<void> {
  if (!notificationPrefsStore.state.desktopNotifications) return;
  // `document.hasFocus()` is false when the window is backgrounded, minimised,
  // or hidden to the tray — exactly the cases where an OS notification helps.
  if (document.hasFocus()) return;

  try {
    if (!(await isPermissionGranted())) return;
    sendNotification(body ? { title, body } : { title });
  } catch (error: unknown) {
    logger.warn("[notifications] failed to show desktop notification", error);
  }
}

/**
 * Turn desktop notifications on, requesting the OS permission first. Returns
 * whether they're now active. If permission is denied the preference stays off.
 */
export async function enableDesktopNotifications(): Promise<boolean> {
  let isGranted = await isPermissionGranted();
  if (!isGranted) isGranted = (await requestPermission()) === "granted";
  setDesktopNotifications(isGranted);
  if (!isGranted) logger.warn("[notifications] desktop notification permission denied");
  return isGranted;
}
