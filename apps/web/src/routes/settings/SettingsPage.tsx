import { type ThemeColor, THEME_LABELS } from "@file-sync/ui";
import { Globe, Palette } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { HealthCheck } from "../../components/HealthCheck";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { cn } from "../../lib/cn";
import { setCustomColor, setTheme, useThemeStore } from "../../stores/theme";

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

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "cs", label: "Čeština" },
] as const;

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const customColor = useThemeStore((s) => s.customColor);
  const colorInputReference = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Accent color */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.accentColor")}</CardTitle>
            </div>
            <CardDescription>{t("settings.accentColorHint")}</CardDescription>
          </CardHeader>
          <CardContent>
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
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-[hsl(var(--text-muted))]" />
              <CardTitle>{t("settings.language")}</CardTitle>
            </div>
            <CardDescription>{t("settings.languageHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => void i18n.changeLanguage(code)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 text-sm transition-all",
                    i18n.language === code
                      ? "border-[hsl(var(--text-muted)/.4)] bg-[hsl(var(--surface-2))] font-medium text-[hsl(var(--text))] shadow-[var(--shadow-xs)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted)/.3)] hover:text-[hsl(var(--text))]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health check */}
        <div className="lg:col-span-2">
          <HealthCheck />
        </div>
      </div>
    </div>
  );
}
