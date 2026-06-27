import { authStore } from "../stores/auth";

// Browser-viewable types open in a new tab and render natively; everything else
// is saved to disk. The server sends the correct Content-Type, which the fetched
// Blob inherits, so we classify off the blob's own type.
function isViewable(type: string): boolean {
  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type.startsWith("text/") ||
    type === "application/pdf"
  );
}

async function fetchBlob(path: string): Promise<Blob> {
  const { serverUrl, accessToken } = authStore.state;
  const response = await fetch(`${serverUrl}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.blob();
}

/** Trigger a browser "save as" download for a blob with the given filename. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after a delay so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download a single file by its server file-entry id. Viewable types (images,
 * PDFs, video, audio, text) open in a new tab and render natively; all other
 * types are saved to disk.
 */
export async function downloadFileEntry(fileEntryId: string, filename: string): Promise<void> {
  const blob = await fetchBlob(`/api/sync/download/${encodeURIComponent(fileEntryId)}`);

  if (isViewable(blob.type)) {
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank", "noopener");
    // Popup blocked → fall back to saving so the action still does something.
    if (!opened) saveBlob(blob, filename);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  saveBlob(blob, filename);
}

/**
 * Download a sync folder — or a subfolder, via a relative-path prefix — as a zip
 * archive named after the folder.
 */
export async function downloadFolderZip(
  syncFolderId: string,
  zipName: string,
  pathPrefix?: string,
): Promise<void> {
  const query = pathPrefix ? `?path=${encodeURIComponent(pathPrefix)}` : "";
  const blob = await fetchBlob(`/api/sync/zip/${encodeURIComponent(syncFolderId)}${query}`);
  saveBlob(blob, `${zipName}.zip`);
}
