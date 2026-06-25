import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FolderSync,
  Globe,
  LayoutDashboard,
  LogOut,
  Monitor,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Separator } from "../components/ui/separator";
import { getHealthOptions } from "../generated/@tanstack/react-query.gen";
import { clearAuthHeader } from "../lib/api-client";
import { cn } from "../lib/cn";
import { useAuthStore } from "../stores/auth";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { to: "/folders", icon: FolderSync, label: "nav.folders" },
  { to: "/devices", icon: Monitor, label: "nav.devices" },
  { to: "/logs", icon: FileText, label: "nav.logs" },
] as const;

type HealthResponse = { status: string };

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userEmail, logout } = useAuthStore();

  const { data: healthRaw, isError: healthError } = useQuery({
    ...getHealthOptions(),
    refetchInterval: 30_000,
    retry: false,
  });
  const isServerOnline = !healthError && (healthRaw as HealthResponse | undefined)?.status === "ok";

  function handleLogout() {
    clearAuthHeader();
    logout();
    void navigate("/login");
  }

  function toggleLang() {
    void i18n.changeLanguage(i18n.language === "cs" ? "en" : "cs");
  }

  return (
    <div className="flex h-screen overflow-hidden gradient-bg">
      {/* Sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.04] backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex h-13 items-center gap-3 px-4 py-3.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-xl gradient-brand shadow-md shadow-[hsl(var(--brand-from)/.3)]">
            <FolderSync className="size-3.5 text-white" />
          </div>
          <Link
            to="/dashboard"
            className="text-[13px] font-semibold tracking-tight gradient-brand-text"
          >
            FileSync
          </Link>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-150",
                  isActive
                    ? "bg-white/[0.08] font-medium text-white shadow-[inset_0_1px_0_hsl(0,0%,100%/.06)]"
                    : "text-[hsl(var(--text-muted))] hover:bg-white/[0.06] hover:text-[hsl(var(--text))]",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {t(label)}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex flex-col gap-0.5 p-2 pb-3">
          <Separator className="mb-2 bg-white/[0.06]" />

          {/* Server status */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                isServerOnline ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
              )}
            />
            <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">
              {t(isServerOnline ? "dashboard.online" : "dashboard.offline")}
            </span>
            {isServerOnline ? (
              <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />
            ) : (
              <WifiOff className="size-3 text-[hsl(var(--danger))]" />
            )}
          </div>

          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-white/[0.06] hover:text-[hsl(var(--text))]"
          >
            <Globe className="size-4 shrink-0" />
            {i18n.language === "cs" ? "English" : "Čeština"}
          </button>

          {/* User / sign out */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-[hsl(var(--danger)/.1)] hover:text-[hsl(var(--danger))]"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white shadow-sm">
              {(userEmail?.[0] ?? "?").toUpperCase()}
            </div>
            <span className="flex-1 truncate text-left text-[11px]">{userEmail ?? "Unknown"}</span>
            <LogOut className="size-3.5 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
