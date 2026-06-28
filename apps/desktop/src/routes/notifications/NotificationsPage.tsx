import { AlertTriangle, Bell, CheckCircle2, Info, Trash2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import {
  clearNotifications,
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
  warning: "text-amber-400",
  info: "text-[hsl(var(--brand-from))]",
  message: "text-[hsl(var(--text-muted))]",
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const entries = useNotifications((s) => s.entries);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text))]">
            {t("notifications.title")}
          </h1>
          <p className="mt-0.5 text-sm text-[hsl(var(--text-muted))]">
            {t("notifications.subtitle", { count: entries.length })}
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="secondary" size="sm" onClick={clearNotifications}>
            <Trash2 className="size-3.5" />
            {t("notifications.clear")}
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]">
            <Bell className="size-7 text-[hsl(var(--text-faint))]" />
          </div>
          <p className="font-medium text-[hsl(var(--text))]">{t("notifications.empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const Icon = TYPE_ICON[entry.type];
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", TYPE_COLOR[entry.type])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[hsl(var(--text))]">{entry.title}</p>
                  {entry.description && (
                    <p className="mt-0.5 text-xs text-[hsl(var(--text-muted))]">
                      {entry.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-[hsl(var(--text-faint))]">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
