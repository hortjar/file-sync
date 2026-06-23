import { create } from "zustand";

type SyncStatusKind = "idle" | "syncing" | "error" | "paused";

type SyncStatus = {
  status: SyncStatusKind;
  pendingCount: number;
  lastSyncedAt: string | undefined;
  errorMessage: string | undefined;
  setStatus: (status: SyncStatusKind, errorMessage?: string) => void;
  setPendingCount: (count: number) => void;
  markSynced: () => void;
};

export const useSyncStatusStore = create<SyncStatus>()((set) => ({
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: undefined,
  errorMessage: undefined,

  setStatus: (status, errorMessage) => set({ status, errorMessage }),

  setPendingCount: (pendingCount) => set({ pendingCount }),

  markSynced: () => set({ status: "idle", lastSyncedAt: new Date().toISOString() }),
}));
