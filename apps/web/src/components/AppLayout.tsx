import { useQuery } from "@tanstack/react-query";
import { FileText, FolderSync, Globe, LayoutDashboard, LogOut, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

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
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-5 border-b border-[hsl(var(--border))]">
          <div className="flex size-7 items-center justify-center rounded-lg gradient-brand">
            <FolderSync className="size-4 text-white" />
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-[hsl(var(--text))]">
            FileSync
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[hsl(var(--brand-from)/.15)] text-[hsl(var(--brand-from))] font-medium"
                    : "text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))]",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {t(label)}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--border))] p-3 space-y-1">
          {/* Server status */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isServerOnline ? "bg-green-500" : "bg-[hsl(var(--text-faint))]",
              )}
            />
            <span className="text-xs text-[hsl(var(--text-faint))]">
              {t(isServerOnline ? "dashboard.online" : "dashboard.offline")}
            </span>
          </div>

          <button
            onClick={toggleLang}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))] transition-colors"
          >
            <Globe className="size-4 shrink-0" />
            {i18n.language === "cs" ? "English" : "Čeština"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--danger)/.1)] hover:text-[hsl(var(--danger))] transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            {t("auth.signOut")}
          </button>
          {userEmail && (
            <p className="truncate px-3 pt-1 text-xs text-[hsl(var(--text-faint))]">{userEmail}</p>
          )}
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
