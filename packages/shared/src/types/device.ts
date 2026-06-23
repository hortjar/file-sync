export type Platform = "windows" | "macos" | "linux";

export type Device = {
  id: string;
  userId: string;
  name: string;
  platform: Platform;
  lastSeenAt: string;
  createdAt: string;
};
