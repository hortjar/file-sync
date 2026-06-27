import { Apple, Grid2x2, type LucideProps, Monitor, Terminal } from "lucide-react";

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

/** Recognisable per-OS icon. Falls back to a generic monitor for unknown platforms. */
export function PlatformIcon({ platform, ...properties }: { platform: string } & LucideProps) {
  const Icon = PLATFORM_ICON[platform.toLowerCase()] ?? Monitor;
  return <Icon {...properties} />;
}
