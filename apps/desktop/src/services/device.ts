import { invoke } from "@tauri-apps/api/core";

import { patchApiDevicesByIdHeartbeat, postApiDevices } from "../generated/sdk.gen";
import { useAuthStore } from "../stores/auth";

import { logger } from "./logger";

type RegisteredDevice = {
  id: string;
  name: string;
  platform: string;
};

function detectPlatform(): "windows" | "macos" | "linux" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

export async function registerDevice(): Promise<string> {
  const { deviceId, setDeviceId } = useAuthStore.getState();
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

  logger.info(`[device] registering new device: name=${hostname} platform=${platform}`);
  const { data } = await postApiDevices({
    body: { name: hostname, platform },
    throwOnError: true,
  });

  const device = data as RegisteredDevice;
  setDeviceId(device.id);
  logger.info(`[device] registered with id=${device.id}`);
  return device.id;
}

export function startHeartbeat(deviceId: string): () => void {
  const sendHeartbeat = () => {
    logger.debug(`[device] heartbeat for ${deviceId}`);
    void patchApiDevicesByIdHeartbeat({
      path: { id: deviceId },
      throwOnError: false,
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
