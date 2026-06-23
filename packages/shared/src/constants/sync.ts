export const DEBOUNCE_MS = 300;
export const WS_RECONNECT_MIN_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30_000;
export const ACCESS_TOKEN_TTL_MINUTES = 15;
export const REFRESH_TOKEN_TTL_DAYS = 7;

export const SKIP_PATTERNS = [
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  "*.tmp",
  "*.part",
  ".git",
  "node_modules",
];

export const SKIP_COMPRESSION_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "mp4",
  "mkv",
  "mov",
  "avi",
  "mp3",
  "aac",
  "flac",
  "ogg",
  "zip",
  "gz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "zst",
]);
