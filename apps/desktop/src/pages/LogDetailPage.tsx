import { LogDetail } from "@file-sync/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RemoteReleaseDetail } from "../components/RemoteReleaseDetail";
import { getCachedLogEntry } from "../lib/log-entry-cache";
import { parseRemoteRelease } from "../lib/parse-remote-release";

export function LogDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const parameters = useParams({ strict: false });
  const id = parameters["id"] ?? "";
  const entry = getCachedLogEntry(id);

  function handleClose() {
    void navigate({ to: "/logs" });
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-[hsl(var(--text))]">{t("logs.notFound")}</p>
        <p className="mt-1 text-xs text-[hsl(var(--text-faint))]">{t("logs.notFoundHint")}</p>
        <button
          type="button"
          className="mt-4 inline-flex cursor-pointer items-center gap-1 text-xs text-[hsl(var(--brand-from))] hover:underline"
          onClick={handleClose}
        >
          <ArrowLeft className="size-3" />
          {t("logs.backToLogs")}
        </button>
      </div>
    );
  }

  // Updater release dumps are noisy Rust Debug output — render them prettily.
  const release = parseRemoteRelease(entry.msg);
  if (release) return <RemoteReleaseDetail release={release} onClose={handleClose} />;

  return <LogDetail entry={entry} onClose={handleClose} showBack />;
}
