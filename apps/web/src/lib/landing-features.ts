import {
  Activity,
  Bell,
  Boxes,
  Database,
  FolderSync,
  GitMerge,
  LayoutDashboard,
  type LucideIcon,
  MonitorSmartphone,
  Palette,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** HSL hue used to tint the card's icon, border glow, and hover sheen. */
  hue: number;
};

/** Everything shipped so far, one entry per landing card. */
export const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Real-time sync",
    description:
      "Edit a file on one device and it lands on every other in moments — bidirectional, push-based sync over a persistent WebSocket.",
    hue: 265,
  },
  {
    icon: GitMerge,
    title: "Conflict resolution",
    description:
      "Per-file version tracking detects clashes the instant they happen. Keep mine, keep theirs, or keep both — your call, never a silent overwrite.",
    hue: 291,
  },
  {
    icon: Database,
    title: "Content-addressable storage",
    description:
      "Files are stored by SHA-256 hash and gzip-compressed. Identical content across folders and users is kept exactly once, then ref-counted and garbage-collected.",
    hue: 200,
  },
  {
    icon: MonitorSmartphone,
    title: "Native desktop apps",
    description:
      "Lightweight Tauri clients for macOS and Windows — a real native binary with a system-tray presence, not a memory-hungry browser wrapper.",
    hue: 245,
  },
  {
    icon: Server,
    title: "Self-hosted",
    description:
      "Your files never touch anyone else's cloud. One Docker Compose command brings up the whole stack with automatic HTTPS on your own hardware.",
    hue: 150,
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description:
      "JWT auth with short-lived access tokens and rotating refresh tokens. Every user's files are fully isolated — multi-user without crossover.",
    hue: 168,
  },
  {
    icon: Boxes,
    title: "Multi-device linking",
    description:
      "Connect as many machines as you like. Each device registers itself, links to the folders you choose, and shows up live in the dashboard.",
    hue: 25,
  },
  {
    icon: FolderSync,
    title: "Selective folders",
    description:
      "Sync exactly the directories you want — Documents here, a project folder there. Each folder maps independently across your devices.",
    hue: 320,
  },
  {
    icon: Activity,
    title: "Instant file watching",
    description:
      "A native Rust file-system watcher catches every change the moment it touches disk, debounces the noise, and uploads only what actually changed.",
    hue: 45,
  },
  {
    icon: LayoutDashboard,
    title: "Web dashboard",
    description:
      "Monitor folders, devices, storage, and live request metrics from any browser. Manage everything without opening a single desktop client.",
    hue: 280,
  },
  {
    icon: Bell,
    title: "Logs & notifications",
    description:
      "Per-device log upload, error reporting, built-in health checks, and notifications keep you ahead of anything that needs attention.",
    hue: 0,
  },
  {
    icon: Palette,
    title: "Themeable & localized",
    description:
      "Seven accent colors, light and dark modes, and full internationalization — the dashboard adapts to your taste and language.",
    hue: 220,
  },
];
