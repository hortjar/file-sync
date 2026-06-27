import { type StatusDetail, StatusIndicator } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

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

  const details: StatusDetail[] = [];
  if (isServerOnline && connection.since) {
    details.push({
      label: t("status.connectedSince"),
      value: new Date(connection.since).toLocaleTimeString(),
    });
  }
  details.push(
    { label: t("status.server"), value: serverUrl },
    { label: t("status.clientVersion"), value: clientVersion ? `v${clientVersion}` : "—" },
    { label: t("status.serverVersion"), value: health?.version ? `v${health.version}` : "—" },
  );

  return (
    <StatusIndicator
      online={isServerOnline}
      rowLabel={t(isServerOnline ? "dashboard.online" : "dashboard.offline")}
      title={t(isServerOnline ? "status.online" : "status.offline")}
      details={details}
    />
  );
}
