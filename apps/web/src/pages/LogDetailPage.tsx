import { LogDetail } from "@file-sync/ui";
import { useNavigate, useParams } from "react-router-dom";

import { getCachedLogEntry } from "../lib/log-entry-cache";

export function LogDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const entry = getCachedLogEntry(id);

  function handleClose() {
    void navigate("/logs");
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-[hsl(var(--text))]">Log entry not found</p>
        <p className="mt-1 text-xs text-[hsl(var(--text-faint))]">
          The entry may have been cleared. Return to the Logs page and try again.
        </p>
        <button
          type="button"
          className="mt-4 text-xs text-[hsl(var(--brand-from))] hover:underline"
          onClick={handleClose}
        >
          ← Back to Logs
        </button>
      </div>
    );
  }

  return <LogDetail entry={entry} onClose={handleClose} showBack />;
}
