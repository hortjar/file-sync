import { create } from "zustand";

type FileVersionsState = {
  versions: Record<string, number>; // `${syncFolderId}:${relativePath}` -> last known server version
  setVersion: (syncFolderId: string, relativePath: string, version: number) => void;
  getVersion: (syncFolderId: string, relativePath: string) => number;
};

export const useFileVersionsStore = create<FileVersionsState>()((set, get) => ({
  versions: {},

  setVersion: (syncFolderId, relativePath, version) =>
    set((state) => ({
      versions: { ...state.versions, [`${syncFolderId}:${relativePath}`]: version },
    })),

  getVersion: (syncFolderId, relativePath) =>
    get().versions[`${syncFolderId}:${relativePath}`] ?? 0,
}));
