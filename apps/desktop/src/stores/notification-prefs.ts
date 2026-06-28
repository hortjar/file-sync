import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

type NotificationPrefsState = {
  /**
   * Whether to surface OS desktop notifications. Even when on, notifications
   * only fire for errors/updates while the app window is not focused, and only
   * if the OS permission has been granted.
   */
  desktopNotifications: boolean;
};

/** Persisted: off by default — enabling it prompts for the OS permission. */
export const notificationPrefsStore = persistStore<NotificationPrefsState>(
  "filesync-notification-prefs",
  { desktopNotifications: false },
);

export function setDesktopNotifications(isEnabled: boolean): void {
  notificationPrefsStore.setState((s) => ({ ...s, desktopNotifications: isEnabled }));
}

/** React hook: subscribe to a slice of notification preferences. */
export function useNotificationPrefsStore<T>(selector: (state: NotificationPrefsState) => T): T {
  return useStore(notificationPrefsStore, selector);
}
