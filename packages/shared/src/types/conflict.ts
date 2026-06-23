export type ConflictResolution = "keep_local" | "keep_remote" | "keep_both" | undefined;

export type Conflict = {
  id: string;
  fileEntryId: string;
  syncFolderId: string;
  relativePath: string;
  localHash: string;
  remoteHash: string;
  localMtime: string;
  remoteMtime: string;
  localDeviceName: string;
  remoteDeviceName: string;
  resolution: ConflictResolution;
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | undefined;
};
