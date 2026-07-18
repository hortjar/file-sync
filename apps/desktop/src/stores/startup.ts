import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

type StartupState = {
  /**
   * When on, the app launches at device startup and keeps running in the tray
   * after its window is closed so folder syncing continues in the background.
   */
  runInBackground: boolean;
};

/** Persisted: on by default so syncing keeps running like a background service. */
export const startupStore = persistStore<StartupState>("filesync-startup", {
  runInBackground: true,
});

export function setRunInBackground(isEnabled: boolean): void {
  startupStore.setState((s) => ({ ...s, runInBackground: isEnabled }));
}

/** React hook: subscribe to a slice of startup preferences. */
export function useStartupStore<T>(selector: (state: StartupState) => T): T {
  return useStore(startupStore, selector);
}
