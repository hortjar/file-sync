export type FileEntry = {
  id: string;
  syncFolderId: string;
  relativePath: string;
  contentHash: string;
  size: number;
  mtime: string;
  version: number;
  updatedByDeviceId: string;
  updatedAt: string;
  deletedAt: string | undefined;
};
