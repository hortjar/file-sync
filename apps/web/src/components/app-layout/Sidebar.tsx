import { FolderSync, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";

import { cn } from "../../lib/cn";
import { Separator } from "../ui/separator";

import { LanguageToggle } from "./LanguageToggle";
import { NotificationBell } from "./NotificationBell";
import { ServerStatus } from "./ServerStatus";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  const { t } = useTranslation();
  const appVersion = import.meta.env.VITE_APP_VERSION;

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.04] backdrop-blur-2xl">
      {/* Logo */}
      <div className="flex h-13 items-center gap-3 px-4 py-3.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xl gradient-brand shadow-md shadow-[hsl(var(--brand-from)/.3)]">
          <FolderSync className="size-3.5 text-white" />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <Link
              to="/dashboard"
              className="text-[13px] font-semibold tracking-tight gradient-brand-text"
            >
              FileSync
            </Link>
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

      <SidebarNav />

      {/* Footer */}
      <div className="flex flex-col gap-0.5 p-2 pb-3">
        <Separator className="mb-2 bg-white/[0.06]" />
        <ServerStatus />
        <NotificationBell />
        <LanguageToggle />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-150",
              isActive
                ? "bg-white/[0.08] font-medium text-white shadow-[inset_0_1px_0_hsl(0,0%,100%/.06)]"
                : "text-[hsl(var(--text-muted))] hover:bg-white/[0.06] hover:text-[hsl(var(--text))]",
            )
          }
        >
          <Settings className="size-4 shrink-0" />
          {t("nav.settings")}
        </NavLink>
        <UserMenu />
      </div>
    </aside>
  );
}
