export type SyncFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type DeviceFolderLink = {
  syncFolderId: string;
  deviceId: string;
  localPath: string;
};
