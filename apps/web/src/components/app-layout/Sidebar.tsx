import { FolderSync } from "lucide-react";
import { Link } from "react-router-dom";

import { Separator } from "../ui/separator";

import { LanguageToggle } from "./LanguageToggle";
import { NotificationBell } from "./NotificationBell";
import { ServerStatus } from "./ServerStatus";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  return (
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

      <SidebarNav />

      {/* Footer */}
      <div className="flex flex-col gap-0.5 p-2 pb-3">
        <Separator className="mb-2 bg-white/[0.06]" />
        <ServerStatus />
        <NotificationBell />
        <LanguageToggle />
        <UserMenu />
      </div>
    </aside>
  );
}
