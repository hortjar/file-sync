const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (isDevelopment) console.debug(`[FileSync] ${message}`, data ?? "");
  },
  info: (message: string, data?: unknown) => {
    console.info(`[FileSync] ${message}`, data ?? "");
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[FileSync] ${message}`, data ?? "");
  },
  error: (message: string, data?: unknown) => {
    console.error(`[FileSync] ${message}`, data ?? "");
  },
};
