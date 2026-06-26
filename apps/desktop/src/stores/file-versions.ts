import { Store } from "@tanstack/store";

type FileVersionsState = {
  versions: Record<string, number>; // `${syncFolderId}:${relativePath}` -> last known server version
};

export const fileVersionsStore = new Store<FileVersionsState>({ versions: {} });

export function setFileVersion(
  syncFolderId: string,
  relativePath: string,
  version: number,
): void {
  fileVersionsStore.setState((s) => ({
    versions: { ...s.versions, [`${syncFolderId}:${relativePath}`]: version },
  }));
}

export function getFileVersion(syncFolderId: string, relativePath: string): number {
  return fileVersionsStore.state.versions[`${syncFolderId}:${relativePath}`] ?? 0;
}
