import { client } from "../generated/client.gen";
import { tryRefreshToken } from "../services/token-refresh";
import { useAuthStore } from "../stores/auth";

export function initApiClient(): void {
  // Always inject the current token before each request (picks up refreshed tokens automatically)
  client.interceptors.request.use((request) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  });

  // Reactive 401 fallback: refresh once, then retry without a body re-read
  client.interceptors.response.use(async (response, request) => {
    if (response.status !== 401) return response;
    if (request.url.includes("/api/auth/")) return response;

    const isRefreshed = await tryRefreshToken();
    if (!isRefreshed) return response;

    const { accessToken } = useAuthStore.getState();
    const retryHeaders = new Headers(request.headers);
    retryHeaders.set("Authorization", `Bearer ${accessToken ?? ""}`);
    return fetch(new Request(request.url, { method: request.method, headers: retryHeaders }));
  });
}

export function configureApiClient(serverUrl: string): void {
  client.setConfig({ baseUrl: serverUrl });
}

export function setAuthHeader(accessToken: string): void {
  client.setConfig({ headers: { Authorization: `Bearer ${accessToken}` } });
}

export function clearAuthHeader(): void {
  client.setConfig({ headers: {} });
}
