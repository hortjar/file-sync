import { DEFAULT_APP_NAME } from "@file-sync/shared";

/** Product name shown across the public pages; overridable via `VITE_APP_NAME`. */
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? DEFAULT_APP_NAME;

/** Current release version, injected from package.json at build time. */
export const VERSION = import.meta.env.VITE_APP_VERSION;

/** Public source repository. */
export const GITHUB_URL = "https://github.com/hortjar/file-sync";

/** Latest GitHub release — hosts the desktop installers. */
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;

/**
 * Base URL the public pages hit for the live `/health` check. In production the
 * web app is served from the same origin as the API (Caddy), so a relative URL
 * works; in dev we fall back to the local server.
 */
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export type DesktopOs = "mac" | "windows" | "linux";

/** Product name baked into the installer file names (Tauri `productName`). */
const DESKTOP_PRODUCT = "FileSync";

export type DownloadTarget = {
  os: DesktopOs;
  /** Human label, e.g. "macOS". */
  label: string;
  /** Architecture / format hint, e.g. "Apple Silicon · .dmg". */
  detail: string;
  /** Installer asset name on the GitHub release, or undefined when unavailable. */
  asset?: string;
};

const MAC_TARGET: DownloadTarget = {
  os: "mac",
  label: "macOS",
  detail: "Apple Silicon · .dmg",
  asset: `${DESKTOP_PRODUCT}_${VERSION}_aarch64.dmg`,
};

const WINDOWS_TARGET: DownloadTarget = {
  os: "windows",
  label: "Windows",
  detail: "64-bit · .exe installer",
  asset: `${DESKTOP_PRODUCT}_${VERSION}_x64-setup.exe`,
};

const LINUX_TARGET: DownloadTarget = {
  os: "linux",
  label: "Linux",
  detail: "Build from source",
};

/** Every desktop client we publish, in display order. */
export const DOWNLOAD_TARGETS: DownloadTarget[] = [MAC_TARGET, WINDOWS_TARGET, LINUX_TARGET];

/** Direct download URL for a target's installer on the matching GitHub release. */
export function downloadUrl(target: DownloadTarget): string {
  if (!target.asset) return RELEASES_URL;
  return `${GITHUB_URL}/releases/download/v${VERSION}/${target.asset}`;
}

/** Best-effort detection of the visitor's desktop OS from the user agent. */
export function detectOs(): DesktopOs | undefined {
  const agent = globalThis.navigator?.userAgent ?? "";
  if (/mac|iphone|ipad|ipod/i.test(agent)) return "mac";
  if (/win/i.test(agent)) return "windows";
  if (/linux|android|x11/i.test(agent)) return "linux";
  return undefined;
}

/** Resolve the best download target for an OS, falling back to macOS. */
export function targetForOs(os: DesktopOs | undefined): DownloadTarget {
  if (os === "windows") return WINDOWS_TARGET;
  if (os === "linux") return LINUX_TARGET;
  return MAC_TARGET;
}
