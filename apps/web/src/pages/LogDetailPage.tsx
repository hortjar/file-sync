import { LogDetail } from "@file-sync/ui";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { getCachedLogEntry } from "../lib/log-entry-cache";

export function LogDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const entry = getCachedLogEntry(id);

  function handleClose() {
    void navigate("/logs");
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-[hsl(var(--text))]">{t("logs.notFound")}</p>
        <p className="mt-1 text-xs text-[hsl(var(--text-faint))]">{t("logs.notFoundHint")}</p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1 text-xs text-[hsl(var(--brand-from))] hover:underline"
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
