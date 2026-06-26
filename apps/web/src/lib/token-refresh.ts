import { client } from "../generated/client.gen";
import { postApiAuthRefresh } from "../generated/sdk.gen";
import { authStore, setTokens } from "../stores/auth";

type RefreshResponse = { accessToken: string; refreshToken: string };

// Object mutation avoids a top-level variable reassignment.
const refreshState = { isPending: false };

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
