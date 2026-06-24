import { Link } from "@tanstack/react-router";
import { AlertTriangle, FileText, FolderSync, LogOut, Settings, Wifi, WifiOff } from "lucide-react";

import { useConflictCount } from "../hooks/use-conflict-count";
import { cn } from "../lib/cn";
import { useAuthStore } from "../stores/auth";
import { useSyncStatusStore } from "../stores/sync-status";

import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";

const navItems = [
  { to: "/", label: "Sync Folders", icon: FolderSync },
  { to: "/conflicts", label: "Conflicts", icon: AlertTriangle },
  { to: "/logs", label: "Logs", icon: FileText },
] as const;

const navLinkClass = cn(
  "flex items-center rounded-xl px-3 py-2 text-[13px] transition-all duration-150",
  "text-[hsl(var(--text-muted))]",
  "hover:bg-white/[0.06] hover:text-[hsl(var(--text))]",
  "[&.active]:bg-white/[0.08] [&.active]:text-white [&.active]:font-medium",
  "[&.active]:shadow-[inset_0_1px_0_hsl(0,0%,100%/.06)]",
);

export function Sidebar() {
  const userEmail = useAuthStore((s) => s.userEmail);
  const logout = useAuthStore((s) => s.logout);
  const conflictCount = useConflictCount();
  const status = useSyncStatusStore((s) => s.status);
  const isOnline = status !== "error";

  return (
    <aside
      className={cn(
        "flex h-screen w-52 shrink-0 flex-col",
        "border-r border-white/[0.07]",
        "bg-white/[0.04] backdrop-blur-2xl",
      )}
    >
      {/* Logo */}
      <div className="flex h-13 items-center gap-3 px-4 py-3.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xl gradient-brand shadow-md shadow-[hsl(var(--brand-from)/.3)]">
          <FolderSync className="size-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight gradient-brand-text">
          FileSync
        </span>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={navLinkClass}>
            <Icon className="mr-2.5 size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {label === "Conflicts" && conflictCount > 0 && (
              <Badge variant="danger" className="ml-auto text-[10px]">
                {conflictCount}
              </Badge>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom — Connected → Settings → User (sign-out in dropdown) */}
      <div className="flex flex-col gap-0.5 p-2 pb-3">
        <Separator className="mb-2 bg-white/[0.06]" />

        {/* Connected status */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              isOnline ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
            )}
          />
          <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">
            {status === "syncing" ? "Syncing…" : isOnline ? "Connected" : "Disconnected"}
          </span>
          {!isOnline && <WifiOff className="size-3 text-[hsl(var(--danger))]" />}
          {isOnline && status !== "syncing" && (
            <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />
          )}
        </div>

        {/* Settings */}
        <Link to="/settings" className={navLinkClass}>
          <Settings className="mr-2.5 size-4 shrink-0" />
          Settings
        </Link>

        {/* User — click to reveal sign-out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-white/[0.06] hover:text-[hsl(var(--text))]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white shadow-sm">
                {(userEmail?.[0] ?? "?").toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left text-[11px]">
                {userEmail ?? "Unknown"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-[hsl(var(--text))]">
                {userEmail ?? "Unknown"}
              </p>
              <p className="text-[11px] text-[hsl(var(--text-faint))]">Signed in</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
