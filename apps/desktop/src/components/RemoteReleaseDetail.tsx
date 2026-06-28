import { ArrowLeft, Calendar, FileText, Package, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ParsedRemoteRelease } from "../lib/parse-remote-release";

/** Pretty, structured rendering of a parsed updater RemoteRelease log line. */
export function RemoteReleaseDetail({
  release,
  onClose,
}: {
  release: ParsedRemoteRelease;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex w-fit cursor-pointer items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
      >
        <ArrowLeft className="size-3.5" />
        {t("logs.backToList")}
      </button>

      <div className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-[hsl(var(--brand-from))]" />
          <h1 className="text-base font-semibold text-[hsl(var(--text))]">
            {t("logs.releaseTitle", { version: release.version })}
          </h1>
        </div>

        {release.pubDate && (
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))]">
            <Calendar className="size-3.5 shrink-0" />
            <span>{t("logs.releasePublished")}</span>
            <span className="font-mono text-[hsl(var(--text))]">{release.pubDate}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--text-muted))]">
            <FileText className="size-3.5" />
            {t("logs.releaseNotes")}
          </div>
          <p className="whitespace-pre-line text-sm text-[hsl(var(--text))]">
            {release.notes ?? t("logs.releaseNoNotes")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--text-muted))]">
            <Package className="size-3.5" />
            {t("logs.releasePlatforms")}
          </div>
          <div className="flex flex-col divide-y divide-[hsl(var(--border-subtle))] overflow-hidden rounded-xl border border-[hsl(var(--border))]">
            {release.platforms.map((platform) => (
              <div key={platform.name} className="flex flex-col gap-1.5 p-3">
                <span className="font-mono text-xs font-medium text-[hsl(var(--brand-from))]">
                  {platform.name}
                </span>
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="select-text break-all text-xs text-[hsl(var(--text))] hover:underline"
                >
                  {platform.file}
                </a>
                <span className="select-text break-all font-mono text-[10px] text-[hsl(var(--text-faint))]">
                  {t("logs.releaseSignature")}: {platform.signature.slice(0, 48)}…
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
