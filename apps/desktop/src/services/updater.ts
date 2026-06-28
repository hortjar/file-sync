import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import i18n from "i18next";

import { toast } from "../lib/toast";
import {
  setUpdateAvailable,
  setUpdateError,
  setUpdateProgress,
  setUpdateStatus,
  updatePrefsStore,
  updateRuntimeStore,
} from "../stores/updates";

import { logger } from "./logger";

/** How often to poll GitHub for a newer release while the app stays open. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
/** Small delay after startup so the check never competes with initial sync. */
const INITIAL_DELAY_MS = 30_000;

/**
 * The update handle returned by the last successful `check()`. Held so a manual
 * "Download & install" click can act on the same release the check surfaced,
 * without re-querying GitHub.
 */
const pending = { update: undefined as Update | undefined };
const timers = {
  initial: undefined as ReturnType<typeof setTimeout> | undefined,
  interval: undefined as ReturnType<typeof setInterval> | undefined,
};

/**
 * Check GitHub for a newer signed release.
 *
 * `silent` (the scheduled background check) swallows failures quietly — a flaky
 * network shouldn't nag the user. A user-initiated check surfaces both the
 * "you're up to date" and the error cases via toast.
 */
export async function checkForUpdates({
  silent = false,
}: { silent?: boolean } = {}): Promise<void> {
  if (updateRuntimeStore.state.status === "checking") return;
  setUpdateStatus("checking");
  logger.info("[updater] checking for updates");

  let update: Update | undefined;
  try {
    update = (await check()) ?? undefined;
  } catch (error: unknown) {
    logger.error("[updater] update check failed", error);
    if (silent) {
      setUpdateStatus("idle");
    } else {
      setUpdateError(error instanceof Error ? error.message : String(error));
      toast.error(i18n.t("updates.checkFailed"));
    }
    return;
  }

  if (!update) {
    pending.update = undefined;
    setUpdateStatus("uptodate");
    logger.info("[updater] already on the latest version");
    if (!silent) toast.success(i18n.t("updates.upToDate"));
    return;
  }

  pending.update = update;
  setUpdateAvailable(update.version, update.body || undefined);
  logger.info(`[updater] update available: v${update.version}`);

  if (updatePrefsStore.state.mode === "auto") {
    // Automatic mode: fetch + stage the install now, then ask to restart.
    await downloadAndInstallUpdate();
  } else {
    toast.info(i18n.t("updates.availableToast", { version: update.version }));
  }
}

/** Download the pending update and stage it for install, tracking progress. */
export async function downloadAndInstallUpdate(): Promise<void> {
  const update = pending.update;
  if (!update) {
    logger.warn("[updater] downloadAndInstallUpdate called with no pending update");
    return;
  }

  logger.info(`[updater] downloading v${update.version}`);
  let downloaded = 0;
  let contentLength = 0;
  setUpdateProgress(0, 0);

  try {
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started": {
          contentLength = event.data.contentLength ?? 0;
          setUpdateProgress(0, contentLength);
          break;
        }
        case "Progress": {
          downloaded += event.data.chunkLength;
          setUpdateProgress(downloaded, contentLength);
          break;
        }
        case "Finished": {
          logger.info("[updater] download finished");
          break;
        }
      }
    });
  } catch (error: unknown) {
    logger.error("[updater] download/install failed", error);
    setUpdateError(error instanceof Error ? error.message : String(error));
    toast.error(i18n.t("updates.installFailed"));
    return;
  }

  setUpdateStatus("ready");
  logger.info(`[updater] v${update.version} installed — pending restart`);
  toast.success(i18n.t("updates.readyToast", { version: update.version }));
}

/** Relaunch the app so a staged update takes effect. */
export async function restartToApply(): Promise<void> {
  logger.info("[updater] relaunching to apply update");
  await relaunch();
}

/**
 * Begin background update checks: one shortly after startup, then on an
 * interval. Returns a stop function, matching the other startup services.
 */
export function startUpdateChecker(): () => void {
  timers.initial = setTimeout(() => {
    void checkForUpdates({ silent: true });
  }, INITIAL_DELAY_MS);

  timers.interval = setInterval(() => {
    void checkForUpdates({ silent: true });
  }, CHECK_INTERVAL_MS);

  return () => {
    clearTimeout(timers.initial);
    clearInterval(timers.interval);
    timers.initial = undefined;
    timers.interval = undefined;
  };
}
