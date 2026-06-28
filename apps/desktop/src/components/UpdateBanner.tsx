import { Download, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { downloadAndInstallUpdate, restartToApply } from "../services/updater";
import { useUpdateRuntimeStore } from "../stores/updates";

import { Button } from "./ui/button";

/** Format a byte count as a compact "12.3 MB". */
function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/**
 * A slim banner shown above the main content whenever a newer release is
 * available, downloading, or staged for restart. Driven entirely by the
 * transient updater store, so it appears no matter which page is open.
 */
export function UpdateBanner() {
  const { t } = useTranslation();
  const status = useUpdateRuntimeStore((s) => s.status);
  const version = useUpdateRuntimeStore((s) => s.availableVersion);
  const downloaded = useUpdateRuntimeStore((s) => s.downloaded);
  const contentLength = useUpdateRuntimeStore((s) => s.contentLength);

  if (status !== "available" && status !== "downloading" && status !== "ready") {
    return;
  }

  const percent =
    contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : 0;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-6 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-[hsl(var(--brand-from))]" />
        <span className="truncate text-[hsl(var(--text))]">
          {status === "available" && t("updates.bannerAvailable", { version })}
          {status === "downloading" &&
            (contentLength > 0
              ? t("updates.bannerDownloading", {
                  percent,
                  downloaded: formatMb(downloaded),
                  total: formatMb(contentLength),
                })
              : t("updates.bannerDownloadingNoSize"))}
          {status === "ready" && t("updates.bannerReady", { version })}
        </span>
      </div>

      {status === "available" && (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 gap-1.5"
          onClick={() => void downloadAndInstallUpdate()}
        >
          <Download className="size-3.5" />
          {t("updates.downloadInstall")}
        </Button>
      )}
      {status === "ready" && (
        <Button size="sm" className="shrink-0 gap-1.5" onClick={() => void restartToApply()}>
          <RotateCw className="size-3.5" />
          {t("updates.restartNow")}
        </Button>
      )}
    </div>
  );
}
