import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { clearAuthHeader } from "../../lib/api-client";
import { logout, useAuthStore } from "../../stores/auth";

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userEmail = useAuthStore((s) => s.userEmail);

  function handleLogout() {
    clearAuthHeader();
    logout();
    void navigate("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-[hsl(var(--danger)/.1)] hover:text-[hsl(var(--danger))]"
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white shadow-sm">
        {(userEmail?.[0] ?? "?").toUpperCase()}
      </div>
      <span className="flex-1 truncate text-left text-[11px]">
        {userEmail ?? t("common.unknown")}
      </span>
      <LogOut className="size-3.5 shrink-0" />
    </button>
  );
}
