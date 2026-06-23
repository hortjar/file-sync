import { setAuthHeader } from "../lib/api-client";
import { useAuthStore } from "../stores/auth";

import { logger } from "./logger";

type JwtPayload = { exp?: number };

function decodeJwtExpiry(token: string): number | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(atob(parts[1] ?? "")) as JwtPayload;
    return payload.exp;
  } catch {
    return undefined;
  }
}

const refreshLock = { current: undefined as Promise<boolean> | undefined };
const timerState = { id: undefined as ReturnType<typeof setTimeout> | undefined };

async function doRefresh(): Promise<boolean> {
  const { refreshToken, serverUrl } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${serverUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logger.warn("Token refresh failed — logging out");
      useAuthStore.getState().logout();
      return false;
    }

    const data = (await response.json()) as { accessToken: string };
    useAuthStore.getState().setTokens(data.accessToken, refreshToken);
    setAuthHeader(data.accessToken);
    scheduleTokenRefresh(data.accessToken);
    logger.debug("Access token refreshed");
    return true;
  } catch (error: unknown) {
    logger.error("Token refresh error", error);
    return false;
  }
}

export async function tryRefreshToken(): Promise<boolean> {
  if (refreshLock.current) return refreshLock.current;

  refreshLock.current = doRefresh();

  try {
    return await refreshLock.current;
  } finally {
    refreshLock.current = undefined;
  }
}

export function scheduleTokenRefresh(accessToken: string): void {
  clearTimeout(timerState.id);
  const exp = decodeJwtExpiry(accessToken);
  if (!exp) return;

  const msUntilExpiry = exp * 1000 - Date.now();
  const refreshIn = Math.max(0, msUntilExpiry - 60_000);

  timerState.id = setTimeout(() => {
    void tryRefreshToken();
  }, refreshIn);

  logger.debug(`Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);
}

export function stopTokenRefresh(): void {
  clearTimeout(timerState.id);
  timerState.id = undefined;
}
