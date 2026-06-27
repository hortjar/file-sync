import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type SyncStatusKind = "idle" | "syncing" | "error" | "paused";

type SyncStatusState = {
  /**
   * Liveness of the WebSocket connection to the server. Tracked separately from
   * `status` so a *sync* failure (e.g. a forbidden path) never makes the app
   * report itself "disconnected" while the socket is actually healthy.
   */
  connected: boolean;
  /** Sync activity, independent of connection liveness. */
  status: SyncStatusKind;
  pendingCount: number;
  lastSyncedAt: string | undefined;
  errorMessage: string | undefined;
  connectedAt: string | undefined;
  disconnectedAt: string | undefined;
};

export const syncStatusStore = new Store<SyncStatusState>({
  connected: false,
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: undefined,
  errorMessage: undefined,
  connectedAt: undefined,
  disconnectedAt: undefined,
});

/**
 * Update sync *activity* only. Connection liveness is owned by
 * {@link markConnected}/{@link markDisconnected}, so a sync error here leaves
 * the connection indicator untouched.
 */
export function setSyncStatus(status: SyncStatusKind, errorMessage?: string): void {
  syncStatusStore.setState((s) => ({ ...s, status, errorMessage }));
}

/** Mark the WebSocket as freshly connected, stamping the connection time. */
export function markConnected(): void {
  syncStatusStore.setState((s) => ({
    ...s,
    connected: true,
    status: "idle",
    errorMessage: undefined,
    connectedAt: new Date().toISOString(),
    disconnectedAt: undefined,
  }));
}

/**
 * Mark the WebSocket as disconnected. Stamps "disconnected since" once and
 * keeps it stable across reconnect attempts so the popup can show how long
 * we've been offline.
 */
export function markDisconnected(errorMessage?: string): void {
  syncStatusStore.setState((s) => ({
    ...s,
    connected: false,
    errorMessage,
    connectedAt: undefined,
    disconnectedAt: s.disconnectedAt ?? new Date().toISOString(),
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
