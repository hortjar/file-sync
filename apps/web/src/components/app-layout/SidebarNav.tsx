import { FileText, FolderSync, LayoutDashboard, Monitor, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/cn";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { to: "/admin/folders", icon: FolderSync, label: "nav.folders" },
  { to: "/admin/devices", icon: Monitor, label: "nav.devices" },
  { to: "/admin/logs", icon: FileText, label: "nav.logs" },
  { to: "/admin/device-logs", icon: ScrollText, label: "nav.deviceLogs" },
] as const;

export function SidebarNav() {
  const { t } = useTranslation();

  return (
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
  );
}
