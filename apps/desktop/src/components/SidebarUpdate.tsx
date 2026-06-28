import { ArrowUpCircle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib/cn";
import { downloadUpdate, installAndRestart } from "../services/updater";
import { useUpdateRuntimeStore } from "../stores/updates";

/**
 * Persistent sidebar entry (sits above the connection status) shown only while
 * an update is available, downloading, or staged. It doubles as the download
 * progress bar — the orange fill tracks bytes received — and clicking it either
 * starts the download (when available) or restarts to install (when ready).
 * The app never restarts on its own; this is the only trigger.
 */
export function SidebarUpdate() {
  const { t } = useTranslation();
  const status = useUpdateRuntimeStore((s) => s.status);
  const downloaded = useUpdateRuntimeStore((s) => s.downloaded);
  const contentLength = useUpdateRuntimeStore((s) => s.contentLength);

  if (status !== "available" && status !== "downloading" && status !== "ready") return;

  const isDownloading = status === "downloading";
  const percent =
    contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : 0;
  const labelKey =
    status === "downloading"
      ? "updates.sidebarDownloading"
      : status === "ready"
        ? "updates.sidebarReady"
        : "updates.sidebarAvailable";
  const label = t(labelKey, { percent });
  const Icon = status === "ready" ? RotateCw : ArrowUpCircle;

  const handleClick = () => {
    if (status === "available") void downloadUpdate();
    else if (status === "ready") void installAndRestart();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDownloading}
      className={cn(
        "relative flex items-center overflow-hidden rounded-xl border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-[13px] font-medium text-orange-300 transition-colors",
        !isDownloading && "cursor-pointer hover:bg-orange-400/20",
      )}
    >
      {isDownloading && (
        <span
          className="absolute inset-y-0 left-0 bg-orange-400/25 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      )}
      <Icon className={cn("relative mr-2.5 size-4 shrink-0", isDownloading && "animate-pulse")} />
      <span className="relative flex-1 truncate text-left">{label}</span>
    </button>
  );
}
