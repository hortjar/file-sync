import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type NotificationType = "success" | "error" | "info" | "warning" | "message";

export type NotificationEntry = {
  id: string;
  type: NotificationType;
  title: string;
  description: string | undefined;
  timestamp: number;
  read: boolean;
};

type NotificationsState = { entries: NotificationEntry[] };

const MAX_ENTRIES = 200;

/** In-memory history of toasts since launch (not persisted). */
export const notificationsStore = new Store<NotificationsState>({ entries: [] });

export function recordNotification(entry: {
  type: NotificationType;
  title: string;
  description: string | undefined;
}): void {
  const next: NotificationEntry = {
    id: crypto.randomUUID(),
    type: entry.type,
    title: entry.title,
    description: entry.description,
    timestamp: Date.now(),
    read: false,
  };
  notificationsStore.setState((s) => ({ entries: [next, ...s.entries].slice(0, MAX_ENTRIES) }));
}

export function markAllNotificationsRead(): void {
  notificationsStore.setState((s) => ({
    entries: s.entries.map((entry) => ({ ...entry, read: true })),
  }));
}

export function clearNotifications(): void {
  notificationsStore.setState(() => ({ entries: [] }));
}

/** React hook: subscribe to a slice of notification state. */
export function useNotifications<T>(selector: (state: NotificationsState) => T): T {
  return useStore(notificationsStore, selector);
}
