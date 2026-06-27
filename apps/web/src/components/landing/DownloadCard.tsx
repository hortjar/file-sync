import { ArrowUpRight, Download } from "lucide-react";

import { type DownloadTarget, downloadUrl, GITHUB_URL, VERSION } from "../../lib/landing";
import { Button } from "../ui/button";

import { OsGlyph } from "./OsGlyph";

type DownloadCardProperties = {
  target: DownloadTarget;
  /** Highlight this card as the visitor's detected platform. */
  isRecommended?: boolean;
};

export function DownloadCard({ target, isRecommended = false }: DownloadCardProperties) {
  const isAvailable = Boolean(target.asset);

  return (
    <div
      className={`lp-reveal lp-card relative flex flex-col items-center rounded-2xl border bg-white/[0.025] px-6 py-8 text-center ${
        isRecommended ? "border-[hsl(var(--brand-from)/.5)]" : "border-white/[0.08]"
      }`}
    >
      {isRecommended && (
        <span className="absolute -top-3 rounded-full gradient-brand px-3 py-1 text-[11px] font-semibold text-white shadow-md">
          Your platform
        </span>
      )}

      <span className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(var(--surface))] shadow-lg">
        <OsGlyph os={target.os} className="size-7 text-[hsl(var(--text))]" />
      </span>

      <h3 className="mt-5 text-xl font-semibold text-[hsl(var(--text))]">{target.label}</h3>
      <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{target.detail}</p>

      {isAvailable ? (
        <>
          <Button asChild className="mt-6 w-full gap-2">
            <a href={downloadUrl(target)}>
              <Download className="size-4" />
              Download
            </a>
          </Button>
          <span className="mt-3 font-mono text-xs text-[hsl(var(--text-faint))]">v{VERSION}</span>
        </>
      ) : (
        <>
          <Button asChild variant="secondary" className="mt-6 w-full gap-2">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              Build from source
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
          <span className="mt-3 text-xs text-[hsl(var(--text-faint))]">
            Community builds welcome
          </span>
        </>
      )}
    </div>
  );
}
