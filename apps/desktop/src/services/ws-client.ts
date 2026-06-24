import type { WsMessage } from "@file-sync/shared";
import { WS_RECONNECT_MAX_MS, WS_RECONNECT_MIN_MS } from "@file-sync/shared";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";

import { getApiSyncFoldersQueryKey } from "../generated/@tanstack/react-query.gen";
import { fetchWithAuth } from "../lib/fetch-with-auth";
import { queryClient } from "../lib/query";
import { useAuthStore } from "../stores/auth";
import { useLinksStore } from "../stores/links";
import { useSyncStatusStore } from "../stores/sync-status";

import { downloadFile } from "./downloader";
import { logger } from "./logger";
import { reconcile } from "./reconciler";

type DeviceLink = { syncFolderId: string; localPath: string };

type WsState = {
  socket: WebSocket | undefined;
  reconnectDelay: number;
  reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  isStopped: boolean;
};

const ws: WsState = {
  socket: undefined,
  reconnectDelay: WS_RECONNECT_MIN_MS,
  reconnectTimer: undefined,
  isStopped: false,
};

function buildWsUrl(): string | undefined {
  const { serverUrl, accessToken, deviceId } = useAuthStore.getState();
  if (!accessToken || !deviceId) return undefined;
  const wsBase = serverUrl.replace(/^http/, "ws");
  return `${wsBase}/ws?token=${encodeURIComponent(accessToken)}&deviceId=${encodeURIComponent(deviceId)}`;
}

async function fetchFolderLinks(): Promise<DeviceLink[] | undefined> {
  const { serverUrl, deviceId } = useAuthStore.getState();
  if (!serverUrl || !deviceId) return undefined;

  const response = await fetchWithAuth(`${serverUrl}/api/devices/${deviceId}/links`);

  if (!response.ok) {
    logger.error("Failed to fetch device folder links");
    return undefined;
  }

  return (await response.json()) as DeviceLink[];
}

export async function loadAndRestoreLinks(): Promise<void> {
  const links = await fetchFolderLinks();
  if (links === undefined) return;

  const paths: Record<string, string> = {};
  for (const link of links) {
    paths[link.syncFolderId] = link.localPath;
    await invoke("start_watching", { syncFolderId: link.syncFolderId, localPath: link.localPath });
  }
  useLinksStore.getState().setFolderPaths(paths);

  for (const link of links) {
    try {
      await reconcile(link.syncFolderId, link.localPath);
    } catch (error: unknown) {
      logger.error("Reconcile failed", error);
    }
  }
}

async function onConnect(): Promise<void> {
  ws.reconnectDelay = WS_RECONNECT_MIN_MS;
  useSyncStatusStore.getState().setStatus("idle");
  await loadAndRestoreLinks();
}

async function handleMessage(event: MessageEvent): Promise<void> {
  const raw = typeof event.data === "string" ? event.data : String(event.data);
  let message: WsMessage;
  try {
    message = JSON.parse(raw) as WsMessage;
  } catch {
    return;
  }

  const { serverUrl, accessToken, deviceId } = useAuthStore.getState();
  const { folderPaths } = useLinksStore.getState();

  if (message.type === "file:changed") {
    const { id, syncFolderId, relativePath, contentHash, version, updatedByDeviceId } =
      message.payload;
    if (updatedByDeviceId === deviceId) return;

    const localBase = folderPaths[syncFolderId];
    if (!localBase || !serverUrl || !accessToken) {
      logger.warn(`No local path for sync folder ${syncFolderId} — skipping download`);
      return;
    }

    try {
      await downloadFile(
        id,
        syncFolderId,
        localBase,
        relativePath,
        contentHash,
        version,
        serverUrl,
      );
    } catch (error: unknown) {
      logger.error(`Download failed for ${relativePath}`, error);
    }

    return;
  }

  if (message.type === "file:deleted") {
    const { syncFolderId, relativePath } = message.payload;
    const localBase = folderPaths[syncFolderId];
    if (!localBase) return;

    const localPath = await join(localBase, relativePath);
    try {
      await remove(localPath);
    } catch (error: unknown) {
      logger.error(`Failed to remove ${relativePath}`, error);
    }
    return;
  }

  if (message.type === "folder:created" || message.type === "folder:linked") {
    void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });

    if (message.type === "folder:linked") {
      const localBase = folderPaths[message.payload.syncFolderId];
      if (localBase) {
        try {
          await reconcile(message.payload.syncFolderId, localBase);
        } catch (error: unknown) {
          logger.error("Reconcile after folder:linked failed", error);
        }
      }
    }
  }
}

function scheduleReconnect(): void {
  ws.reconnectTimer = setTimeout(() => {
    ws.reconnectDelay = Math.min(ws.reconnectDelay * 2, WS_RECONNECT_MAX_MS);
    connect();
  }, ws.reconnectDelay);
}

function connect(): void {
  if (ws.isStopped) return;

  const url = buildWsUrl();
  if (!url) return;

  ws.socket = new WebSocket(url);

  ws.socket.addEventListener("open", () => {
    void onConnect().catch((error: unknown) => {
      logger.error("WS onConnect error", error);
    });
  });

  ws.socket.addEventListener("message", (event: MessageEvent) => {
    void handleMessage(event).catch((error: unknown) => {
      logger.error("WS message handler error", error);
    });
  });

  ws.socket.addEventListener("close", () => {
    if (ws.isStopped) return;
    useSyncStatusStore.getState().setStatus("error", "Disconnected — reconnecting…");
    scheduleReconnect();
  });

  ws.socket.addEventListener("error", () => {
    useSyncStatusStore.getState().setStatus("error", "WebSocket error");
  });

  logger.info("WebSocket connecting…");
}

export function startWsClient(): () => void {
  ws.isStopped = false;
  ws.reconnectDelay = WS_RECONNECT_MIN_MS;
  connect();

  return () => {
    ws.isStopped = true;
    clearTimeout(ws.reconnectTimer);
    ws.socket?.close();
    ws.socket = undefined;
  };
}
