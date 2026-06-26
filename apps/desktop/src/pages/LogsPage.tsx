import { type LogEntry, LogViewer } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { appLogDir, join } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { cacheLogEntries } from "../lib/log-entry-cache";
import { setLogLevel, useLogLevelStore } from "../stores/log-level";

type LogLevel = "debug" | "info" | "warn" | "error";

// Matches: [2026-06-24T15:30:00.123] [INFO ] message text
const LOG_LINE_RE = /^\[([^\]]+)\] \[(\w+)\s*\] (.*)$/u;

// Extract [source] tag from message prefix, e.g. "[http] → GET /..." → source: "http"
const SOURCE_RE = /^\[(\w[\w-]*)\]\s*/u;

function parseLine(line: string): LogEntry | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const match = LOG_LINE_RE.exec(trimmed);
  if (!match) return undefined;

  const [, ts, rawLevel, rest] = match;
  const level = (rawLevel ?? "info").toLowerCase();

  let message = rest ?? "";
  let source: string | undefined;
  let data: unknown;

  // Extract [source] tag from message start
  const sourceMatch = SOURCE_RE.exec(message);
  if (sourceMatch) {
    source = sourceMatch[1];
    message = message.slice(sourceMatch[0].length);
  }

  // Detect trailing JSON object/array appended by the JS logger
  const jsonIndex = message.search(/\s+(\{|\[)/u);
  if (jsonIndex !== -1) {
    try {
      data = JSON.parse(message.slice(jsonIndex).trim());
      message = message.slice(0, jsonIndex).trim();
    } catch {
      // not JSON — leave as-is
    }
  }

  return {
    id: `${ts ?? ""}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
    ts: ts ?? "",
    level,
    source,
    msg: message,
    data,
  };
}

async function loadLatestLogFile(): Promise<{ name: string; entries: LogEntry[]; error?: string }> {
  let logDirectory: string;
  try {
    logDirectory = await appLogDir();
  } catch (pathError: unknown) {
    return {
      name: "",
      entries: [],
      error: `Could not resolve log directory: ${pathError instanceof Error ? pathError.message : String(pathError)}`,
    };
  }

  let files: Awaited<ReturnType<typeof readDir>>;
  try {
    files = await readDir(logDirectory);
  } catch (directoryError: unknown) {
    return {
      name: "",
      entries: [],
      error: `Could not read log directory (${logDirectory}): ${directoryError instanceof Error ? directoryError.message : String(directoryError)}`,
    };
  }

  const logFiles = files
    .filter((file) => typeof file.name === "string" && file.name.endsWith(".log") && file.isFile)
    .toSorted((a, b) => {
      const an = a.name ?? "";
      const bn = b.name ?? "";
      return an < bn ? -1 : an > bn ? 1 : 0;
    });

  // Prefer session files (filesync_YYYY-...) over the legacy plain filesync.log
  const sessionFiles = logFiles.filter((f) => /^filesync_\d{4}-/u.test(f.name ?? ""));
  const latest = (sessionFiles.length > 0 ? sessionFiles : logFiles).at(-1);
  if (!latest?.name)
    return { name: "", entries: [], error: `No .log files found in ${logDirectory}` };

  let content: string;
  try {
    content = await readTextFile(await join(logDirectory, latest.name));
  } catch (readError: unknown) {
    return {
      name: latest.name,
      entries: [],
      error: `Could not read file: ${readError instanceof Error ? readError.message : String(readError)}`,
    };
  }

  const entries = content
    .split("\n")
    .map((line) => parseLine(line))
    .filter((entry): entry is LogEntry => entry !== undefined);

  return { name: latest.name, entries };
}

const LOG_LEVEL_OPTIONS: { value: LogLevel; labelKey: string }[] = [
  { value: "debug", labelKey: "logs.levelDebug" },
  { value: "info", labelKey: "logs.levelInfo" },
  { value: "warn", labelKey: "logs.levelWarn" },
  { value: "error", labelKey: "logs.levelError" },
];

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function LogsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logLevel = useLogLevelStore((s) => s.logLevel);
  const [viewLevel, setViewLevel] = useState<LogLevel>("debug");

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

  const entries = logResult?.entries ?? [];
  const loadError = logResult?.error;
  const fileName = logResult?.name ?? "";

  if (logResult?.entries) {
    cacheLogEntries(logResult.entries);
  }

  function handleViewDetail(entry: LogEntry) {
    void navigate({ to: "/logs/$id", params: { id: entry.id } });
  }

  const filtered = entries.filter(
    (entry) => LEVEL_RANK[(entry.level as LogLevel) ?? "debug"] >= LEVEL_RANK[viewLevel],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text))]">{t("logs.title")}</h1>
          {fileName && (
            <p className="mt-0.5 truncate font-mono text-xs text-[hsl(var(--text-faint))]">
              {fileName}
            </p>
          )}
        </div>
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

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{t("logs.showLevel")}</p>
          <div className="flex gap-1">
            {LOG_LEVEL_OPTIONS.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setViewLevel(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
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

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{t("logs.writeLevel")}</p>
          <div className="flex gap-1">
            {LOG_LEVEL_OPTIONS.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setLogLevel(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
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
      </div>

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
            entries={filtered}
            className="h-full overflow-y-auto"
            onViewDetail={handleViewDetail}
          />
        )}
      </Card>
    </div>
  );
}
