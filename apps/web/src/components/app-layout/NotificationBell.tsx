import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import {
  markAllNotificationsRead,
  type NotificationType,
  useNotifications,
} from "../../stores/notifications";

const TYPE_ICON: Record<NotificationType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  message: Bell,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  success: "text-[hsl(var(--success))]",
  error: "text-[hsl(var(--danger))]",
  warning: "text-[hsl(var(--warning,38_92%_50%))]",
  info: "text-[hsl(var(--brand-from))]",
  message: "text-[hsl(var(--text-muted))]",
};

export function NotificationBell() {
  const { t } = useTranslation();
  const triggerReference = useRef<HTMLButtonElement>(null);
  // Anchor coordinates for the portaled popup; undefined means closed.
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | undefined>(undefined);
  const entries = useNotifications((s) => s.entries);
  const unread = entries.filter((entry) => !entry.read).length;

  const isOpen = anchor !== undefined;

  function open() {
    const rect = triggerReference.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
    markAllNotificationsRead();
  }

  function close() {
    setAnchor(undefined);
  }

  return (
    <div className="relative">
      <button
        ref={triggerReference}
        type="button"
        aria-label={t("notifications.bell")}
        onClick={() => (isOpen ? close : open)()}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-white/[0.06] hover:text-[hsl(var(--text))]"
      >
        <span className="relative shrink-0">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-3.5 items-center justify-center rounded-full bg-[hsl(var(--danger))] px-1 text-[9px] font-bold leading-3.5 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        <span className="flex-1 text-left">{t("notifications.title")}</span>
      </button>

      {isOpen &&
        createPortal(
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-40 cursor-default"
              onClick={close}
            />
            <div
              style={{ left: anchor.left, bottom: anchor.bottom }}
              className="fixed z-50 w-72 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[var(--shadow-lg)]"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2">
                <span className="text-xs font-semibold text-[hsl(var(--text))]">
                  {t("notifications.title")}
                </span>
                <Link
                  to="/notifications"
                  onClick={close}
                  className="text-[11px] text-[hsl(var(--brand-from))] hover:underline"
                >
                  {t("notifications.viewAll")}
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {entries.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-[hsl(var(--text-faint))]">
                    {t("notifications.empty")}
                  </p>
                ) : (
                  entries.slice(0, 8).map((entry) => {
                    const Icon = TYPE_ICON[entry.type];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2.5 border-b border-[hsl(var(--border))] px-3 py-2.5 last:border-0"
                      >
                        <Icon className={cn("mt-0.5 size-3.5 shrink-0", TYPE_COLOR[entry.type])} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[hsl(var(--text))]">
                            {entry.title}
                          </p>
                          {entry.description && (
                            <p className="truncate text-[11px] text-[hsl(var(--text-faint))]">
                              {entry.description}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] text-[hsl(var(--text-faint))]">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
