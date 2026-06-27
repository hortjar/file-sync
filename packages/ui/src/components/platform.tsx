import { Apple, Grid2x2, type LucideProps, Monitor, Terminal } from "lucide-react";

import { cn } from "../lib/cn";

/** Map a raw platform string (e.g. "macos", "windows") to its display label. */
export function formatPlatform(platform: string): string {
  switch (platform.toLowerCase()) {
    case "macos":
    case "darwin": {
      return "macOS";
    }
    case "windows":
    case "win32": {
      return "Windows";
    }
    case "linux": {
      return "Linux";
    }
    default: {
      return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  }
}

const PLATFORM_ICON: Record<string, (properties: LucideProps) => React.ReactNode> = {
  macos: Apple,
  darwin: Apple,
  windows: Grid2x2,
  win32: Grid2x2,
  linux: Terminal,
};

/** Brand-ish tint per OS so each platform is recognisable at a glance. */
const PLATFORM_TONE: Record<string, string> = {
  macos: "text-rose-300",
  darwin: "text-rose-300",
  windows: "text-sky-400",
  win32: "text-sky-400",
  linux: "text-yellow-400",
};

/** Recognisable, colour-coded per-OS icon. Falls back to a generic monitor. */
export function PlatformIcon({
  platform,
  className,
  ...properties
}: { platform: string } & LucideProps) {
  const key = platform.toLowerCase();
  const Icon = PLATFORM_ICON[key] ?? Monitor;
  const tone = PLATFORM_TONE[key] ?? "text-[hsl(var(--text-muted))]";
  return <Icon className={cn(className, tone)} {...properties} />;
}
