import { client } from "../generated/client.gen";
import { postApiAuthRefresh } from "../generated/sdk.gen";
import { authStore, setBootstrapped, setTokens, setUserEmail, setUserId } from "../stores/auth";
import { SERVER_URL } from "./server-url";

type RefreshResponse = { accessToken: string; refreshToken: string };

// Object mutation avoids a top-level variable reassignment.
const refreshState = { isPending: false };

/**
 * Startup single-sign-on: when there is no local session, ask the server to
 * mint one from the shared cross-subdomain refresh cookie. In universal mode a
 * user already logged in on a sibling app (e.g. checklist.hortjar.cz) is signed
 * in here automatically. In local mode (or with no cookie) the server returns
 * 401 and this is a harmless no-op. Always marks the store as bootstrapped so
 * the protected routes stop waiting.
 */
export async function bootstrapSharedSession(): Promise<boolean> {
  if (authStore.state.isAuthenticated) {
    setBootstrapped(true);
    return true;
  }
  try {
    const res = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as RefreshResponse & { user?: { id: string; email: string } };
    if (!data?.accessToken || !data?.refreshToken || !data.user) return false;
    setTokens(data.accessToken, data.refreshToken);
    setUserId(data.user.id);
    setUserEmail(data.user.email);
    client.setConfig({ headers: { Authorization: `Bearer ${data.accessToken}` } });
    return true;
  } catch {
    return false;
  } finally {
    setBootstrapped(true);
  }
}

export async function tryRefreshToken(): Promise<boolean> {
  if (refreshState.isPending) return false;
  const { refreshToken } = authStore.state;
  if (!refreshToken) return false;

  refreshState.isPending = true;
  try {
    const { data } = await postApiAuthRefresh({ body: { refreshToken } });
    if (!data) return false;
    const response = data as RefreshResponse;
    setTokens(response.accessToken, response.refreshToken);
    client.setConfig({ headers: { Authorization: `Bearer ${response.accessToken}` } });
    return true;
  } catch {
    return false;
  } finally {
    refreshState.isPending = false;
  }
}
