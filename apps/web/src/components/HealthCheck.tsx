import { AlertTriangle, CheckCircle2, HeartPulse, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getHealth } from "../generated/sdk.gen";
import { cn } from "../lib/cn";
import { authStore } from "../stores/auth";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type CheckStatus = "pending" | "ok" | "warning" | "error";
type ResolvedStatus = Exclude<CheckStatus, "pending">;
type Check = { id: string; label: string; status: CheckStatus; detail: string };

const STATUS_ICON: Record<ResolvedStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const STATUS_COLOR: Record<ResolvedStatus, string> = {
  ok: "text-[hsl(var(--success))]",
  warning: "text-amber-400",
  error: "text-[hsl(var(--danger))]",
};

const CHECK_DEFS: { id: string; labelKey: string }[] = [
  { id: "server", labelKey: "health.serverLabel" },
  { id: "auth", labelKey: "health.authLabel" },
  { id: "notifications", labelKey: "health.notificationsLabel" },
];

function StatusGlyph({ status }: { status: CheckStatus }) {
  if (status === "pending") {
    return (
      <span className="mt-0.5 block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-[hsl(var(--text-faint))]" />
    );
  }
  const Icon = STATUS_ICON[status];
  return <Icon className={cn("mt-0.5 size-4 shrink-0", STATUS_COLOR[status])} />;
}

export function HealthCheck() {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Check[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  async function runChecks() {
    setIsRunning(true);
    const pending: CheckStatus = "pending";
    setChecks(
      CHECK_DEFS.map((definition) => ({
        id: definition.id,
        label: t(definition.labelKey),
        status: pending,
        detail: "",
      })),
    );

    const update = (id: string, status: ResolvedStatus, detail: string) =>
      setChecks((previous) =>
        previous.map((check) => (check.id === id ? { ...check, status, detail } : check)),
      );

    const serverCheck = (async () => {
      try {
        const { error } = await getHealth();
        update(
          "server",
          error ? "error" : "ok",
          t(error ? "health.serverError" : "health.serverOk"),
        );
      } catch {
        update("server", "error", t("health.serverError"));
      }
    })();

    const { isAuthenticated, accessToken } = authStore.state;
    const isAuthOk = isAuthenticated && Boolean(accessToken);
    update("auth", isAuthOk ? "ok" : "error", t(isAuthOk ? "health.authOk" : "health.authError"));

    const notificationsCheck = (async () => {
      if (typeof Notification === "undefined") {
        update("notifications", "warning", t("health.notificationsUnsupported"));
        return;
      }
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      const isGranted = permission === "granted";
      update(
        "notifications",
        isGranted ? "ok" : "warning",
        t(isGranted ? "health.notificationsOk" : "health.notificationsDenied"),
      );
    })();

    await Promise.all([serverCheck, notificationsCheck]);
    setIsRunning(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPending = checks.some((c) => c.status === "pending");
  const hasError = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");
  const summaryStatus: CheckStatus = isPending
    ? "pending"
    : hasError
      ? "error"
      : hasWarning
        ? "warning"
        : "ok";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4 text-[hsl(var(--text-muted))]" />
            <CardTitle>{t("health.title")}</CardTitle>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5"
            loading={isRunning}
            onClick={() => void runChecks()}
          >
            <RefreshCw className="size-3.5" />
            {t("health.recheck")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {checks.length > 0 && (
          <div className="-mx-3 flex items-start gap-2.5 rounded-lg border border-white/[0.08] px-3 py-2.5">
            <StatusGlyph status={summaryStatus} />
            <span className="text-sm font-semibold leading-5 text-[hsl(var(--text))]">
              {t(
                summaryStatus === "pending"
                  ? "health.checking"
                  : summaryStatus === "ok"
                    ? "health.allGood"
                    : "health.hasIssues",
              )}
            </span>
          </div>
        )}

        <div className="flex flex-col divide-y divide-white/[0.05]">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <StatusGlyph status={check.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5 text-[hsl(var(--text))]">
                  {check.label}
                </p>
                {check.detail && (
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-5 text-[hsl(var(--text-muted))]">
                    {check.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
