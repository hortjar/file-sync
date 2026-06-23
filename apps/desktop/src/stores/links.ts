import { create } from "zustand";

type LinksState = {
  folderPaths: Record<string, string>; // syncFolderId -> localPath
  setFolderPath: (syncFolderId: string, localPath: string) => void;
  removeFolderPath: (syncFolderId: string) => void;
  setFolderPaths: (paths: Record<string, string>) => void;
};

export const useLinksStore = create<LinksState>()((set) => ({
  folderPaths: {},

  setFolderPath: (syncFolderId, localPath) =>
    set((state) => ({ folderPaths: { ...state.folderPaths, [syncFolderId]: localPath } })),

  removeFolderPath: (syncFolderId) =>
    set((state) => ({
      folderPaths: Object.fromEntries(
        Object.entries(state.folderPaths).filter(([key]) => key !== syncFolderId),
      ),
    })),

  setFolderPaths: (paths) => set({ folderPaths: paths }),
}));
