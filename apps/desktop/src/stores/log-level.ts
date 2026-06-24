import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogLevelState = {
  logLevel: LogLevel;
  setLogLevel: (level: LogLevel) => void;
};

export const useLogLevelStore = create<LogLevelState>()(
  persist(
    (set) => ({
      logLevel: "warn",
      setLogLevel: (level) => set({ logLevel: level }),
    }),
    { name: "filesync-log-level" },
  ),
);
