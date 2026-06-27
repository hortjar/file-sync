import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type SyncStatusKind = "idle" | "syncing" | "error" | "paused";

type SyncStatusState = {
  status: SyncStatusKind;
  pendingCount: number;
  lastSyncedAt: string | undefined;
  errorMessage: string | undefined;
  connectedAt: string | undefined;
};

export const syncStatusStore = new Store<SyncStatusState>({
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: undefined,
  errorMessage: undefined,
  connectedAt: undefined,
});

export function setSyncStatus(status: SyncStatusKind, errorMessage?: string): void {
  syncStatusStore.setState((s) => ({
    ...s,
    status,
    errorMessage,
    // Losing the connection clears the "connected since" timestamp.
    connectedAt: status === "error" ? undefined : s.connectedAt,
  }));
}

/** Mark the WebSocket as freshly connected, stamping the connection time. */
export function markConnected(): void {
  syncStatusStore.setState((s) => ({
    ...s,
    status: "idle",
    errorMessage: undefined,
    connectedAt: new Date().toISOString(),
  }));
}

export function setPendingCount(pendingCount: number): void {
  syncStatusStore.setState((s) => ({ ...s, pendingCount }));
}

export function markSynced(): void {
  syncStatusStore.setState((s) => ({
    ...s,
    status: "idle",
    lastSyncedAt: new Date().toISOString(),
  }));
}

/** React hook: subscribe to a slice of sync-status state. */
export function useSyncStatusStore<T>(selector: (state: SyncStatusState) => T): T {
  return useStore(syncStatusStore, selector);
}
