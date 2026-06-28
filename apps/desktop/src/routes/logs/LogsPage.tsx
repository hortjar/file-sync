import { type LogEntry, LogViewer } from "@file-sync/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, RefreshCw, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { fetchWithAuth } from "../../lib/fetch-with-auth";
import { cacheLogEntries } from "../../lib/log-entry-cache";
import { loadLatestLogFile, parseLogContent } from "../../lib/log-parse";
import { toast } from "../../lib/toast";
import { uploadCurrentLog } from "../../services/device-log-upload";
import { authStore, useAuthStore } from "../../stores/auth";
import { setLogLevel, useLogLevelStore } from "../../stores/log-level";

type LogLevel = "debug" | "info" | "warn" | "error";

type UploadedLog = {
  id: string;
  filename: string;
  sizeBytes: number;
  lineCount: number;
  startedAt?: string;
  endedAt?: string;
  uploadedAt: string;
};

type UploadedLogDetail = UploadedLog & { content: string };

const LOG_LEVEL_OPTIONS: { value: LogLevel; labelKey: string }[] = [
  { value: "debug", labelKey: "logs.levelDebug" },
  { value: "info", labelKey: "logs.levelInfo" },
  { value: "warn", labelKey: "logs.levelWarn" },
  { value: "error", labelKey: "logs.levelError" },
];

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

async function fetchUploadedLogs(deviceId: string): Promise<UploadedLog[]> {
  const { serverUrl } = authStore.state;
  const response = await fetchWithAuth(`${serverUrl}/api/device-logs?deviceId=${deviceId}`);
  if (!response.ok) throw new Error(`Failed to load uploaded logs: ${response.status}`);
  return (await response.json()) as UploadedLog[];
}

async function fetchUploadedLog(id: string): Promise<UploadedLogDetail> {
  const { serverUrl } = authStore.state;
  const response = await fetchWithAuth(`${serverUrl}/api/device-logs/${id}`);
  if (!response.ok) throw new Error(`Failed to load log: ${response.status}`);
  return (await response.json()) as UploadedLogDetail;
}

function formatRange(log: UploadedLog): string {
  if (!log.startedAt) return new Date(log.uploadedAt).toLocaleString();
  const start = new Date(log.startedAt).toLocaleString();
  const end = log.endedAt ? new Date(log.endedAt).toLocaleTimeString() : "";
  return end ? `${start} – ${end}` : start;
}

function filterByLevel(entries: LogEntry[], viewLevel: LogLevel): LogEntry[] {
  return entries.filter(
    (entry) => LEVEL_RANK[(entry.level as LogLevel) ?? "debug"] >= LEVEL_RANK[viewLevel],
  );
}

