export type ThemeColor = "purple" | "blue" | "green" | "rose" | "orange" | "teal" | "slate";
export type ThemeMode = "light" | "dark" | "system";

export type Theme = {
  color: ThemeColor;
  mode: ThemeMode;
};

export const DEFAULT_THEME: Theme = {
  color: "purple",
  mode: "system",
};

export const THEME_LABELS: Record<ThemeColor, string> = {
  purple: "Purple",
  blue: "Blue",
  green: "Green",
  rose: "Rose",
  orange: "Orange",
  teal: "Teal",
  slate: "Slate",
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.dataset["theme"] = theme.color;

  const isDarkMedia = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme.mode === "dark" || (theme.mode === "system" && isDarkMedia);

  root.classList.toggle("dark", isDark);
}
