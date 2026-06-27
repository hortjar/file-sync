export type { User } from "./types/user";
export type { Platform, Device } from "./types/device";
export type { SyncFolder, DeviceFolderLink } from "./types/sync-folder";
export type { FileEntry } from "./types/file-entry";
export type { ConflictResolution, Conflict } from "./types/conflict";
export type { WsMessage, SyncCheckResult } from "./types/protocol";
export {
  DEBOUNCE_MS,
  WS_RECONNECT_MIN_MS,
  WS_RECONNECT_MAX_MS,
  ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS,
  SKIP_PATTERNS,
  SKIP_COMPRESSION_EXTENSIONS,
} from "./constants/sync";
export { DEVICE_NAME_HEADER, DEVICE_VERSION_HEADER, DEFAULT_APP_NAME } from "./constants/headers";
export { sanitizeRelativePath, isSafePath } from "./utils/path";
