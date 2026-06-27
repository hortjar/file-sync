import { type LogEntry, LogViewer } from "@file-sync/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { client } from "../generated/client.gen";
import { cacheLogEntries } from "../lib/log-entry-cache";
import { toast } from "../lib/toast";

type LogLevel = "debug" | "info" | "warn" | "error";
type LevelResponse = { level: LogLevel };

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

// Extract [source] tag from message prefix
const SOURCE_RE = /^\[(\w[\w-]*)\]\s*/u;

function enrichEntries(raw: LogEntry[]): LogEntry[] {
  return raw.map((entry) => {
    if (entry.source) return entry;
    const match = SOURCE_RE.exec(entry.msg);
    if (!match) return entry;
    return {
      ...entry,
      source: match[1],
      msg: entry.msg.slice(match[0].length),
    };
  });
}

// Fetch every buffered entry (no server-side level threshold) so the view-level
// toggles can show any arbitrary combination of levels — e.g. debug + warn but
// not info — by filtering client-side.
async function fetchLogs(): Promise<LogEntry[]> {
  const response = await client.get({ url: "/api/logs" });
  const entries = enrichEntries((response.data as LogEntry[]) ?? []);
  cacheLogEntries(entries);
  return entries;
}

async function fetchServerLevel(): Promise<LevelResponse> {
  const response = await client.get({ url: "/api/logs/level" });
  return response.data as LevelResponse;
}

async function patchServerLevel(level: LogLevel): Promise<LevelResponse> {
  const response = await client.patch({ url: "/api/logs/level", body: { level } });
  return response.data as LevelResponse;
}

const LOGS_QUERY_KEY = ["logs", "all"] as const;
const SERVER_LEVEL_QUERY_KEY = ["logs", "level"] as const;

export function LogsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Which levels are shown. Each toggles independently; an empty set shows
  // nothing. Defaults to all levels visible.
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(() => new Set(LEVELS));

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery<LogEntry[]>({
    queryKey: LOGS_QUERY_KEY,
    queryFn: fetchLogs,
    refetchInterval: 5000,
  });

  const visibleLogs = logs.filter((entry) => selectedLevels.has(entry.level as LogLevel));
  const isAllSelected = selectedLevels.size === LEVELS.length;

  function toggleLevel(level: LogLevel): void {
    setSelectedLevels((previous) => {
      const next = new Set(previous);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function toggleAllLevels(): void {
    setSelectedLevels(isAllSelected ? new Set() : new Set(LEVELS));
  }

  const { data: levelData } = useQuery<LevelResponse>({
    queryKey: SERVER_LEVEL_QUERY_KEY,
    queryFn: fetchServerLevel,
  });

  const serverLevel = levelData?.level ?? "warn";

  const levelMutation = useMutation({
    mutationFn: patchServerLevel,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: SERVER_LEVEL_QUERY_KEY });
      toast.success(`${t("logs.serverLevel")}: ${data.level}`);
    },
  });

  function handleViewDetail(entry: LogEntry) {
    void navigate(`/logs/${entry.id}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("logs.title")}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("logs.subtitle")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          title={t("common.refresh")}
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{t("logs.viewLevel")}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={toggleAllLevels}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isAllSelected
                  ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
              }`}
            >
              {t(isAllSelected ? "logs.deselectAll" : "logs.selectAll")}
            </button>
            {LEVELS.map((level) => {
              const isSelected = selectedLevels.has(level);
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleLevel(level)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    isSelected
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">
            {t("logs.serverLevel")}
          </p>
          <div className="flex gap-1">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => levelMutation.mutate(level)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  serverLevel === level
                    ? "border-[hsl(var(--brand-from)/.5)] bg-[hsl(var(--brand-from)/.1)] text-[hsl(var(--brand-from))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <CardHeader className="border-b border-[hsl(var(--border))] py-3">
          <CardTitle className="font-mono text-sm">
            {visibleLogs.length} {visibleLogs.length === 1 ? "entry" : "entries"}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full p-0">
          <LogViewer
            entries={visibleLogs}
            className="h-full overflow-y-auto"
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
