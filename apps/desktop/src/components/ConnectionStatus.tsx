import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib/cn";
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

export function ConnectionStatus() {
  const { t } = useTranslation();
  const status = useSyncStatusStore((s) => s.status);
  const connectedAt = useSyncStatusStore((s) => s.connectedAt);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const isOnline = status !== "error";

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
            status === "syncing"
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

      {/* Detailed status on hover */}
      <div className="pointer-events-none absolute bottom-full left-2 z-50 mb-2 w-max max-w-[80vw] whitespace-nowrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 opacity-0 shadow-[var(--shadow-lg)] transition-opacity duration-150 group-hover:opacity-100">
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
