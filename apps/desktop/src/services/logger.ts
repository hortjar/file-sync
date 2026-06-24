import { appDataDir } from "@tauri-apps/api/path";
import { writeTextFile } from "@tauri-apps/plugin-fs";

import type { LogLevel } from "../stores/log-level";
import { useLogLevelStore } from "../stores/log-level";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Lazy singleton — set synchronously so concurrent callers share the same Promise.
const getLogFilePath = (() => {
  let cached: Promise<string> | undefined;
  return (): Promise<string> => {
    if (!cached) {
      cached = (async () => {
        const directory = await appDataDir();
        return `${directory}/filesync.log`;
      })();
    }
    return cached;
  };
})();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[useLogLevelStore.getState().logLevel];
}

function serialize(data: unknown): string {
  if (data === undefined) return "";
  if (data instanceof Error) return ` ${data.name}: ${data.message}`;
  if (typeof data === "string") return ` ${data}`;
  try {
    return ` ${JSON.stringify(data)}`;
  } catch {
    return " [unserializable]";
  }
}

function writeEntry(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}${serialize(data)}\n`;

  void (async () => {
    try {
      const path = await getLogFilePath();
      await writeTextFile(path, entry, { append: true });
    } catch {
      // silently ignore — don't recurse trying to log the failure
    }
  })();
}

function log(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  writeEntry(level, message, data);

  const logArguments: unknown[] = data === undefined ? [message] : [message, data];
  switch (level) {
    case "debug": {
      console.debug("[FS]", ...logArguments);
      break;
    }
    case "info": {
      console.info("[FS]", ...logArguments);
      break;
    }
    case "warn": {
      console.warn("[FS]", ...logArguments);
      break;
    }
    case "error": {
      console.error("[FS]", ...logArguments);
      break;
    }
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => log("debug", message, data),
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};
