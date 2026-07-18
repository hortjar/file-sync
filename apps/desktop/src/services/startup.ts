import { invoke } from "@tauri-apps/api/core";

import { setRunInBackground, startupStore } from "../stores/startup";

import { logger } from "./logger";

/**
 * Push the "run in background / launch at startup" preference to the Rust side,
 * which toggles the OS login-item and whether closing the window quits the app.
 * On failure the persisted preference is rolled back so the UI reflects reality.
 */
export async function applyRunInBackground(isEnabled: boolean): Promise<void> {
  try {
    await invoke("set_run_in_background", { enabled: isEnabled });
    setRunInBackground(isEnabled);
  } catch (error: unknown) {
    logger.warn("[startup] failed to apply run-in-background preference", error);
    setRunInBackground(!isEnabled);
    throw error;
  }
}

/** Sync the persisted preference to the OS on launch (register/unregister autostart). */
export function initRunInBackground(): void {
  void invoke("set_run_in_background", { enabled: startupStore.state.runInBackground }).catch(
    (error: unknown) => {
      logger.warn("[startup] failed to sync run-in-background preference on launch", error);
    },
  );
}
