import type { WsMessage } from "@file-sync/shared";
import { WS_RECONNECT_MAX_MS, WS_RECONNECT_MIN_MS } from "@file-sync/shared";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";
import i18n from "i18next";

import { getApiSyncFoldersQueryKey } from "../generated/@tanstack/react-query.gen";
import { fetchWithAuth } from "../lib/fetch-with-auth";
import { queryClient } from "../lib/query";
import { authStore, logout } from "../stores/auth";
import { linksStore, setFolderPaths } from "../stores/links";
import { markConnected, setSyncStatus } from "../stores/sync-status";

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
  const { serverUrl, accessToken, deviceId } = authStore.state;
  if (!accessToken || !deviceId) return undefined;
  const wsBase = serverUrl.replace(/^http/, "ws");
  return `${wsBase}/ws?token=${encodeURIComponent(accessToken)}&deviceId=${encodeURIComponent(deviceId)}`;
}

async function fetchFolderLinks(): Promise<DeviceLink[] | undefined> {
  const { serverUrl, deviceId } = authStore.state;
  if (!serverUrl || !deviceId) {
    logger.warn("[ws] fetchFolderLinks: missing serverUrl or deviceId");
    return undefined;
  }

  logger.debug(`[ws] fetching folder links for device ${deviceId}`);
  const response = await fetchWithAuth(`${serverUrl}/api/devices/${deviceId}/links`);

  if (!response.ok) {
    logger.error(`[ws] fetchFolderLinks failed: ${response.status}`);
    return undefined;
  }

  const links = (await response.json()) as DeviceLink[];
  logger.info(`[ws] fetched ${links.length} folder link(s) for device ${deviceId}`);
  return links;
}

export async function loadAndRestoreLinks(): Promise<void> {
  logger.info("[ws] loadAndRestoreLinks: starting");
  const links = await fetchFolderLinks();
  if (links === undefined) {
    logger.warn("[ws] loadAndRestoreLinks: no links returned, aborting");
    return;
  }

  const paths: Record<string, string> = {};
  for (const link of links) {
    paths[link.syncFolderId] = link.localPath;
    logger.debug(`[ws] starting watcher for ${link.syncFolderId} → ${link.localPath}`);
    await invoke("start_watching", { syncFolderId: link.syncFolderId, localPath: link.localPath });
  }
  setFolderPaths(paths);
  logger.info(`[ws] watchers started for ${links.length} folder(s)`);

  for (const link of links) {
    try {
      await reconcile(link.syncFolderId, link.localPath);
    } catch (error: unknown) {
      logger.error(`[ws] reconcile failed for ${link.syncFolderId}`, error);
    }
  }
}

async function onConnect(): Promise<void> {
  ws.reconnectDelay = WS_RECONNECT_MIN_MS;
  markConnected();
  logger.info("[ws] connected — loading and restoring links");
  await loadAndRestoreLinks();
}

async function handleMessage(event: MessageEvent): Promise<void> {
  const raw = typeof event.data === "string" ? event.data : String(event.data);
  let message: WsMessage;
  try {
    message = JSON.parse(raw) as WsMessage;
  } catch {
    logger.warn("[ws] received unparseable message", raw.slice(0, 200));
    return;
  }

  logger.debug(`[ws] message received: ${message.type}`);

  const { serverUrl, accessToken, deviceId } = authStore.state;
  const { folderPaths } = linksStore.state;

  if (message.type === "device:logout") {
    logger.warn(`[ws] device:logout signal received — reason: ${message.payload.reason}`);
    logout();
    return;
  }

  if (message.type === "file:changed") {
    const { id, syncFolderId, relativePath, contentHash, version, updatedByDeviceId } =
      message.payload;

    if (updatedByDeviceId === deviceId) {
      logger.debug(`[ws] file:changed from this device — skipping ${relativePath}`);
      return;
    }

    const localBase = folderPaths[syncFolderId];
    if (!localBase || !serverUrl || !accessToken) {
      logger.warn(
        `[ws] file:changed for ${relativePath} — no local path for ${syncFolderId}, skipping`,
      );
      return;
    }

    logger.info(`[ws] downloading changed file: ${relativePath} (v${version})`);
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
      logger.error(`[ws] download failed for ${relativePath}`, error);
    }

    return;
  }

  if (message.type === "file:deleted") {
    const { syncFolderId, relativePath } = message.payload;
    const localBase = folderPaths[syncFolderId];
    if (!localBase) {
      logger.debug(`[ws] file:deleted — no local path for ${syncFolderId}, skipping`);
      return;
    }

    // Split on both separators so a delete reported by a Windows peer
    // (backslash path) still resolves to the right nested file on this OS.
    const segments = relativePath.split(/[/\\]/u).filter((segment) => segment.length > 0);
    const localPath = await join(localBase, ...segments);
    logger.info(`[ws] deleting local file: ${relativePath}`);
    try {
      await remove(localPath);
      logger.debug(`[ws] deleted: ${localPath}`);
    } catch (error: unknown) {
      logger.error(`[ws] failed to remove ${relativePath}`, error);
    }
    return;
  }

  if (message.type === "folder:created" || message.type === "folder:linked") {
    logger.info(`[ws] ${message.type} — invalidating folder list`);
    void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });

    if (message.type === "folder:linked") {
      const localBase = folderPaths[message.payload.syncFolderId];
      if (localBase) {
        logger.info(`[ws] folder:linked — reconciling ${message.payload.syncFolderId}`);
        try {
          await reconcile(message.payload.syncFolderId, localBase);
        } catch (error: unknown) {
          logger.error("[ws] reconcile after folder:linked failed", error);
        }
      }
    }
  }
}

function scheduleReconnect(): void {
  logger.info(`[ws] reconnecting in ${ws.reconnectDelay}ms`);
  ws.reconnectTimer = setTimeout(() => {
    ws.reconnectDelay = Math.min(ws.reconnectDelay * 2, WS_RECONNECT_MAX_MS);
    connect();
  }, ws.reconnectDelay);
}

function connect(): void {
  if (ws.isStopped) return;

  const url = buildWsUrl();
  if (!url) {
    logger.warn("[ws] connect: no URL (missing token or deviceId)");
    return;
  }

  logger.info("[ws] connecting…");
  ws.socket = new WebSocket(url);

  ws.socket.addEventListener("open", () => {
    void onConnect().catch((error: unknown) => {
      logger.error("[ws] onConnect error", error);
    });
  });

  ws.socket.addEventListener("message", (event: MessageEvent) => {
    void handleMessage(event).catch((error: unknown) => {
      logger.error("[ws] message handler error", error);
    });
  });

  ws.socket.addEventListener("close", (event: CloseEvent) => {
    if (ws.isStopped) return;
    logger.warn(`[ws] disconnected (code=${event.code}) — scheduling reconnect`);
    setSyncStatus("error", i18n.t("sync.disconnectedReconnecting"));
    scheduleReconnect();
  });

  ws.socket.addEventListener("error", () => {
    logger.error("[ws] WebSocket error");
    setSyncStatus("error", i18n.t("sync.websocketError"));
  });
}

export function startWsClient(): () => void {
  ws.isStopped = false;
  ws.reconnectDelay = WS_RECONNECT_MIN_MS;
  logger.info("[ws] starting WebSocket client");
  connect();

  return () => {
    logger.info("[ws] stopping WebSocket client");
    ws.isStopped = true;
    clearTimeout(ws.reconnectTimer);
    ws.socket?.close();
    ws.socket = undefined;
  };
}
