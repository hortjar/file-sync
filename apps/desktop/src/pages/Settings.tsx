import { type ThemeColor, THEME_LABELS } from "@file-sync/ui";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import {
  ExternalLink,
  FileText,
  Moon,
  Palette,
  RefreshCw,
  Server,
  Sun,
  SunMoon,
} from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { HealthCheck } from "../components/HealthCheck";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { configureApiClient } from "../lib/api-client";
import { cn } from "../lib/cn";
import { toast } from "../lib/toast";
import { reconnectNow } from "../services/ws-client";
import { setServerUrl, useAuthStore } from "../stores/auth";
import type { LogLevel } from "../stores/log-level";
import { setLogLevel, useLogLevelStore } from "../stores/log-level";
import { setCustomColor, setTheme, useThemeStore } from "../stores/theme";

const LOG_LEVEL_OPTIONS: { value: LogLevel; labelKey: string; descriptionKey: string }[] = [
  { value: "debug", labelKey: "settings.logDebug", descriptionKey: "settings.logDebugDescription" },
  { value: "info", labelKey: "settings.logInfo", descriptionKey: "settings.logInfoDescription" },
  { value: "warn", labelKey: "settings.logWarn", descriptionKey: "settings.logWarnDescription" },
  { value: "error", labelKey: "settings.logError", descriptionKey: "settings.logErrorDescription" },
];

const COLOR_OPTIONS: ThemeColor[] = ["purple", "blue", "green", "rose", "orange", "teal", "slate"];

const COLOR_DOT: Record<ThemeColor, string> = {
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
};

const MODE_OPTIONS = [
  { value: "light" as const, icon: Sun, labelKey: "settings.modeLight" },
  { value: "dark" as const, icon: Moon, labelKey: "settings.modeDark" },
  { value: "system" as const, icon: SunMoon, labelKey: "settings.modeSystem" },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const customColor = useThemeStore((s) => s.customColor);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const colorInputReference = useRef<HTMLInputElement>(null);
  const logLevel = useLogLevelStore((s) => s.logLevel);

  const { data: appVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });

  const serverForm = useForm({
    defaultValues: { serverUrl },
    onSubmit: ({ value }) => {
      const url = value.serverUrl;
      if (!url) return;
      setServerUrl(url);
      configureApiClient(url);
      toast.success(t("settings.serverSaved"));
    },
  });

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-[hsl(var(--text))]">{t("settings.title")}</h1>
          {appVersion && (
            <span className="text-xs text-[hsl(var(--text-faint))]">v{appVersion}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-[hsl(var(--text-muted))]">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Server */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.server")}</CardTitle>
            </div>
            <CardDescription>{t("settings.serverHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void serverForm.handleSubmit();
              }}
              className="flex gap-2"
            >
              <div className="min-w-0 flex-1">
                <serverForm.Field name="serverUrl">
                  {(field) => (
                    <Input
                      name={field.name}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="http://localhost:3001"
                    />
                  )}
                </serverForm.Field>
              </div>
              <Button type="submit" variant="secondary" className="shrink-0">
                {t("settings.save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  reconnectNow();
                  toast.info(t("settings.reconnecting"));
                }}
              >
                <RefreshCw className="size-3.5" />
                {t("settings.reconnect")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Health check */}
        <HealthCheck />

        {/* Accent color */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.accentColor")}</CardTitle>
            </div>
            <CardDescription>{t("settings.accentColorHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Preset swatches, with the custom color picker as the final option. */}
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={THEME_LABELS[color]}
                  onClick={() => setTheme({ color })}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                    theme.color === color && !customColor
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", COLOR_DOT[color])} />
                  {THEME_LABELS[color]}
                </button>
              ))}

              {/* Custom color — a chip that opens the native color picker. */}
              <label
                title={t("settings.customColorHint")}
                className={cn(
                  "relative flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                  customColor
                    ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                )}
              >
                <span
                  className="size-2.5 rounded-full border border-white/[0.2]"
                  style={{ backgroundColor: customColor ?? "#8b5cf6" }}
                />
                {customColor ?? t("settings.customColor")}
                <input
                  ref={colorInputReference}
                  type="color"
                  defaultValue={customColor ?? "#8b5cf6"}
                  onChange={(event) => setCustomColor(event.target.value)}
                  className="absolute inset-0 size-0 cursor-pointer opacity-0"
                />
              </label>

              {customColor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme({ color: theme.color })}
                  className="shrink-0 text-xs text-[hsl(var(--text-faint))]"
                >
                  {t("settings.reset")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SunMoon className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.appearance")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearanceHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme({ mode: value })}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-xs transition-all",
                    theme.mode === value
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                  )}
                >
                  <Icon className="size-5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logging */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.logging")}</CardTitle>
            </div>
            <CardDescription>
              {t("settings.loggingHintPrefix")}{" "}
              <span className="font-mono text-[hsl(var(--text))]">filesync.log</span>{" "}
              {t("settings.loggingHintSuffix")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {LOG_LEVEL_OPTIONS.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLogLevel(value)}
                    className={cn(
                      "cursor-pointer rounded-lg border py-2 text-xs font-medium transition-all",
                      logLevel === value
                        ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                        : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                    )}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[hsl(var(--text-faint))]">
                  {t(
                    LOG_LEVEL_OPTIONS.find((o) => o.value === logLevel)?.descriptionKey ??
                      "settings.logWarnDescription",
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={() => {
                    void invoke("open_log_file");
                    toast.info(t("settings.openingLog"));
                  }}
                >
                  <ExternalLink className="size-3.5" />
                  {t("settings.openLog")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
