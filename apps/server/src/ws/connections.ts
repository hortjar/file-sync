import { logger } from "../lib/logger";

interface WsHandle {
  send: (data: string) => void;
}

// userId -> deviceId -> handle
const connections = new Map<string, Map<string, WsHandle>>();
// wsId -> { userId, deviceId }
const wsIdToMeta = new Map<string, { userId: string; deviceId: string }>();

export function registerConnection(
  wsId: string,
  userId: string,
  deviceId: string,
  handle: WsHandle,
): void {
  const userConnections = connections.get(userId) ?? new Map<string, WsHandle>();
  userConnections.set(deviceId, handle);
  connections.set(userId, userConnections);
  wsIdToMeta.set(wsId, { userId, deviceId });
  logger.debug({ userId, deviceId }, "WebSocket connected");
}

export function removeConnectionByWsId(wsId: string): void {
  const meta = wsIdToMeta.get(wsId);
  if (!meta) return;
  wsIdToMeta.delete(wsId);

  const { userId, deviceId } = meta;
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  userConnections.delete(deviceId);
  if (userConnections.size === 0) connections.delete(userId);
  logger.debug({ userId, deviceId }, "WebSocket disconnected");
}

export function broadcast(userId: string, senderDeviceId: string, message: unknown): void {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const payload = JSON.stringify(message);
  for (const [deviceId, handle] of userConnections) {
    if (deviceId === senderDeviceId) continue;
    handle.send(payload);
  }
}
