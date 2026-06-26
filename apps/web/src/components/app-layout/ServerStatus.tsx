import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getHealthOptions } from "../../generated/@tanstack/react-query.gen";
import { cn } from "../../lib/cn";

type HealthResponse = { status: string };

export function ServerStatus() {
  const { t } = useTranslation();

  const { data: healthRaw, isError: healthError } = useQuery({
    ...getHealthOptions(),
    refetchInterval: 30_000,
    retry: false,
  });
  const isServerOnline = !healthError && (healthRaw as HealthResponse | undefined)?.status === "ok";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isServerOnline ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
        )}
      />
      <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">
        {t(isServerOnline ? "dashboard.online" : "dashboard.offline")}
      </span>
      {isServerOnline ? (
        <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />
      ) : (
        <WifiOff className="size-3 text-[hsl(var(--danger))]" />
      )}
    </div>
  );
}
