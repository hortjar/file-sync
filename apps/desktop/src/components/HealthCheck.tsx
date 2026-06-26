import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { AlertTriangle, CheckCircle2, HeartPulse, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getHealth } from "../generated/sdk.gen";
import { cn } from "../lib/cn";
import { requestFolderPermissions } from "../services/permission-check";
import { authStore } from "../stores/auth";
import { linksStore } from "../stores/links";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type CheckStatus = "ok" | "warning" | "error";
type Check = { id: string; label: string; status: CheckStatus; detail: string };

const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const STATUS_COLOR: Record<CheckStatus, string> = {
  ok: "text-[hsl(var(--success))]",
  warning: "text-amber-400",
  error: "text-[hsl(var(--danger))]",
};

export function HealthCheck() {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Check[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  async function runChecks() {
    setIsRunning(true);
    const results: Check[] = [];

    // Server reachability
    try {
      const { error } = await getHealth();
      results.push({
        id: "server",
        label: t("health.serverLabel"),
        status: error ? "error" : "ok",
        detail: error ? t("health.serverError") : t("health.serverOk"),
      });
    } catch {
      results.push({
        id: "server",
        label: t("health.serverLabel"),
        status: "error",
        detail: t("health.serverError"),
      });
    }

    // Authentication
    const { isAuthenticated, accessToken } = authStore.state;
    const authOk = isAuthenticated && Boolean(accessToken);
    results.push({
      id: "auth",
      label: t("health.authLabel"),
      status: authOk ? "ok" : "error",
      detail: authOk ? t("health.authOk") : t("health.authError"),
    });

    // Notification permission
    let notifGranted = await isPermissionGranted();
    if (!notifGranted) {
      notifGranted = (await requestPermission()) === "granted";
    }
    results.push({
      id: "notifications",
      label: t("health.notificationsLabel"),
      status: notifGranted ? "ok" : "warning",
      detail: notifGranted ? t("health.notificationsOk") : t("health.notificationsDenied"),
    });

    // Folder read/write access (the macOS protected-folder permission)
    const paths = Object.values(linksStore.state.folderPaths);
    if (paths.length === 0) {
      results.push({
        id: "folders",
        label: t("health.foldersLabel"),
        status: "warning",
        detail: t("health.foldersNone"),
      });
    } else {
      const denied: string[] = [];
      for (const path of paths) {
        const { canRead, canWrite } = await requestFolderPermissions(path);
        if (!canRead || !canWrite) {
          const reason =
            !canRead && !canWrite
              ? t("health.folderCantAccess")
              : canRead
                ? t("health.folderCantWrite")
                : t("health.folderCantRead");
          denied.push(t("health.folderDenied", { path, reason }));
        }
      }
      results.push({
        id: "folders",
        label: t("health.foldersLabel"),
        status: denied.length > 0 ? "error" : "ok",
        detail: denied.length > 0 ? denied.join("\n") : t("health.foldersOk"),
      });
    }

    setChecks(results);
    setIsRunning(false);
  }

  useEffect(() => {
    void runChecks();
    // Run once on mount; subsequent runs are triggered by the Re-check button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasError = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");
  const summaryStatus: CheckStatus = hasError ? "error" : hasWarning ? "warning" : "ok";
  const SummaryIcon = STATUS_ICON[summaryStatus];

  return (
    <Card className="lg:col-span-2">
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
        <CardDescription>{t("health.hint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {checks.length > 0 && (
          <div className="flex items-center gap-2">
            <SummaryIcon className={cn("size-4 shrink-0", STATUS_COLOR[summaryStatus])} />
            <span className="text-sm font-medium text-[hsl(var(--text))]">
              {summaryStatus === "ok" ? t("health.allGood") : t("health.hasIssues")}
            </span>
          </div>
        )}

        <div className="flex flex-col divide-y divide-white/[0.05]">
          {checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <div key={check.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon className={cn("mt-0.5 size-4 shrink-0", STATUS_COLOR[check.status])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[hsl(var(--text))]">{check.label}</p>
                  <p className="whitespace-pre-line text-xs text-[hsl(var(--text-muted))]">
                    {check.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
