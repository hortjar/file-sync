import { Download, Rocket, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { GITHUB_URL } from "../../lib/landing";
import { Button } from "../ui/button";

import { GithubIcon } from "./GithubIcon";

const STATS: { value: string; label: string }[] = [
  { value: "100%", label: "Open source" },
  { value: "1-cmd", label: "Docker deploy" },
  { value: "∞", label: "Linked devices" },
  { value: "0", label: "Third parties" },
];

const TERMINAL_LINES: { text: string; tone: "muted" | "prompt" | "ok" | "plain" }[] = [
  { text: "# bring up the whole stack", tone: "muted" },
  { text: "$ docker compose up -d", tone: "prompt" },
  { text: "✔ postgres   started", tone: "ok" },
  { text: "✔ server     started", tone: "ok" },
  { text: "✔ web        started", tone: "ok" },
  { text: "✔ caddy      https ready", tone: "ok" },
];

const TONE_CLASS: Record<(typeof TERMINAL_LINES)[number]["tone"], string> = {
  muted: "text-[hsl(var(--text-faint))]",
  prompt: "text-[hsl(var(--text))]",
  ok: "text-[hsl(var(--success))]",
  plain: "text-[hsl(var(--text-muted))]",
};

export function OpenSourceSection() {
  return (
    <section className="relative px-5 py-20 sm:py-24">
      <div className="lp-reveal mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 sm:p-12">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--brand-from)/.3)] bg-[hsl(var(--brand-from)/.1)] px-3 py-1 text-xs font-medium text-[hsl(var(--brand-to))]">
              <Star className="size-3.5" />
              Free & open source
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Open source. Self-hosted. <span className="gradient-brand-text">Entirely yours.</span>
            </h2>
            <p className="mt-4 max-w-md text-[hsl(var(--text-muted))]">
              No subscriptions, no cloud middlemen, no telemetry. Run the entire stack on your own
              server with a single command and keep complete ownership of every byte.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <GithubIcon className="size-4" />
                  Star on GitHub
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/downloads">
                  <Download className="size-4" />
                  Get the app
                </Link>
              </Button>
            </div>

            <Link
              to="/quick-start"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--text-muted))] underline-offset-4 transition-colors hover:text-[hsl(var(--text))] hover:underline"
            >
              <Rocket className="size-4 text-[hsl(var(--brand-to))]" />
              Read the quick start guide →
            </Link>

            <dl className="mt-9 grid grid-cols-4 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-bold gradient-brand-text">{stat.value}</dt>
                  <dd className="mt-1 text-xs text-[hsl(var(--text-faint))]">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Faux terminal */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[hsl(var(--bg-subtle))] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
              <span className="size-3 rounded-full bg-[hsl(var(--danger))]/70" />
              <span className="size-3 rounded-full bg-amber-400/70" />
              <span className="size-3 rounded-full bg-[hsl(var(--success))]/70" />
              <span className="ml-2 font-mono text-xs text-[hsl(var(--text-faint))]">
                deploy.sh
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-5 font-mono text-[13px] leading-relaxed">
              {TERMINAL_LINES.map((line) => (
                <span key={line.text} className={TONE_CLASS[line.tone]}>
                  {line.text}
                </span>
              ))}
              <span className="mt-1 inline-flex h-4 w-2 animate-pulse bg-[hsl(var(--brand-to))]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
