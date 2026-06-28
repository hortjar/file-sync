import { getVersion } from "@tauri-apps/api/app";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { AlertTriangle, CheckCircle2, HeartPulse, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getHealth } from "../generated/sdk.gen";
import { cn } from "../lib/cn";
import { requestFolderPermissions } from "../services/permission-check";
import { fetchAvailableUpdateVersion } from "../services/updater";
import { authStore } from "../stores/auth";
import { linksStore } from "../stores/links";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
  { id: "version", labelKey: "health.versionLabel" },
  { id: "auth", labelKey: "health.authLabel" },
  { id: "notifications", labelKey: "health.notificationsLabel" },
  { id: "folders", labelKey: "health.foldersLabel" },
];

/** Spinner while a check runs, otherwise the resolved status icon. */
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
    // Seed every row up-front in a pending (loading) state so each check shows
    // its own spinner and resolves independently, rather than the whole panel
    // waiting behind a single overall loader.
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

    // Server reachability.
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

    // Version — ask the GitHub updater (the actual update source) whether a
    // newer release exists on the active channel, rather than trusting a
    // server-reported number that may lag behind real releases.
    const versionCheck = (async () => {
      let appVersion = "?";
      try {
        appVersion = await getVersion();
      } catch {
        // Fall back to "?" if the app version can't be read.
      }
      try {
        const latest = await fetchAvailableUpdateVersion();
        update(
          "version",
          latest ? "warning" : "ok",
          latest
            ? t("health.versionOutdated", { current: appVersion, latest })
            : t("health.versionOk", { version: appVersion }),
        );
      } catch {
        // Couldn't reach GitHub (offline / private repo) — don't fail the row.
        update("version", "ok", t("health.versionOk", { version: appVersion }));
      }
    })();

    // Auth is an instant, synchronous check — no need to wrap it in a task.
    const { isAuthenticated, accessToken } = authStore.state;
    const isAuthOk = isAuthenticated && Boolean(accessToken);
    update("auth", isAuthOk ? "ok" : "error", t(isAuthOk ? "health.authOk" : "health.authError"));

    const notificationsCheck = (async () => {
      let isNotifGranted = await isPermissionGranted();
      if (!isNotifGranted) {
        isNotifGranted = (await requestPermission()) === "granted";
      }
      update(
        "notifications",
        isNotifGranted ? "ok" : "warning",
        t(isNotifGranted ? "health.notificationsOk" : "health.notificationsDenied"),
      );
    })();

    const foldersCheck = (async () => {
      const paths = Object.values(linksStore.state.folderPaths);
      if (paths.length === 0) {
        update("folders", "warning", t("health.foldersNone"));
        return;
      }
      const denied: string[] = [];
      await Promise.all(
        paths.map(async (path) => {
          const { canRead, canWrite } = await requestFolderPermissions(path);
          if (!canRead || !canWrite) {
            const reason = t(
              !canRead && !canWrite
                ? "health.folderCantAccess"
                : canRead
                  ? "health.folderCantWrite"
                  : "health.folderCantRead",
            );
            denied.push(t("health.folderDenied", { path, reason }));
          }
        }),
      );
      update(
        "folders",
        denied.length > 0 ? "error" : "ok",
        denied.length > 0 ? denied.join("\n") : t("health.foldersOk"),
      );
    })();

    await Promise.all([serverCheck, versionCheck, notificationsCheck, foldersCheck]);
    setIsRunning(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runChecks();
    // Run once on mount; subsequent runs are triggered by the Re-check button.
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
        {/* Overall summary — outlined to stand out as the top-line verdict. The
            negative margin lets the outline overflow slightly past the rows
            while keeping its icon aligned with the per-check icons below, and it
            stays within the card's own padding. */}
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
