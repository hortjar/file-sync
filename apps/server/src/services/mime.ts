// Maps file extensions to MIME types so downloads carry correct application
// metadata. Browser-viewable types (images, PDF, video, audio, text) are served
// inline so they render natively in a browser tab; everything else downloads.

const MIME_BY_EXTENSION: Record<string, string> = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  heic: "image/heic",
  // Documents
  pdf: "application/pdf",
  // Video
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  ogv: "video/ogg",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  // Text / web (rendered as text inline)
  txt: "text/plain",
  log: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  // Archives (always downloaded)
  zip: "application/zip",
};

/** Best-effort MIME type from a filename; unknown extensions are binary. */
export function mimeType(filename: string): string {
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/**
 * Whether a MIME type is something browsers render natively, so it should be
 * served inline rather than as a download. SVG is intentionally excluded — it
 * can carry script and is safer to download.
 */
export function isInlineViewable(mime: string): boolean {
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("text/") ||
    mime === "application/pdf"
  );
}
