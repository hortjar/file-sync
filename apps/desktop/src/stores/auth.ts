import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

type AuthState = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  serverUrl: string;
  userId: string | undefined;
  userEmail: string | undefined;
  deviceId: string | undefined;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  accessToken: undefined,
  refreshToken: undefined,
  serverUrl: "http://localhost:3001",
  userId: undefined,
  userEmail: undefined,
  deviceId: undefined,
  isAuthenticated: false,
};

export const authStore = persistStore("filesync-auth", initialState);

/**
 * Normalize a server URL so request building never produces a double slash. Every
 * call site appends `/health`, `/api/...`, or `/ws`, so a trailing slash on the
 * stored value yields `https://host//health`, which the server 404s. Strips
 * surrounding whitespace and any trailing slashes.
 */
export function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/, "");
}

// Heal a previously persisted value that still carries a trailing slash.
if (authStore.state.serverUrl !== normalizeServerUrl(authStore.state.serverUrl)) {
  authStore.setState((s) => ({ ...s, serverUrl: normalizeServerUrl(s.serverUrl) }));
}

export function setTokens(accessToken: string, refreshToken: string): void {
  authStore.setState((s) => ({ ...s, accessToken, refreshToken, isAuthenticated: true }));
}

export function setServerUrl(serverUrl: string): void {
  authStore.setState((s) => ({ ...s, serverUrl: normalizeServerUrl(serverUrl) }));
}

export function setDeviceId(deviceId: string): void {
  authStore.setState((s) => ({ ...s, deviceId }));
}

export function setUserId(userId: string): void {
  authStore.setState((s) => ({ ...s, userId }));
}

export function setUserEmail(userEmail: string): void {
  authStore.setState((s) => ({ ...s, userEmail }));
}

export function logout(): void {
  authStore.setState((s) => ({
    ...s,
    accessToken: undefined,
    refreshToken: undefined,
    userId: undefined,
    userEmail: undefined,
    deviceId: undefined,
    isAuthenticated: false,
  }));
}

/** React hook: subscribe to a slice of auth state. */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
