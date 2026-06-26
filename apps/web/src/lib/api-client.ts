import { client } from "../generated/client.gen";
import { authStore, logout } from "../stores/auth";

import { tryRefreshToken } from "./token-refresh";

export function initApiClient(serverUrl: string): void {
  client.setConfig({ baseUrl: serverUrl });

  // Clear before re-adding to prevent duplicate interceptors on re-login.
  client.interceptors.request.clear();
  client.interceptors.response.clear();

  client.interceptors.request.use((request) => {
    const { accessToken } = authStore.state;
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  });

  // On 401: attempt token refresh once, then log out if it fails.
  client.interceptors.response.use(async (response) => {
    if (response.status !== 401) return response;
    const wasRefreshed = await tryRefreshToken();
    if (!wasRefreshed) {
      logout();
      clearAuthHeader();
    }
    return response;
  });
}

export function setAuthHeader(token: string): void {
  client.setConfig({ headers: { Authorization: `Bearer ${token}` } });
}

export function clearAuthHeader(): void {
  client.setConfig({ headers: {} });
}
