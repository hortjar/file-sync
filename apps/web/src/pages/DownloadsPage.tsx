import { ArrowUpRight } from "lucide-react";

import { DownloadCard } from "../components/landing/DownloadCard";
import { DownloadCta } from "../components/landing/DownloadCta";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingNav } from "../components/landing/LandingNav";
import { APP_NAME, detectOs, DOWNLOAD_TARGETS, RELEASES_URL, VERSION } from "../lib/landing";

export function DownloadsPage() {
  const detectedOs = detectOs();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[hsl(var(--bg))] text-[hsl(var(--text))]">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lp-grid absolute inset-x-0 top-0 h-[520px]" />
        <div className="lp-aurora absolute left-1/2 -top-40 size-[520px] -translate-x-1/2 rounded-full bg-[hsl(var(--brand-from)/.16)] blur-[120px]" />
      </div>

      <div className="relative">
        <LandingNav />

        <main className="px-5 pb-24 pt-16 sm:pt-20">
          {/* Header */}
          <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="lp-enter inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-xs text-[hsl(var(--text-muted))]">
              Latest release · v{VERSION}
            </span>
            <h1
              className="lp-enter mt-6 text-4xl font-bold tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Download <span className="gradient-brand-text">{APP_NAME}</span>
            </h1>
            <p
              className="lp-enter mt-4 max-w-lg text-lg text-[hsl(var(--text-muted))]"
              style={{ animationDelay: "160ms" }}
            >
              Get the native desktop client for your machine, then sign in to your own server and
              start syncing.
            </p>

            <div className="lp-enter mt-9" style={{ animationDelay: "240ms" }}>
              <DownloadCta showAllLink={false} />
            </div>
          </header>

          {/* Every platform */}
          <section className="mx-auto mt-20 max-w-5xl">
            <div className="lp-reveal mb-8 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">All platforms</h2>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--brand-to))] transition-colors hover:text-[hsl(var(--text))]"
              >
                All releases on GitHub
                <ArrowUpRight className="size-4" />
              </a>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {DOWNLOAD_TARGETS.map((target) => (
                <DownloadCard
                  key={target.os}
                  target={target}
                  isRecommended={target.os === detectedOs}
                />
              ))}
            </div>

            <p className="lp-reveal mt-10 text-center text-sm text-[hsl(var(--text-faint))]">
              Every installer is built and published automatically by our GitHub Actions release
              pipeline. After installing, open the app and point it at your server URL to sign in.
            </p>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
