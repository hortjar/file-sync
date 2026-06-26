import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogLevelState = {
  logLevel: LogLevel;
};

export const logLevelStore = persistStore<LogLevelState>("filesync-log-level", {
  logLevel: "warn",
});

export function setLogLevel(level: LogLevel): void {
  logLevelStore.setState((s) => ({ ...s, logLevel: level }));
}

/** React hook: subscribe to a slice of log-level state. */
export function useLogLevelStore<T>(selector: (state: LogLevelState) => T): T {
  return useStore(logLevelStore, selector);
}
