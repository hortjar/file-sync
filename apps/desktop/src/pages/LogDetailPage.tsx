import { LogDetail } from "@file-sync/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getCachedLogEntry } from "../lib/log-entry-cache";

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
