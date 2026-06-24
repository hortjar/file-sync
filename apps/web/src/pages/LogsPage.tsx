import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { client } from "../generated/client.gen";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogEntry = { id: string; ts: string; level: LogLevel; msg: string; data?: unknown };
type LevelResponse = { level: LogLevel };

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "text-[hsl(var(--text-faint))]",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-[hsl(var(--danger))]",
};

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

async function fetchLogs(viewLevel: LogLevel): Promise<LogEntry[]> {
  const response = await client.get({ url: "/api/logs", query: { level: viewLevel } });
  return (response.data as LogEntry[]) ?? [];
}

async function fetchServerLevel(): Promise<LevelResponse> {
  const response = await client.get({ url: "/api/logs/level" });
  return response.data as LevelResponse;
}

async function patchServerLevel(level: LogLevel): Promise<LevelResponse> {
  const response = await client.patch({ url: "/api/logs/level", body: { level } });
  return response.data as LevelResponse;
}

const LOGS_QUERY_KEY = (level: LogLevel) => ["logs", level] as const;
const SERVER_LEVEL_QUERY_KEY = ["logs", "level"] as const;

export function LogsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [viewLevel, setViewLevel] = useState<LogLevel>("warn");

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery<LogEntry[]>({
    queryKey: LOGS_QUERY_KEY(viewLevel),
    queryFn: () => fetchLogs(viewLevel),
    refetchInterval: 5000,
  });

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

  return (
    <div>
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
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setViewLevel(level)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  viewLevel === level
                    ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] text-[hsl(var(--text))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                }`}
              >
                {level}
              </button>
            ))}
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

      <Card>
        <CardHeader className="border-b border-[hsl(var(--border))]">
          <CardTitle className="font-mono text-sm">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-[hsl(var(--text-muted))]">
              {t("logs.noLogs")}
            </p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto font-mono text-xs">
              {logs.toReversed().map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-3 border-b border-[hsl(var(--border-subtle))] px-4 py-2 last:border-0 hover:bg-[hsl(var(--surface-2))]"
                >
                  <span className="shrink-0 text-[hsl(var(--text-faint))]">
                    {new Date(entry.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className={`w-12 shrink-0 font-semibold uppercase ${LEVEL_COLOR[entry.level]}`}
                  >
                    {entry.level}
                  </span>
                  <span className="break-all text-[hsl(var(--text))]">
                    {entry.msg}
                    {entry.data !== undefined && (
                      <span className="ml-2 text-[hsl(var(--text-faint))]">
                        {typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
