import { client } from "../generated/client.gen";
import { postApiAuthRefresh } from "../generated/sdk.gen";
import { authStore, logout, setBootstrapped, setTokens, setUserEmail, setUserId } from "../stores/auth";
import { SERVER_URL } from "./server-url";

type RefreshResponse = { accessToken: string; refreshToken: string };

// Object mutation avoids a top-level variable reassignment.
const refreshState = { isPending: false };

/** The `alg` from a JWT header, or null if it can't be read. */
function decodeTokenAlg(token: string): string | null {
  try {
    const header = token.split(".")[0] ?? "";
    const json = JSON.parse(atob(header.replace(/-/g, "+").replace(/_/g, "/"))) as { alg?: unknown };
    return typeof json.alg === "string" ? json.alg : null;
  } catch {
    return null;
  }
}

/** Ask the server which auth backend it currently uses. */
async function fetchAuthMode(): Promise<"local" | "universal" | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/auth/mode`);
    if (!res.ok) return null;
    const data = (await res.json()) as { mode?: string };
    return data.mode === "universal" ? "universal" : data.mode === "local" ? "local" : null;
  } catch {
    return null;
  }
}

/**
 * Startup session restore + single-sign-on. Runs once before protected routes
 * are allowed to decide (they wait on the `bootstrapped` flag).
 *
 *  1. Evicts a persisted session that can't belong to the server's current
 *     auth backend — e.g. a local-mode HS256 JWT left over after the server was
 *     switched to universal mode (which verifies RS256), and vice versa. This
 *     is what prevents the dashboard↔login infinite redirect loop: without it
 *     the app trusts the stale token, renders the dashboard, gets a 401, and
 *     bounces between routes.
 *  2. When there is no valid session and the server is in universal mode,
 *     adopts a shared cross-subdomain session from the SSO cookie, so a user
 *     already logged in on a sibling app is signed in automatically.
 */
export async function bootstrapSharedSession(): Promise<boolean> {
  try {
    const mode = await fetchAuthMode();

    // 1. Drop an incompatible persisted session.
    const { accessToken, isAuthenticated } = authStore.state;
    if (isAuthenticated && accessToken && mode) {
      const alg = decodeTokenAlg(accessToken);
      const compatible = mode === "universal" ? alg === "RS256" : alg === "HS256";
      if (!compatible) {
        logout();
        client.setConfig({ headers: {} });
      }
    }
    if (authStore.state.isAuthenticated) return true;

    // 2. Adopt a shared SSO session (only meaningful in universal mode).
    if (mode !== "universal") return false;
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
