import { type LogEntry, LogViewer, PlatformIcon, parseLogText } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Card } from "../components/ui/card";
import { client } from "../generated/client.gen";
import { cacheLogEntries } from "../lib/log-entry-cache";

type Device = {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
};

type DeviceLog = {
  id: string;
  deviceId: string;
  filename: string;
  sizeBytes: number;
  lineCount: number;
  startedAt?: string;
  endedAt?: string;
  uploadedAt: string;
};

type DeviceLogDetail = DeviceLog & { content: string };

type DeviceEvent = {
  id: string;
  deviceId: string;
  level: string;
  title: string;
  description?: string;
  occurredAt: string;
};

type Tab = "logs" | "errors";

const LEVEL_BADGE: Record<string, string> = {
  error: "bg-[hsl(var(--danger)/.12)] text-[hsl(var(--danger))]",
  warning: "bg-amber-500/10 text-amber-400",
  info: "bg-blue-500/10 text-blue-400",
  success: "bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))]",
  message: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]",
};

async function fetchDevices(): Promise<Device[]> {
  const response = await client.get({ url: "/api/devices" });
  return (response.data as Device[]) ?? [];
}

async function fetchDeviceLogs(deviceId: string): Promise<DeviceLog[]> {
  const response = await client.get({ url: "/api/device-logs", query: { deviceId } });
  return (response.data as DeviceLog[]) ?? [];
}

async function fetchAllDeviceLogs(): Promise<DeviceLog[]> {
  const response = await client.get({ url: "/api/device-logs" });
  return (response.data as DeviceLog[]) ?? [];
}

async function fetchDeviceLog(id: string): Promise<DeviceLogDetail> {
  const response = await client.get({ url: `/api/device-logs/${id}` });
  return response.data as DeviceLogDetail;
}

async function fetchDeviceEvents(deviceId: string): Promise<DeviceEvent[]> {
  const response = await client.get({ url: "/api/device-events", query: { deviceId } });
  return (response.data as DeviceEvent[]) ?? [];
}

function formatRange(log: DeviceLog): string {
  if (!log.startedAt) return new Date(log.uploadedAt).toLocaleString();
  const start = new Date(log.startedAt).toLocaleString();
  const end = log.endedAt ? new Date(log.endedAt).toLocaleTimeString() : "";
  return end ? `${start} – ${end}` : start;
}

