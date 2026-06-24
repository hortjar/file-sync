import { useQuery } from "@tanstack/react-query";
import { Activity, FolderSync, Monitor, Server } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "../components/ui/card";
import {
  getApiDevicesOptions,
  getApiSyncFoldersOptions,
  getHealthOptions,
} from "../generated/@tanstack/react-query.gen";

const ONLINE_MS = 2 * 60 * 1000;

function isDeviceOnline(lastSeenAt: string): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

type Device = { id: string; lastSeenAt: string };
type HealthResponse = { status: string; timestamp: string };

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${
            accent ? "gradient-brand" : "bg-[hsl(var(--surface-2))]"
          }`}
        >
          <Icon className={`size-5 ${accent ? "text-white" : "text-[hsl(var(--text-muted))]"}`} />
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--text-faint))]">{label}</p>
          <p className="text-xl font-semibold text-[hsl(var(--text))]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { t } = useTranslation();

  const { data: healthRaw } = useQuery(getHealthOptions());
  const health = healthRaw as HealthResponse | undefined;

  const { data: foldersRaw } = useQuery(getApiSyncFoldersOptions());
  const folders = (foldersRaw as unknown[]) ?? [];

  const { data: devicesRaw } = useQuery(getApiDevicesOptions());
  const devices = (devicesRaw as Device[]) ?? [];
  const onlineCount = devices.filter((d) => isDeviceOnline(d.lastSeenAt)).length;

  const isOnline = health?.status === "ok";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Server}
          label={t("dashboard.serverStatus")}
          value={
            <span className={isOnline ? "text-green-400" : "text-[hsl(var(--danger))]"}>
              {t(isOnline ? "dashboard.online" : "dashboard.offline")}
            </span>
          }
          accent={isOnline}
        />
        <StatCard icon={FolderSync} label={t("dashboard.totalFolders")} value={folders.length} />
        <StatCard icon={Monitor} label={t("dashboard.totalDevices")} value={devices.length} />
        <StatCard
          icon={Activity}
          label={t("dashboard.onlineDevices")}
          value={
            <span className={onlineCount > 0 ? "text-green-400" : "text-[hsl(var(--text-muted))]"}>
              {onlineCount}
            </span>
          }
        />
      </div>

      {health && (
        <p className="mt-6 text-xs text-[hsl(var(--text-faint))]">
          {t("dashboard.serverVersion")} — {new Date(health.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
