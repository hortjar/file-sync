import { type StatusDetail, StatusIndicator } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";

import { isOutdated } from "../lib/version";
import { reconnectNow } from "../services/ws-client";
import { useAuthStore } from "../stores/auth";
import { useSyncStatusStore } from "../stores/sync-status";

type Health = { status: string; version?: string; latestClientVersion?: string };

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
  const isConnected = useSyncStatusStore((s) => s.connected);
  const connectedAt = useSyncStatusStore((s) => s.connectedAt);
  const disconnectedAt = useSyncStatusStore((s) => s.disconnectedAt);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const isSyncing = status === "syncing";

  const { data: clientVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: () => getVersion(),
    staleTime: Infinity,
  });

  const { data: health, isError: isHealthError } = useQuery({
    queryKey: ["server-health", serverUrl],
    queryFn: async (): Promise<Health> => {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      return (await response.json()) as Health;
    },
    refetchInterval: 10_000,
    retry: false,
  });

  // The sidebar must reflect *real* server reachability. The WebSocket `close`
  // event can lag for many seconds when the server vanishes abruptly (TCP
  // timeout), so a healthy-looking socket alone isn't enough — gate "online" on
  // the fast-failing /health poll too, matching Settings and the health check.
  const isOnline = isConnected && !isHealthError;

  // Tick once a second while offline so the "disconnected for" duration stays
  // live without a manual interval/useEffect. `initialData` seeds the clock
  // lazily so we never call an impure function during render.
  const { data: now } = useQuery({
    queryKey: ["status-clock"],
    queryFn: () => Date.now(),
    refetchInterval: 1000,
    enabled: !isOnline && Boolean(disconnectedAt),
    initialData: () => Date.now(),
  });

  const details: StatusDetail[] = [];
  if (isOnline && connectedAt) {
    details.push({
      label: t("status.connectedSince"),
      value: new Date(connectedAt).toLocaleTimeString(),
    });
  }
  if (!isOnline && disconnectedAt) {
    details.push(
      {
        label: t("status.disconnectedSince"),
        value: new Date(disconnectedAt).toLocaleTimeString(),
      },
      {
        label: t("status.disconnectedFor"),
        value: formatDuration(now - new Date(disconnectedAt).getTime()),
      },
    );
  }
  details.push(
    { label: t("status.server"), value: serverUrl },
    { label: t("status.clientVersion"), value: clientVersion ? `v${clientVersion}` : "—" },
    { label: t("status.serverVersion"), value: health?.version ? `v${health.version}` : "—" },
  );

  // Prominent update notice when the running client is behind the latest version
  // the server reports.
  const updateNotice = isOutdated(clientVersion, health?.latestClientVersion)
    ? t("status.updateNotice", { version: health?.latestClientVersion ?? "" })
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