function DeviceList({
  devices,
  selectedId,
  counts,
  onSelect,
}: {
  devices: Device[];
  selectedId: string | undefined;
  counts: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="flex w-56 shrink-0 flex-col overflow-y-auto p-1.5">
      <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
        {t("nav.devices")}
      </p>
      {devices.length === 0 ? (
        <p className="px-2 py-2 text-xs text-[hsl(var(--text-faint))]">{t("devices.noDevices")}</p>
      ) : (
        devices.map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => onSelect(device.id)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition-colors ${
              selectedId === device.id
                ? "bg-white/[0.08] text-[hsl(var(--text))]"
                : "text-[hsl(var(--text-muted))] hover:bg-white/[0.05]"
            }`}
          >
            <PlatformIcon platform={device.platform} className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{device.name}</span>
            {(counts[device.id] ?? 0) > 0 && (
              <span className="shrink-0 rounded-full bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--text-faint))]">
                {counts[device.id]}
              </span>
            )}
          </button>
        ))
      )}
    </Card>
  );
}

function LogsTab({
  deviceId,
  selectedLogId,
  onSelectLog,
}: {
  deviceId: string;
  selectedLogId: string | undefined;
  onSelectLog: (id: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["device-logs", deviceId],
    queryFn: () => fetchDeviceLogs(deviceId),
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["device-log", selectedLogId],
    queryFn: () => fetchDeviceLog(selectedLogId ?? ""),
    enabled: Boolean(selectedLogId),
  });

  if (selectedLogId) {
    const entries: LogEntry[] = detail ? parseLogText(detail.content) : [];
    if (detail) cacheLogEntries(entries);
    return (
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <button
          type="button"
          onClick={() => onSelectLog(undefined)}
          className="flex cursor-pointer items-center gap-1 border-b border-[hsl(var(--border))] px-4 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
        >
          <ChevronLeft className="size-3.5" />
          {t("logs.backToList")}
        </button>
        {isDetailLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
            {t("logs.loading")}
          </div>
        ) : (
          <LogViewer
            entries={entries}
            className="h-full overflow-y-auto"
            onViewDetail={(entry) => void navigate(`/admin/logs/${entry.id}`)}
          />
        )}
      </Card>
    );
  }

  return (
    <Card className="min-h-0 flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
          {t("logs.loading")}
        </div>
      ) : logs.length === 0 ? (
        <p className="p-6 text-center text-sm text-[hsl(var(--text-muted))]">
          {t("logs.noUploads")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[hsl(var(--border))]">
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => onSelectLog(log.id)}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-[hsl(var(--text-faint))]" />
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-[hsl(var(--text))]">
                    {log.filename}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--text-faint))]">
                    {formatRange(log)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-[hsl(var(--text-faint))]">
                {t("logs.lineCount", { count: log.lineCount })}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ErrorsTab({ deviceId }: { deviceId: string }) {
  const { t } = useTranslation();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["device-events", deviceId],
    queryFn: () => fetchDeviceEvents(deviceId),
  });

  return (
    <Card className="min-h-0 flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
          {t("logs.loading")}
        </div>
      ) : events.length === 0 ? (
        <p className="p-6 text-center text-sm text-[hsl(var(--text-muted))]">
          {t("logs.noEvents")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[hsl(var(--border))]">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--danger))]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${LEVEL_BADGE[event.level] ?? LEVEL_BADGE["message"]}`}
                  >
                    {event.level}
                  </span>
                  <p className="truncate text-sm text-[hsl(var(--text))]">{event.title}</p>
                </div>
                {event.description && (
                  <p className="mt-0.5 whitespace-pre-line text-xs text-[hsl(var(--text-muted))]">
                    {event.description}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-[hsl(var(--text-faint))]">
                  {new Date(event.occurredAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DeviceLogsPage() {
  const { t } = useTranslation();
  const [searchParameters, setSearchParameters] = useSearchParams();

  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: fetchDevices });
  const { data: allLogs = [] } = useQuery({
    queryKey: ["device-logs", "all"],
    queryFn: fetchAllDeviceLogs,
  });

  const logCounts: Record<string, number> = {};
  for (const log of allLogs) logCounts[log.deviceId] = (logCounts[log.deviceId] ?? 0) + 1;

  // Page state lives in the URL so the browser back button restores the exact
  // device, tab and open log when returning from a full-page log detail.
  const activeDeviceId = searchParameters.get("device") ?? devices[0]?.id;
  const tab: Tab = searchParameters.get("tab") === "errors" ? "errors" : "logs";
  const selectedLogId = searchParameters.get("log") ?? undefined;

  function patchParameters(updates: Record<string, string | undefined>): void {
    const next = new URLSearchParams(searchParameters);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    setSearchParameters(next, { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("deviceLogs.title")}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("deviceLogs.subtitle")}</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <DeviceList
          devices={devices}
          selectedId={activeDeviceId}
          counts={logCounts}
          onSelect={(id) => patchParameters({ device: id, log: undefined })}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {activeDeviceId ? (
            <>
              <div className="mb-3 flex gap-1">
                {(["logs", "errors"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchParameters({ tab: value, log: undefined })}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      tab === value
                        ? "bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                        : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                    }`}
                  >
                    {t(value === "logs" ? "deviceLogs.tabLogs" : "deviceLogs.tabErrors")}
                  </button>
                ))}
              </div>
              {tab === "logs" ? (
                <LogsTab
                  deviceId={activeDeviceId}
                  selectedLogId={selectedLogId}
                  onSelectLog={(id) => patchParameters({ log: id })}
                />
              ) : (
                <ErrorsTab deviceId={activeDeviceId} />
              )}
            </>
          ) : (
            <Card className="flex flex-1 items-center justify-center">
              <p className="text-sm text-[hsl(var(--text-muted))]">{t("devices.noDevices")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
