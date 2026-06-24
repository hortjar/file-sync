import {
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from "@tauri-apps/plugin-log";

import type { LogLevel } from "../stores/log-level";
import { useLogLevelStore } from "../stores/log-level";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[useLogLevelStore.getState().logLevel];
}

function serialize(data: unknown): string {
  if (data === undefined) return "";
  if (data instanceof Error)
    return ` ${data.name}: ${data.message}${data.stack ? "\n" + data.stack : ""}`;
  if (typeof data === "string") return " " + data;
  try {
    return " " + JSON.stringify(data);
  } catch {
    return " [unserializable]";
  }
}

type TauriLogFunction = (message: string) => Promise<void>;

const TAURI_FN: Record<LogLevel, TauriLogFunction> = {
  debug: tauriDebug,
  info: tauriInfo,
  warn: tauriWarn,
  error: tauriError,
};

function log(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  void TAURI_FN[level](message + serialize(data));
}

// Writes a session-start banner so each app run is visually separated in the file.
export async function initLogger(): Promise<void> {
  const ts = new Date().toISOString();
  const separator = "─".repeat(72);
  await tauriInfo(separator);
  await tauriInfo("FileSync session started  " + ts);
  await tauriInfo(separator);
}

export const logger = {
  debug: (message: string, data?: unknown) => log("debug", message, data),
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};