function LevelFilter({
  viewLevel,
  onChange,
}: {
  viewLevel: LogLevel;
  onChange: (level: LogLevel) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{t("logs.showLevel")}</p>
      <div className="flex gap-1">
        {LOG_LEVEL_OPTIONS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              viewLevel === value
                ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveTab({
  viewLevel,
  onViewDetail,
}: {
  viewLevel: LogLevel;
  onViewDetail: (entry: LogEntry) => void;
}) {
  const { t } = useTranslation();
  const logLevel = useLogLevelStore((s) => s.logLevel);
  const queryClient = useQueryClient();

  const {
    data: logResult,
    isLoading,
    isFetching,
    isError,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ["desktop-logs"],
    queryFn: loadLatestLogFile,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadCurrentLog,
    onSuccess: (result) => {
      toast.success(t("logs.uploadSuccess", { file: result.filename }));
      void queryClient.invalidateQueries({ queryKey: ["device-logs"] });
    },
    onError: (error: unknown) => {
      toast.error(t("logs.uploadFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });

  const entries = logResult?.entries ?? [];
  const loadError = logResult?.error;
  const fileName = logResult?.name ?? "";
  if (logResult?.entries) cacheLogEntries(logResult.entries);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">
            {t("logs.writeLevel")}
          </p>
          <div className="flex gap-1">
            {LOG_LEVEL_OPTIONS.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setLogLevel(value)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  logLevel === value
                    ? "border-[hsl(var(--brand-from)/.5)] bg-[hsl(var(--brand-from)/.1)] text-[hsl(var(--brand-from))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            loading={uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            <UploadCloud className="size-3.5" />
            {t("logs.uploadCurrent")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            loading={isLoading || isFetching}
            title={t("logs.refresh")}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {fileName && (
        <p className="mb-2 truncate font-mono text-xs text-[hsl(var(--text-faint))]">{fileName}</p>
      )}

      <Card className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
            <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t("logs.loading")}
          </div>
        ) : isError ? (
          <div className="p-5">
            <p className="text-sm font-medium text-[hsl(var(--danger))]">{t("logs.loadFailed")}</p>
            <p className="mt-1 font-mono text-xs text-[hsl(var(--text-faint))]">
              {fetchError instanceof Error ? fetchError.message : String(fetchError)}
            </p>
          </div>
        ) : loadError ? (
          <div className="p-5">
            <p className="text-sm font-medium text-[hsl(var(--danger))]">{t("logs.loadFailed")}</p>
            <p className="mt-1 font-mono text-xs text-[hsl(var(--text-faint))]">{loadError}</p>
          </div>
        ) : (
          <LogViewer
            entries={filterByLevel(entries, viewLevel)}
            className="h-full overflow-y-auto"
            onViewDetail={onViewDetail}
          />
        )}
      </Card>
    </>
  );
}

function UploadedTab({
  viewLevel,
  onViewDetail,
}: {
  viewLevel: LogLevel;
  onViewDetail: (entry: LogEntry) => void;
}) {
  const { t } = useTranslation();
  const deviceId = useAuthStore((s) => s.deviceId);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["device-logs", deviceId],
    queryFn: () => fetchUploadedLogs(deviceId ?? ""),
    enabled: Boolean(deviceId),
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["device-log", selectedId],
    queryFn: () => fetchUploadedLog(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });

  if (selectedId) {
    const entries = detail ? parseLogContent(detail.content) : [];
    if (detail) cacheLogEntries(entries);
    return (
      <>
        <button
          type="button"
          onClick={() => setSelectedId(undefined)}
          className="mb-2 flex cursor-pointer items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
        >
          <ChevronLeft className="size-3.5" />
          {t("logs.backToList")}
        </button>
        <Card className="min-h-0 flex-1 overflow-hidden">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
              <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("logs.loading")}
            </div>
          ) : (
            <LogViewer
              entries={filterByLevel(entries, viewLevel)}
              className="h-full overflow-y-auto"
              onViewDetail={onViewDetail}
            />
          )}
        </Card>
      </>
    );
  }

  return (
    <Card className="min-h-0 flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-muted))]">
          <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t("logs.loading")}
        </div>
      ) : !logs || logs.length === 0 ? (
        <p className="p-6 text-center text-sm text-[hsl(var(--text-muted))]">
          {t("logs.noUploads")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[hsl(var(--border))]">
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => setSelectedId(log.id)}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-[hsl(var(--text))]">{log.filename}</p>
                <p className="mt-0.5 text-[11px] text-[hsl(var(--text-faint))]">
                  {formatRange(log)}
                </p>
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

export function LogsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"live" | "uploaded">("live");
  const [viewLevel, setViewLevel] = useState<LogLevel>("debug");

  function handleViewDetail(entry: LogEntry) {
    void navigate({ to: "/logs/$id", params: { id: entry.id } });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[hsl(var(--text))]">{t("logs.title")}</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-1">
          {(["live", "uploaded"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                tab === value
                  ? "bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                  : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
              }`}
            >
              {t(value === "live" ? "logs.tabLive" : "logs.tabUploaded")}
            </button>
          ))}
        </div>
        <LevelFilter viewLevel={viewLevel} onChange={setViewLevel} />
      </div>

      {tab === "live" ? (
        <LiveTab viewLevel={viewLevel} onViewDetail={handleViewDetail} />
      ) : (
        <UploadedTab viewLevel={viewLevel} onViewDetail={handleViewDetail} />
      )}
    </div>
  );
}
