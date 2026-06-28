import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

import { persistStore } from "../lib/persist-store";

/** How updates are applied once a newer release is found on GitHub. */
export type UpdateMode = "auto" | "manual";

/**
 * Lifecycle of an update check/install:
 * - `idle`      nothing has happened yet this session
 * - `checking`  a check against the GitHub release endpoint is in flight
 * - `uptodate`  the last check found no newer version
 * - `available` a newer version exists but isn't downloaded yet (manual mode)
 * - `downloading` the bundle is being fetched
 * - `ready`     downloaded + installed; a restart applies it
 * - `error`     the last check/install failed
 */
export type UpdateStatus =
  | "idle"
  | "checking"
  | "uptodate"
  | "available"
  | "downloading"
  | "ready"
  | "error";

type UpdatePrefsState = {
  mode: UpdateMode;
};

type UpdateRuntimeState = {
  status: UpdateStatus;
  /** Version string of the available update (without the leading "v"). */
  availableVersion: string | undefined;
  /** Release notes / changelog body, if the release provided one. */
  notes: string | undefined;
  /** Bytes downloaded so far during `downloading`. */
  downloaded: number;
  /** Total bytes to download, when the server reported a content length. */
  contentLength: number;
  error: string | undefined;
};

/** Persisted: the user's auto-vs-manual preference. Defaults to automatic. */
export const updatePrefsStore = persistStore<UpdatePrefsState>("filesync-update-mode", {
  mode: "auto",
});

/** Transient: live status of the current check/download. Not persisted. */
export const updateRuntimeStore = new Store<UpdateRuntimeState>({
  status: "idle",
  availableVersion: undefined,
  notes: undefined,
  downloaded: 0,
  contentLength: 0,
  error: undefined,
});

export function setUpdateMode(mode: UpdateMode): void {
  updatePrefsStore.setState((s) => ({ ...s, mode }));
}

export function setUpdateStatus(status: UpdateStatus): void {
  updateRuntimeStore.setState((s) => ({ ...s, status }));
}

export function setUpdateAvailable(version: string, notes: string | undefined): void {
  updateRuntimeStore.setState((s) => ({
    ...s,
    status: "available",
    availableVersion: version,
    notes,
  }));
}

export function setUpdateProgress(downloaded: number, contentLength: number): void {
  updateRuntimeStore.setState((s) => ({ ...s, status: "downloading", downloaded, contentLength }));
}

export function setUpdateError(error: string): void {
  updateRuntimeStore.setState((s) => ({ ...s, status: "error", error }));
}

/** React hook: subscribe to a slice of the persisted update preference. */
export function useUpdatePrefsStore<T>(selector: (state: UpdatePrefsState) => T): T {
  return useStore(updatePrefsStore, selector);
}

/** React hook: subscribe to a slice of the live update status. */
export function useUpdateRuntimeStore<T>(selector: (state: UpdateRuntimeState) => T): T {
  return useStore(updateRuntimeStore, selector);
}
