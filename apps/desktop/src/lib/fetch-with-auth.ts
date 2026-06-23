import { tryRefreshToken } from "../services/token-refresh";
import { useAuthStore } from "../stores/auth";

function authHeaders(): Record<string, string> {
  const { accessToken } = useAuthStore.getState();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...authHeaders() },
  });

  if (response.status !== 401) return response;

  const isRefreshed = await tryRefreshToken();
  if (!isRefreshed) return response;

  return fetch(url, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...authHeaders() },
  });
}
