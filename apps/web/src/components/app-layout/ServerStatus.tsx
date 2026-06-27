import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/cn";
import { authStore, useAuthStore } from "../../stores/auth";

type HealthResponse = { status: string; version?: string };

// Captured when the server first becomes reachable this session (cleared when it
// goes offline). Held in an object so it isn't a reassigned top-level binding,
// and only mutated inside the query function (never during render).
const connection = { since: undefined as number | undefined };

async function fetchHealth(): Promise<HealthResponse> {
  const { serverUrl } = authStore.state;
  try {
    const response = await fetch(`${serverUrl}/health`);
    const data = (await response.json()) as HealthResponse;
    if (data.status === "ok") connection.since ??= Date.now();
    return data;
  } catch (error: unknown) {
    connection.since = undefined;
    throw error;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-[hsl(var(--text-faint))]">{label}</dt>
      <dd className="font-mono text-[hsl(var(--text-muted))]">{value}</dd>
    </div>
  );
}

export function ServerStatus() {
  const { t } = useTranslation();
  const serverUrl = useAuthStore((s) => s.serverUrl);

  const { data: health, isError: healthError } = useQuery({
    queryKey: ["server-health", serverUrl],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: false,
  });
  const isServerOnline = !healthError && health?.status === "ok";

  const clientVersion = import.meta.env.VITE_APP_VERSION;

  return (
    <div className="group relative">
      <div className="flex items-center gap-2.5 px-3 py-1.5">
        {/* Dot centered in a size-4 box so it lines up with the nav icons below */}
        <div className="flex size-4 shrink-0 items-center justify-center">
          <div
            className={cn(
              "size-1.5 rounded-full",
              isServerOnline ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
            )}
          />
        </div>
        <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">
          {t(isServerOnline ? "dashboard.online" : "dashboard.offline")}
        </span>
        {isServerOnline ? (
          <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />
        ) : (
          <WifiOff className="size-3 text-[hsl(var(--danger))]" />
        )}
      </div>

      {/* Detailed status on hover */}
      <div className="pointer-events-none absolute bottom-full left-2 z-50 mb-2 w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 opacity-0 shadow-[var(--shadow-lg)] transition-opacity duration-150 group-hover:opacity-100">
        <p
          className={cn(
            "text-base font-semibold",
            isServerOnline ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]",
          )}
        >
          {t(isServerOnline ? "status.online" : "status.offline")}
        </p>
        <dl className="mt-2 flex flex-col gap-1.5 text-[11px]">
          {isServerOnline && connection.since && (
            <DetailRow
              label={t("status.connectedSince")}
              value={new Date(connection.since).toLocaleTimeString()}
            />
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
      </div>
    </div>
  );
}
