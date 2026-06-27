import { Download } from "lucide-react";
import { Link } from "react-router-dom";

import { detectOs, downloadUrl, targetForOs, VERSION } from "../../lib/landing";
import { Button } from "../ui/button";

import { OsGlyph } from "./OsGlyph";

type DownloadCtaProperties = {
  /** Show the secondary "all downloads" link below the primary button. */
  showAllLink?: boolean;
};

/**
 * Twofold download control: a primary button that grabs the installer for the
 * visitor's detected OS, with a secondary link out to every platform.
 */
export function DownloadCta({ showAllLink = true }: DownloadCtaProperties) {
  const target = targetForOs(detectOs());

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        asChild
        size="lg"
        className="lp-gradient-animated h-12 gap-2.5 px-7 text-base shadow-lg shadow-[hsl(var(--brand-from)/.35)]"
      >
        <a href={downloadUrl(target)}>
          <Download className="size-5" />
          Download for {target.label}
          <OsGlyph os={target.os} className="size-4 opacity-80" />
        </a>
      </Button>

      <p className="text-xs text-[hsl(var(--text-faint))]">
        {target.detail} · v{VERSION}
      </p>

      {showAllLink && (
        <Button asChild variant="secondary" size="sm" className="mt-1 rounded-full bg-white/[0.04]">
          <Link to="/downloads">All downloads & other platforms →</Link>
        </Button>
      )}
    </div>
  );
}
