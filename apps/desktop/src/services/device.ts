import { invoke } from "@tauri-apps/api/core";

import { patchApiDevicesByIdHeartbeat, postApiDevices } from "../generated/sdk.gen";
import { useAuthStore } from "../stores/auth";

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
  if (deviceId) return deviceId;

  const platform = detectPlatform();
  let hostname: string;
  try {
    hostname = await invoke<string>("get_hostname");
  } catch {
    hostname = "Unknown Device";
  }

  const { data } = await postApiDevices({
    body: { name: hostname, platform },
    throwOnError: true,
  });

  const device = data as RegisteredDevice;
  setDeviceId(device.id);
  return device.id;
}

export function startHeartbeat(deviceId: string): () => void {
  const sendHeartbeat = () => {
    void patchApiDevicesByIdHeartbeat({
      path: { id: deviceId },
      throwOnError: false,
    });
  };

  sendHeartbeat();
  const intervalId = setInterval(sendHeartbeat, 30_000);
  return () => clearInterval(intervalId);
}
