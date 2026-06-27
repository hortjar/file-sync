import {
  Database,
  FolderSync,
  type LucideIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { APP_NAME } from "../../lib/landing";

import { DownloadCta } from "./DownloadCta";
import { OnlineStatus } from "./OnlineStatus";

function OrbitChip({
  icon: Icon,
  hue,
  position,
  delay,
}: {
  icon: LucideIcon;
  hue: number;
  position: string;
  delay: string;
}) {
  return (
    <span
      className={`lp-float absolute flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(var(--surface))]/80 shadow-lg backdrop-blur-md ${position}`}
      style={{ animationDelay: delay }}
    >
      <Icon className="size-5" style={{ color: `hsl(${hue} 85% 68%)` }} />
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-5 py-6 text-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <span
          className="lp-enter inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-[hsl(var(--text-muted))] backdrop-blur-md"
          style={{ animationDelay: "0ms" }}
        >
          <Sparkles className="size-3.5 text-[hsl(var(--brand-to))]" />
          Open source · Self-hosted file sync
        </span>

        {/* Animated emblem */}
        <div
          className="lp-enter relative my-6 size-32 sm:size-40"
          style={{ animationDelay: "80ms" }}
        >
          <span
            className="absolute inset-0 rounded-full bg-[hsl(var(--brand-from)/.35)] blur-xl"
            style={{ animation: "lp-pulse-ring 3s ease-out infinite" }}
          />
          <span className="lp-spin-slow absolute inset-0 rounded-full border border-dashed border-white/10" />
          <span className="absolute inset-[15%] rounded-full border border-white/[0.06]" />
          <span className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] gradient-brand shadow-2xl shadow-[hsl(var(--brand-from)/.55)] sm:size-24 sm:rounded-[28px]">
            <FolderSync className="size-9 text-white sm:size-11" />
          </span>
          <OrbitChip icon={Zap} hue={45} position="-left-2 top-5" delay="0s" />
          <OrbitChip icon={ShieldCheck} hue={160} position="-right-1 top-1" delay="1.2s" />
          <OrbitChip icon={RefreshCw} hue={265} position="-bottom-1 left-3" delay="0.6s" />
          <OrbitChip icon={Database} hue={200} position="-right-2 bottom-5" delay="1.8s" />
        </div>

        <h1
          className="lp-enter text-5xl font-bold tracking-tight sm:text-6xl"
          style={{ animationDelay: "160ms" }}
        >
          <span className="gradient-brand-text">{APP_NAME}</span>
        </h1>

        <p
          className="lp-enter mt-4 max-w-lg text-balance text-base text-[hsl(var(--text-muted))] sm:text-lg"
          style={{ animationDelay: "240ms" }}
        >
          Keep your folders in perfect sync across every device — in real time, on your own
          hardware, with conflicts handled gracefully and nothing ever leaving your control.
        </p>

        <div className="lp-enter mt-5" style={{ animationDelay: "320ms" }}>
          <OnlineStatus />
        </div>

        <div className="lp-enter mt-6" style={{ animationDelay: "400ms" }}>
          <DownloadCta />
        </div>

        <Link
          to="/admin"
          className="lp-enter mt-5 text-sm text-[hsl(var(--text-faint))] underline-offset-4 transition-colors hover:text-[hsl(var(--text-muted))] hover:underline"
          style={{ animationDelay: "480ms" }}
        >
          or open the dashboard →
        </Link>
      </div>
    </section>
  );
}
