import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";

type SyncStatusKind = "idle" | "syncing" | "error" | "paused";

type SyncStatusState = {
  status: SyncStatusKind;
  pendingCount: number;
  lastSyncedAt: string | undefined;
  errorMessage: string | undefined;
};

export const syncStatusStore = new Store<SyncStatusState>({
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: undefined,
  errorMessage: undefined,
});

export function setSyncStatus(status: SyncStatusKind, errorMessage?: string): void {
  syncStatusStore.setState((s) => ({ ...s, status, errorMessage }));
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
