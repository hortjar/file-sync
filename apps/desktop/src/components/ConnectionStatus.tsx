import { type StatusDetail, StatusIndicator } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";

import { reconnectNow } from "../services/ws-client";
import { useAuthStore } from "../stores/auth";
import { useSyncStatusStore } from "../stores/sync-status";
import { type UpdateStatus, useUpdateRuntimeStore } from "../stores/updates";

type Health = { status: string; version?: string };

/** Updater states that mean a newer version is available (mirrors HealthCheck). */
const UPDATE_AVAILABLE_STATES = new Set<UpdateStatus>(["available", "downloading", "ready"]);

// Server reachability is the single source of truth for the badge. Stamped from
// the /health poll (mutated only inside the query function, never during render),
// so the sidebar agrees with the Settings health check rather than tracking the
// WebSocket — which can be momentarily down while the server is perfectly reachable.
const reach = {
  since: undefined as number | undefined,
  downSince: undefined as number | undefined,
};

/** Format an elapsed millisecond span as a compact "1h 4m" / "4m 12s" / "9s". */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function ConnectionStatus() {
  const { t } = useTranslation();
  const status = useSyncStatusStore((s) => s.status);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const isSyncing = status === "syncing";

  // Update state comes from the same store the "check for updates" button and the
  // Settings health check use, so the sidebar can never contradict them.
  const updateStatus = useUpdateRuntimeStore((s) => s.status);
  const availableVersion = useUpdateRuntimeStore((s) => s.availableVersion);

  const { data: clientVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: () => getVersion(),
    staleTime: Infinity,
  });

  const { data: health, isError: isHealthError } = useQuery({
    queryKey: ["server-health", serverUrl],
    queryFn: async (): Promise<Health> => {
      try {
        const response = await fetch(`${serverUrl}/health`);
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
        const data = (await response.json()) as Health;
        reach.since ??= Date.now();
        reach.downSince = undefined;
        return data;
      } catch (error: unknown) {
        reach.since = undefined;
        reach.downSince ??= Date.now();
        throw error;
      }
    },
    // Poll at a relaxed cadence and don't pile on extra fetches when the window
    // regains focus — the WebSocket already delivers liveness in real time.
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // "Online" = the server is reachable over HTTP, matching the Settings health
  // check exactly. The WebSocket drives live sync (below) but no longer flips the
  // badge to "disconnected" while the server is plainly reachable.
  const isOnline = !isHealthError && health?.status === "ok";

  // Tick once a second while offline so the "disconnected for" duration stays
  // live without a manual interval/useEffect. `initialData` seeds the clock
  // lazily so we never call an impure function during render.
  const { data: now } = useQuery({
    queryKey: ["status-clock"],
    queryFn: () => Date.now(),
    refetchInterval: 1000,
    enabled: !isOnline && Boolean(reach.downSince),
    initialData: () => Date.now(),
  });

  const details: StatusDetail[] = [];
  if (isOnline && reach.since) {
    details.push({
      label: t("status.connectedSince"),
      value: new Date(reach.since).toLocaleTimeString(),
    });
  }
  if (!isOnline && reach.downSince) {
    details.push(
      {
        label: t("status.disconnectedSince"),
        value: new Date(reach.downSince).toLocaleTimeString(),
      },
      {
        label: t("status.disconnectedFor"),
        value: formatDuration(now - reach.downSince),
      },
    );
  }
  details.push(
    { label: t("status.server"), value: serverUrl },
    { label: t("status.clientVersion"), value: clientVersion ? `v${clientVersion}` : "—" },
    { label: t("status.serverVersion"), value: health?.version ? `v${health.version}` : "—" },
  );

  // Prominent update notice, driven by the updater store (GitHub release check) —
  // the same source as "check for updates", so the two are always consistent.
  const updateNotice = UPDATE_AVAILABLE_STATES.has(updateStatus)
    ? t("status.updateNotice", { version: availableVersion ?? "" })
    : undefined;

  return (
    <StatusIndicator
      online={isOnline}
      syncing={isSyncing}
      rowLabel={t(
        isSyncing && isOnline
          ? "sidebar.syncing"
          : isOnline
            ? "sidebar.connected"
            : "sidebar.disconnected",
      )}
      title={t(isOnline ? "status.online" : "status.offline")}
      details={details}
      notice={updateNotice}
      onReconnect={reconnectNow}
      reconnectLabel={t("status.reconnect")}
    />
  );
}
