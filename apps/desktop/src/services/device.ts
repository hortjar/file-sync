import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

import { fetchWithAuth } from "../lib/fetch-with-auth";
import { authStore, setDeviceId } from "../stores/auth";

import { logger } from "./logger";

type RegisteredDevice = { id: string; name: string; platform: string };

export function detectPlatform(): "windows" | "macos" | "linux" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

async function getAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "unknown";
  }
}

export async function registerDevice(): Promise<string> {
  const { deviceId, serverUrl } = authStore.state;
  if (deviceId) {
    logger.debug(`[device] already registered: ${deviceId}`);
    return deviceId;
  }

  const platform = detectPlatform();
  let hostname: string;
  try {
    hostname = await invoke<string>("get_hostname");
    logger.debug(`[device] hostname from OS: ${hostname}`);
  } catch (error: unknown) {
    logger.warn("[device] failed to get OS hostname", error);
    hostname = "Unknown Device";
  }

  const appVersion = await getAppVersion();
  logger.info(
    `[device] registering new device: name=${hostname} platform=${platform} v${appVersion}`,
  );

  const response = await fetchWithAuth(`${serverUrl}/api/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: hostname, platform, appVersion }),
  });

  if (!response.ok) throw new Error(`Device registration failed: ${response.status}`);

  const device = (await response.json()) as RegisteredDevice;
  setDeviceId(device.id);
  logger.info(`[device] registered with id=${device.id}`);
  return device.id;
}

export function startHeartbeat(deviceId: string): () => void {
  const sendHeartbeat = () => {
    const { serverUrl } = authStore.state;
    logger.debug(`[device] heartbeat for ${deviceId}`);
    void getAppVersion().then((appVersion) => {
      void fetchWithAuth(`${serverUrl}/api/devices/${deviceId}/heartbeat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appVersion }),
      });
    });
  };

  sendHeartbeat();
  const intervalId = setInterval(sendHeartbeat, 30_000);
  logger.debug(`[device] heartbeat started for ${deviceId}`);
  return () => {
    clearInterval(intervalId);
    logger.debug(`[device] heartbeat stopped for ${deviceId}`);
  };
}
