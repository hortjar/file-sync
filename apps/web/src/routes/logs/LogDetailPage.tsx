import { LogDetail } from "@file-sync/ui";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { getCachedLogEntry } from "../../lib/log-entry-cache";

export function LogDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const entry = getCachedLogEntry(id);

  function handleClose() {
    // Go back to wherever we came from (server logs or a device's log list)
    // rather than always landing on the server-logs page.
    void navigate(-1);
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

  return <LogDetail entry={entry} onClose={handleClose} showBack />;
}
