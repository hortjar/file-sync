import { DEVICE_NAME_HEADER, DEVICE_VERSION_HEADER } from "@file-sync/shared";
import { useStore } from "@tanstack/react-store";

import { persistStore } from "./persist-store";

type DeviceInfoState = {
  name: string;
  version: string;
};

const initialState: DeviceInfoState = { name: "", version: "" };

// Persisted so identity headers are available on the very first requests after a
// restart, before `loadDeviceInfo` re-resolves the current values.
export const deviceInfoStore = persistStore("filesync-device-info", initialState);

export function setDeviceInfo(name: string, version: string): void {
  deviceInfoStore.setState((s) => ({ ...s, name, version }));
}

/** Identity headers attached to every server request from this device. */
export function deviceHeaders(): Record<string, string> {
  const { name, version } = deviceInfoStore.state;
  const headers: Record<string, string> = {};
  if (name) headers[DEVICE_NAME_HEADER] = name;
  if (version) headers[DEVICE_VERSION_HEADER] = version;
  return headers;
}

/** React hook: subscribe to a slice of device-info state. */
export function useDeviceInfoStore<T>(selector: (state: DeviceInfoState) => T): T {
  return useStore(deviceInfoStore, selector);
}
