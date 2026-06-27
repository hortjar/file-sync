import { useQuery } from "@tanstack/react-query";

import { cn } from "../../lib/cn";
import { SERVER_URL } from "../../lib/landing";

type HealthResponse = { status: string; version?: string };

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${SERVER_URL}/health`);
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  return (await response.json()) as HealthResponse;
}

/** Live status pill — polls the server `/health` endpoint every 30s. */
export function OnlineStatus() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["public-health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: false,
  });

  const isOnline = !isError && data?.status === "ok";
  const dotColor = isPending
    ? "bg-amber-400"
    : isOnline
      ? "bg-[hsl(var(--success))]"
      : "bg-[hsl(var(--danger))]";
  const label = isPending
    ? "Checking status…"
    : isOnline
      ? "All systems operational"
      : "Server offline";

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-3 pr-4 backdrop-blur-md">
      <span className="relative flex size-2.5 items-center justify-center">
        {isOnline && (
          <span
            className={cn("absolute inline-flex size-2.5 rounded-full", dotColor)}
            style={{ animation: "lp-pulse-ring 1.8s ease-out infinite" }}
          />
        )}
        <span className={cn("relative inline-flex size-2.5 rounded-full", dotColor)} />
      </span>
      <span className="text-sm font-medium text-[hsl(var(--text))]">{label}</span>
      {isOnline && data?.version && (
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-[hsl(var(--text-muted))]">
          v{data.version}
        </span>
      )}
    </div>
  );
}
