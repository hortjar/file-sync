import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib/cn";
import { reconnectNow } from "../services/ws-client";
import { useAuthStore } from "../stores/auth";
import { useSyncStatusStore } from "../stores/sync-status";

type Health = { status: string; version?: string };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-[hsl(var(--text-faint))]">{label}</dt>
      <dd className="font-mono text-[hsl(var(--text-muted))]">{value}</dd>
    </div>
  );
}

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
  const isOnline = useSyncStatusStore((s) => s.connected);
  const connectedAt = useSyncStatusStore((s) => s.connectedAt);
  const disconnectedAt = useSyncStatusStore((s) => s.disconnectedAt);
  const serverUrl = useAuthStore((s) => s.serverUrl);

  const { data: clientVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: () => getVersion(),
    staleTime: Infinity,
  });

  const { data: health } = useQuery({
    queryKey: ["server-health", serverUrl],
    queryFn: async (): Promise<Health> => {
      const response = await fetch(`${serverUrl}/health`);
      return (await response.json()) as Health;
    },
    refetchInterval: 30_000,
    retry: false,
  });

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

  return (
    <div className="group relative">
      <div className="flex items-center px-3 py-1.5">
        {/* Dot centered in a size-4 box so it lines up with the row icons. */}
        <div className="mr-2.5 flex size-4 shrink-0 items-center justify-center">
          <div
            className={cn(
              "size-1.5 rounded-full",
              isOnline ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
            )}
          />
        </div>
        <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">
          {t(
            status === "syncing" && isOnline
              ? "sidebar.syncing"
              : isOnline
                ? "sidebar.connected"
                : "sidebar.disconnected",
          )}
        </span>
        {!isOnline && <WifiOff className="size-3 text-[hsl(var(--danger))]" />}
        {isOnline && status !== "syncing" && (
          <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />
        )}
      </div>

      {/* Detailed status on hover. pointer-events enabled on hover so the
          Reconnect button inside is actually clickable. */}
      <div className="pointer-events-none absolute bottom-full left-2 z-50 mb-2 w-max max-w-[80vw] whitespace-nowrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 opacity-0 shadow-[var(--shadow-lg)] transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <p
          className={cn(
            "text-base font-semibold",
            isOnline ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]",
          )}
        >
          {t(isOnline ? "status.online" : "status.offline")}
        </p>
        <dl className="mt-2 flex flex-col gap-1.5 text-[11px]">
          {isOnline && connectedAt && (
            <DetailRow
              label={t("status.connectedSince")}
              value={new Date(connectedAt).toLocaleTimeString()}
            />
          )}
          {!isOnline && disconnectedAt && (
            <>
              <DetailRow
                label={t("status.disconnectedSince")}
                value={new Date(disconnectedAt).toLocaleTimeString()}
              />
              <DetailRow
                label={t("status.disconnectedFor")}
                value={formatDuration(now - new Date(disconnectedAt).getTime())}
              />
            </>
          )}
          <DetailRow label={t("status.server")} value={serverUrl} />
          <DetailRow
            label={t("status.clientVersion")}
            value={clientVersion ? `v${clientVersion}` : "—"}
          />
          <DetailRow
            label={t("status.serverVersion")}
            value={health?.version ? `v${health.version}` : "—"}
          />
        </dl>

        {!isOnline && (
          <button
            type="button"
            onClick={() => reconnectNow()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] py-1.5 text-xs font-medium text-[hsl(var(--text-muted))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))]"
          >
            <RefreshCw className="size-3" />
            {t("status.reconnect")}
          </button>
        )}
      </div>
    </div>
  );
}
