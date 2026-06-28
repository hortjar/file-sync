import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import i18n from "i18next";

import { toast } from "../lib/toast";
import type { UpdateChannel } from "../stores/updates";
import {
  setUpdateAvailable,
  setUpdateError,
  setUpdateProgress,
  setUpdateStatus,
  updatePrefsStore,
  updateRuntimeStore,
} from "../stores/updates";

import { logger } from "./logger";

/** GitHub repo that hosts the releases + signed updater manifests. */
const REPO = "hortjar/file-sync";
/** How often to poll GitHub for a newer release while the app stays open. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
/** Small delay after startup so the check never competes with initial sync. */
const INITIAL_DELAY_MS = 30_000;

type UpdateInfo = { version: string; notes: string | null };
type DownloadProgress = { chunkLength: number; contentLength: number | null };
type GhRelease = { tag_name: string; draft: boolean; prerelease: boolean };

/**
 * The manifest URL the last check found an update at. Held so a manual
 * "Download & install" click installs the same release that was surfaced.
 */
const pending = { endpoint: undefined as string | undefined };
const timers = {
  initial: undefined as ReturnType<typeof setTimeout> | undefined,
  interval: undefined as ReturnType<typeof setInterval> | undefined,
};

/**
 * Resolve the `latest.json` manifest URL for a channel by asking the GitHub
 * releases API which tag to track:
 * - `stable` → newest published, non-prerelease release
 * - `beta`   → newest published release of either kind (so beta users also get
 *   stable releases once they're newer than the latest beta)
 *
 * We point at the specific release's manifest (not `releases/latest/...`)
 * because GitHub has no stable URL for the newest *prerelease*.
 */
async function resolveManifestUrl(channel: UpdateChannel): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    // Surface GitHub's own message (e.g. "Not Found") — a 404 here almost
    // always means the repo is private, so anonymous release listing fails.
    let body = "";
    try {
      const text = await response.text();
      body = text.slice(0, 300);
    } catch {
      // No readable body; the status line alone is enough.
    }
    const hint =
      response.status === 404
        ? " (is the repository private? releases must be public for updates to work)"
        : "";
    throw new Error(
      `GitHub releases API ${response.status} ${response.statusText}${hint} — ${url}${body ? ` — ${body}` : ""}`,
    );
  }

  // The API returns releases newest-first; drafts are hidden from anonymous
  // callers, so the first match is the one this channel should track.
  const releases = (await response.json()) as GhRelease[];
  const match = releases.find(
    (release) => !release.draft && (channel === "beta" || !release.prerelease),
  );
  if (!match) return undefined;
  return `https://github.com/${REPO}/releases/download/${match.tag_name}/latest.json`;
}

/**
 * Check GitHub for a newer signed release on the active channel.
 *
 * `silent` (the scheduled background check) swallows failures quietly. A
 * user-initiated check surfaces both the "up to date" and error cases.
 */
export async function checkForUpdates({
  silent = false,
}: { silent?: boolean } = {}): Promise<void> {
  if (updateRuntimeStore.state.status === "checking") return;
  setUpdateStatus("checking");
  const channel = updatePrefsStore.state.channel;
  logger.info(`[updater] checking for updates (channel: ${channel})`);

  let info: UpdateInfo | undefined;
  let endpoint: string | undefined;
  try {
    endpoint = await resolveManifestUrl(channel);
    // The Rust command resolves to `null` (Option::None) when there's no newer
    // release; `?? undefined` keeps the rest of this module null-free.
    info = endpoint
      ? ((await invoke<UpdateInfo | undefined>("check_for_update", { endpoint })) ?? undefined)
      : undefined;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[updater] update check failed", error);
    if (silent) {
      setUpdateStatus("idle");
    } else {
      setUpdateError(message);
      toast.error(i18n.t("updates.checkFailed"), { description: message });
    }
    return;
  }

  if (!info) {
    pending.endpoint = undefined;
    setUpdateStatus("uptodate");
    logger.info("[updater] already on the latest version");
    if (!silent) toast.success(i18n.t("updates.upToDate"));
    return;
  }

  pending.endpoint = endpoint;
  setUpdateAvailable(info.version, info.notes ?? undefined);
  logger.info(`[updater] update available: v${info.version}`);

  if (updatePrefsStore.state.mode === "auto") {
    // Automatic mode: fetch + stage the install now, then ask to restart.
    await downloadAndInstallUpdate();
  } else {
    toast.info(i18n.t("updates.availableToast", { version: info.version }));
  }
}

/** Download the pending update and stage it for install, tracking progress. */
export async function downloadAndInstallUpdate(): Promise<void> {
  const endpoint = pending.endpoint;
  if (!endpoint) {
    logger.warn("[updater] downloadAndInstallUpdate called with no pending update");
    return;
  }

  logger.info("[updater] downloading update");
  let downloaded = 0;
  let total = 0;
  setUpdateProgress(0, 0);

  const unlisten = await listen<DownloadProgress>("updater://progress", (event) => {
    if (total === 0 && event.payload.contentLength) total = event.payload.contentLength;
    downloaded += event.payload.chunkLength;
    setUpdateProgress(downloaded, total);
  });

  try {
    await invoke("install_update", { endpoint });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[updater] download/install failed", error);
    setUpdateError(message);
    toast.error(i18n.t("updates.installFailed"), { description: message });
    return;
  } finally {
    unlisten();
  }

  const version = updateRuntimeStore.state.availableVersion ?? "";
  setUpdateStatus("ready");
  logger.info(`[updater] v${version} installed — pending restart`);
  toast.success(i18n.t("updates.readyToast", { version }));
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
