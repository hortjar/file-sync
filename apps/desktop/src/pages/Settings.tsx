import { type ThemeColor, THEME_LABELS } from "@file-sync/ui";
import { useQuery } from "@tanstack/react-query";
import { FileText, Laptop, Moon, Monitor, Palette, Server, Sun, SunMoon } from "lucide-react";
import { type FormEvent, useRef } from "react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { getApiDevicesOptions } from "../generated/@tanstack/react-query.gen";
import { configureApiClient } from "../lib/api-client";
import { cn } from "../lib/cn";
import { useAuthStore } from "../stores/auth";
import type { LogLevel } from "../stores/log-level";
import { useLogLevelStore } from "../stores/log-level";
import { useThemeStore } from "../stores/theme";

const LOG_LEVEL_OPTIONS: { value: LogLevel; label: string; description: string }[] = [
  {
    value: "debug",
    label: "Debug",
    description: "Everything — all requests, data flow, decisions",
  },
  { value: "info", label: "Info", description: "General events — connections, syncs, downloads" },
  {
    value: "warn",
    label: "Warn",
    description: "Problems only — failures, retries, unexpected states",
  },
  { value: "error", label: "Error", description: "Failures only — exceptions and hard errors" },
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
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: SunMoon, label: "System" },
];

type DeviceRow = { id: string; name: string; platform: string; lastSeenAt: string };

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isDeviceOnline(lastSeenAt: string): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export function SettingsPage() {
  const { theme, customColor, setTheme, setCustomColor } = useThemeStore();
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);
  const deviceId = useAuthStore((s) => s.deviceId);
  const colorInputReference = useRef<HTMLInputElement>(null);
  const { logLevel, setLogLevel } = useLogLevelStore();

  const { data: devicesRaw } = useQuery(getApiDevicesOptions());
  const devices = (devicesRaw as DeviceRow[] | undefined) ?? [];

  function handleSaveServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = (new FormData(event.currentTarget).get("serverUrl") as string | null) ?? "";
    if (!url) return;
    setServerUrl(url);
    configureApiClient(url);
    toast.success("Server URL saved");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[hsl(var(--text))]">Settings</h1>
        <p className="mt-0.5 text-sm text-[hsl(var(--text-muted))]">
          Manage your connection, appearance, and device.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Server */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>Server</CardTitle>
            </div>
            <CardDescription>The FileSync server this app connects to.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveServer} className="flex gap-2">
              <Input
                name="serverUrl"
                type="url"
                defaultValue={serverUrl}
                placeholder="http://localhost:3001"
                className="flex-1"
              />
              <Button type="submit" variant="secondary" className="shrink-0">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Accent color */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>Accent Color</CardTitle>
            </div>
            <CardDescription>Brand color used for buttons, gradients, and icons.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  title={THEME_LABELS[color]}
                  onClick={() => setTheme({ color })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                    theme.color === color && !customColor
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", COLOR_DOT[color])} />
                  {THEME_LABELS[color]}
                </button>
              ))}
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* Custom color picker */}
            <div className="flex items-center gap-3">
              <div
                className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/[0.12]"
                style={{ backgroundColor: customColor ?? "#8b5cf6" }}
                onClick={() => colorInputReference.current?.click()}
              >
                <input
                  ref={colorInputReference}
                  type="color"
                  defaultValue={customColor ?? "#8b5cf6"}
                  onChange={(event) => setCustomColor(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[hsl(var(--text))]">Custom color</p>
                <p className="text-xs text-[hsl(var(--text-faint))]">
                  {customColor
                    ? `${customColor} — overrides preset`
                    : "Click the swatch to pick any color"}
                </p>
              </div>
              {customColor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme({ color: theme.color })}
                  className="shrink-0 text-xs text-[hsl(var(--text-faint))]"
                >
                  Reset
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
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Light, dark, or follow the system setting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme({ mode: value })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs transition-all",
                    theme.mode === value
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
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
              <CardTitle>Logging</CardTitle>
            </div>
            <CardDescription>
              Controls what gets written to{" "}
              <span className="font-mono text-[hsl(var(--text))]">filesync.log</span> in the app
              data directory. Default is Warn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <select
                value={logLevel}
                onChange={(event) => setLogLevel(event.target.value as LogLevel)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 py-2 text-sm text-[hsl(var(--text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-from))]"
              >
                {LOG_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[hsl(var(--text-faint))]">
                {LOG_LEVEL_OPTIONS.find((o) => o.value === logLevel)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* All devices */}
        {devices.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Laptop className="size-4 text-[hsl(var(--text-muted))]" />
                <CardTitle>Devices</CardTitle>
              </div>
              <CardDescription>All devices registered to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-white/[0.05]">
                {devices.map((device) => {
                  const isThis = device.id === deviceId;
                  const lastSeen = new Date(device.lastSeenAt);
                  const isOnline = isDeviceOnline(device.lastSeenAt);
                  return (
                    <div
                      key={device.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Monitor className="size-4 shrink-0 text-[hsl(var(--text-faint))]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[hsl(var(--text))]">
                            {device.name}
                          </span>
                          {isThis && (
                            <span className="rounded-full bg-[hsl(var(--brand-from)/.15)] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--brand-from))]">
                              this device
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--text-faint))] capitalize">
                          {device.platform}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-[hsl(var(--text-faint))]"}`}
                          />
                          <span className="text-xs text-[hsl(var(--text-faint))]">
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        {!isOnline && (
                          <span className="text-[10px] text-[hsl(var(--text-faint))]">
                            {lastSeen.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
