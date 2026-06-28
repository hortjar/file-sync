import { queryClient } from "../lib/query";
import { syncStatusStore } from "../stores/sync-status";

import { logger } from "./logger";

/**
 * Refetch active queries whenever the app transitions from offline to online.
 *
 * Lists like sync folders, devices, and conflicts are cached by TanStack Query,
 * so after a disconnect they'd otherwise stay stale until the user navigated
 * away and back. Invalidating on reconnect reloads whatever page is open.
 *
 * Runs for the app's whole lifetime, so the subscription is never torn down.
 */
export function startReconnectRefetch(): void {
  let wasConnected = syncStatusStore.state.connected;
  syncStatusStore.subscribe(() => {
    const isConnected = syncStatusStore.state.connected;
    if (isConnected && !wasConnected) {
      logger.info("[reconnect] connection restored — refetching active queries");
      void queryClient.invalidateQueries();
    }
    wasConnected = isConnected;
  });
}
