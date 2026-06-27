import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { AlertTriangle, FileText, FolderSync, Globe, LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useConflictCount } from "../hooks/use-conflict-count";
import { cn } from "../lib/cn";
import { logout, useAuthStore } from "../stores/auth";

import { ConnectionStatus } from "./ConnectionStatus";
import { NotificationBell } from "./NotificationBell";
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
  { to: "/", id: "syncFolders", labelKey: "nav.syncFolders", icon: FolderSync },
  { to: "/conflicts", id: "conflicts", labelKey: "nav.conflicts", icon: AlertTriangle },
  { to: "/logs", id: "logs", labelKey: "nav.logs", icon: FileText },
] as const;

const navLinkClass = cn(
  "flex cursor-pointer items-center rounded-xl px-3 py-2 text-[13px] transition-all duration-150",
  "text-[hsl(var(--text-muted))]",
  "hover:bg-white/[0.06] hover:text-[hsl(var(--text))]",
  "[&.active]:bg-white/[0.08] [&.active]:text-white [&.active]:font-medium",
  "[&.active]:shadow-[inset_0_1px_0_hsl(0,0%,100%/.06)]",
);

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const userEmail = useAuthStore((s) => s.userEmail);
  const conflictCount = useConflictCount();

  const { data: appVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: () => getVersion(),
    staleTime: Infinity,
  });

  function toggleLang() {
    void i18n.changeLanguage(i18n.language === "cs" ? "en" : "cs");
  }

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
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold tracking-tight gradient-brand-text">
              FileSync
            </span>
            {import.meta.env.DEV && (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-400">
                Dev
              </span>
            )}
          </div>
          {appVersion && (
            <span className="text-[10px] leading-tight text-[hsl(var(--text-faint))]">
              v{appVersion}
            </span>
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-2">
        {navItems.map(({ to, id, labelKey, icon: Icon }) => (
          <Link key={to} to={to} className={navLinkClass}>
            <Icon className="mr-2.5 size-4 shrink-0" />
            <span className="flex-1">{t(labelKey)}</span>
            {id === "conflicts" && conflictCount > 0 && (
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

        {/* Connection status (hover for details) */}
        <ConnectionStatus />

        {/* Notifications */}
        <NotificationBell />

        {/* Language toggle */}
        <button type="button" onClick={toggleLang} className={navLinkClass}>
          <Globe className="mr-2.5 size-4 shrink-0" />
          {i18n.language === "cs" ? "English" : "Čeština"}
        </button>

        {/* Settings */}
        <Link to="/settings" className={navLinkClass}>
          <Settings className="mr-2.5 size-4 shrink-0" />
          {t("nav.settings")}
        </Link>

        {/* User — click to reveal sign-out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-white/[0.06] hover:text-[hsl(var(--text))]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white shadow-sm">
                {(userEmail?.[0] ?? "?").toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left text-[11px]">
                {userEmail ?? t("sidebar.unknownUser")}
              </span>
              <LogOut className="size-3.5 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-[hsl(var(--text))]">
                {userEmail ?? t("sidebar.unknownUser")}
              </p>
              <p className="text-[11px] text-[hsl(var(--text-faint))]">{t("sidebar.signedIn")}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <LogOut className="size-3.5" />
              {t("sidebar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
