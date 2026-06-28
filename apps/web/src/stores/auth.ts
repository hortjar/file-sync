import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

type AuthState = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  userId: string | undefined;
  userEmail: string | undefined;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  accessToken: undefined,
  refreshToken: undefined,
  userId: undefined,
  userEmail: undefined,
  isAuthenticated: false,
};

export const authStore = persistStore("filesync-web-auth", initialState);

export function setTokens(accessToken: string, refreshToken: string): void {
  authStore.setState((s) => ({ ...s, accessToken, refreshToken, isAuthenticated: true }));
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
    isAuthenticated: false,
  }));
}

/** React hook: subscribe to a slice of auth state. */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
