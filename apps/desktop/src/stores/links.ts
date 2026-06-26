import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";

type LinksState = {
  folderPaths: Record<string, string>; // syncFolderId -> localPath
};

export const linksStore = new Store<LinksState>({ folderPaths: {} });

export function setFolderPath(syncFolderId: string, localPath: string): void {
  linksStore.setState((s) => ({
    folderPaths: { ...s.folderPaths, [syncFolderId]: localPath },
  }));
}

export function removeFolderPath(syncFolderId: string): void {
  linksStore.setState((s) => ({
    folderPaths: Object.fromEntries(
      Object.entries(s.folderPaths).filter(([key]) => key !== syncFolderId),
    ),
  }));
}

export function setFolderPaths(paths: Record<string, string>): void {
  linksStore.setState(() => ({ folderPaths: paths }));
}

/** React hook: subscribe to a slice of links state. */
export function useLinksStore<T>(selector: (state: LinksState) => T): T {
  return useStore(linksStore, selector);
}
