import { client } from "../generated/client.gen";
import { tryRefreshToken } from "../services/token-refresh";
import { authStore } from "../stores/auth";

export function initApiClient(): void {
  // Always inject the current token before each request (picks up refreshed tokens automatically)
  client.interceptors.request.use((request) => {
    const { accessToken } = authStore.state;
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  });

  // Reactive 401 fallback: refresh once, then retry preserving the original body
  client.interceptors.response.use(async (response, request, options) => {
    if (response.status !== 401) return response;
    if (request.url.includes("/api/auth/")) return response;

    const isRefreshed = await tryRefreshToken();
    if (!isRefreshed) return response;

    const { accessToken } = authStore.state;
    const retryHeaders = new Headers(request.headers);
    retryHeaders.set("Authorization", `Bearer ${accessToken ?? ""}`);
    // `request.body` has already been consumed by the initial fetch; reuse the
    // serialized body from `options` so POST/PATCH retries aren't sent empty.
    return fetch(
      new Request(request.url, {
        method: request.method,
        headers: retryHeaders,
        body: options.body as BodyInit | undefined,
      }),
    );
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
