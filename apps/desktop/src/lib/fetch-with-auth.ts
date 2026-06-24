import { logger } from "../services/logger";
import { tryRefreshToken } from "../services/token-refresh";
import { useAuthStore } from "../stores/auth";

function authHeaders(): Record<string, string> {
  const { accessToken } = useAuthStore.getState();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function redactedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("token")) parsed.searchParams.set("token", "[redacted]");
    return parsed.href;
  } catch {
    return url;
  }
}

async function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...authHeaders() },
  });
}

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const safe = redactedUrl(url);
  const t0 = Date.now();

  logger.debug(`[http] → ${method} ${safe}`);

  const response = await fetchOnce(url, init);
  const elapsed = Date.now() - t0;

  if (response.ok) {
    logger.debug(`[http] ← ${method} ${safe} ${response.status} (${elapsed}ms)`);
    return response;
  }

  if (response.status !== 401) {
    logger.warn(`[http] ← ${method} ${safe} ${response.status} (${elapsed}ms)`);
    return response;
  }

  logger.debug(`[http] 401 on ${safe} — attempting token refresh`);
  const isRefreshed = await tryRefreshToken();
  if (!isRefreshed) {
    logger.warn(`[http] token refresh failed — returning 401 for ${safe}`);
    return response;
  }

  const retryT0 = Date.now();
  const retryResponse = await fetchOnce(url, init);
  logger.debug(
    `[http] ← retry ${method} ${safe} ${retryResponse.status} (${Date.now() - retryT0}ms)`,
  );
  return retryResponse;
}
