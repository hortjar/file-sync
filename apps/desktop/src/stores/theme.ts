import { type Theme, type ThemeColor, DEFAULT_THEME, applyTheme } from "@file-sync/ui";
import { useStore } from "@tanstack/react-store";

import { persistStore } from "../lib/persist-store";

const BRAND_GRADIENTS: Record<ThemeColor, [string, string]> = {
  purple: ["262 83% 58%", "291 91% 52%"],
  blue: ["213 89% 52%", "221 83% 65%"],
  green: ["142 71% 45%", "152 72% 38%"],
  rose: ["346 77% 55%", "355 82% 60%"],
  orange: ["25 95% 53%", "33 92% 48%"],
  teal: ["174 72% 40%", "182 68% 34%"],
  slate: ["215 25% 45%", "220 28% 52%"],
};

function hexToHslPair(hex: string): [string, string] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = d / (l > 0.5 ? 2 - max - min : max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  const from = `${hDeg} ${sPct}% ${lPct}%`;
  const toDeg = (hDeg + 20) % 360;
  const toLPct = Math.max(lPct - 12, 20);
  const toSPct = Math.min(sPct + 5, 100);
  const to = `${toDeg} ${toSPct}% ${toLPct}%`;
  return [from, to];
}

export function applyBrandGradient(color: ThemeColor, customHex?: string): void {
  const [from, to] = customHex ? hexToHslPair(customHex) : BRAND_GRADIENTS[color];
  document.documentElement.style.setProperty("--brand-from", from);
  document.documentElement.style.setProperty("--brand-to", to);
}

type ThemeState = {
  theme: Theme;
  customColor: string | undefined;
};

const initialState: ThemeState = {
  theme: { ...DEFAULT_THEME, mode: "dark" as const },
  customColor: undefined,
};

export const themeStore = persistStore("filesync-theme", initialState);

export function setTheme(partial: Partial<Theme>): void {
  const theme = { ...themeStore.state.theme, ...partial };
  themeStore.setState((s) => ({ ...s, theme, customColor: undefined }));
  applyTheme(theme);
  applyBrandGradient(theme.color);
}

export function setCustomColor(hex: string): void {
  themeStore.setState((s) => ({ ...s, customColor: hex }));
  applyBrandGradient(themeStore.state.theme.color, hex);
}

export function initTheme(): void {
  const { theme, customColor } = themeStore.state;
  applyTheme(theme);
  applyBrandGradient(theme.color, customColor);

  if (theme.mode === "system") {
    globalThis.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      applyTheme(themeStore.state.theme);
    });
  }
}

/** React hook: subscribe to a slice of theme state. */
export function useThemeStore<T>(selector: (state: ThemeState) => T): T {
  return useStore(themeStore, selector);
}
