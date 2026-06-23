import type { Conflict } from "./conflict";
import type { FileEntry } from "./file-entry";

export type WsMessage =
  | { type: "file:changed"; payload: FileEntry }
  | {
      type: "file:deleted";
      payload: { syncFolderId: string; relativePath: string };
    }
  | { type: "conflict:created"; payload: Conflict }
  | {
      type: "conflict:resolved";
      payload: { conflictId: string; resolution: string };
    }
  | {
      type: "device:connected";
      payload: { deviceId: string; deviceName: string };
    }
  | { type: "device:disconnected"; payload: { deviceId: string } }
  | { type: "ping" }
  | { type: "pong" };

export type SyncCheckResult = "accept" | "conflict" | "up-to-date";
