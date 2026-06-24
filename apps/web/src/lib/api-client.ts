import { client } from "../generated/client.gen";
import { useAuthStore } from "../stores/auth";

export function initApiClient(serverUrl: string): void {
  client.setConfig({ baseUrl: serverUrl });

  client.interceptors.request.use((request) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  });
}

export function setAuthHeader(token: string): void {
  client.setConfig({ headers: { Authorization: `Bearer ${token}` } });
}

export function clearAuthHeader(): void {
  client.setConfig({ headers: {} });
}
