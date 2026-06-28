import {
  ArrowUpRight,
  ChevronDown,
  Container,
  Globe,
  type LucideIcon,
  MonitorDown,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";

import { CodeBlock } from "../../components/landing/CodeBlock";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { LandingNav } from "../../components/landing/LandingNav";
import { Button } from "../../components/ui/button";
import { APP_NAME, detectOs, GITHUB_URL } from "../../lib/landing";

const RAW_BASE = `${GITHUB_URL.replace("github.com", "raw.githubusercontent.com")}/main/scripts`;
const UNIX_INSTALL = `curl -fsSL ${RAW_BASE}/setup.sh | sh`;
const WINDOWS_INSTALL = `irm ${RAW_BASE}/setup.ps1 | iex`;

type InstallCommand = { label: string; code: string };

const UNIX_COMMAND: InstallCommand = { label: "Linux & macOS", code: UNIX_INSTALL };
const WINDOWS_COMMAND: InstallCommand = { label: "Windows · PowerShell", code: WINDOWS_INSTALL };

/** The installer for the visitor's OS first, with the rest tucked behind a toggle. */
function installCommandsForVisitor(): { primary: InstallCommand; others: InstallCommand[] } {
  if (detectOs() === "windows") {
    return { primary: WINDOWS_COMMAND, others: [UNIX_COMMAND] };
  }
  return { primary: UNIX_COMMAND, others: [WINDOWS_COMMAND] };
}

const PREREQS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Container,
    title: "Docker & Compose v2",
    description: "The whole stack — database, API, web app and HTTPS proxy — runs in containers.",
  },
  {
    icon: Globe,
    title: "A domain (optional)",
    description: "Point an A record at your server for automatic HTTPS, or trial it on localhost.",
  },
  {
    icon: Server,
    title: "A host to run it on",
    description: "Any Linux, macOS or Windows machine with Git installed — a small VPS is plenty.",
  },
];

const CONNECT_STEPS: { step: string; title: string; description: string }[] = [
  {
    step: "01",
    title: "Download the app",
    description:
      "Grab the native desktop client for your operating system from the downloads page.",
  },
  {
    step: "02",
    title: "Enter your server URL",
    description:
      "Open the app and point it at the address the installer printed (e.g. your domain).",
  },
  {
    step: "03",
    title: "Sign in & pick a folder",
    description: "Log in with your admin account, choose a folder to sync, and you're live.",
  },
];

export function QuickStartPage() {
  const { primary, others } = installCommandsForVisitor();

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
              Self-host in minutes
            </span>
            <h1
              className="lp-enter mt-6 text-4xl font-bold tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Quick <span className="gradient-brand-text">start</span>
            </h1>
            <p
              className="lp-enter mt-4 max-w-lg text-lg text-[hsl(var(--text-muted))]"
              style={{ animationDelay: "160ms" }}
            >
              One interactive command starts your own {APP_NAME} server. Then connect as many
              devices as you like — your files, your infrastructure.
            </p>
          </header>

          {/* Prerequisites */}
          <section className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {PREREQS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="lp-reveal rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-[hsl(var(--surface))]">
                    <Icon className="size-5 text-[hsl(var(--brand-to))]" />
                  </span>
                  <h3 className="mt-4 font-semibold text-[hsl(var(--text))]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Step 1 — install the server */}
          <section className="mx-auto mt-20 max-w-3xl">
            <div className="lp-reveal flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl gradient-brand font-mono text-sm font-semibold text-white shadow-lg">
                1
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Start your server</h2>
            </div>
            <p className="lp-reveal mt-3 text-[hsl(var(--text-muted))]">
              Run the installer on your host. It checks prerequisites, clones the repo, asks for
              your domain, secrets and storage locations, then builds and launches the full stack —
              and prints the URLs when it's done.
            </p>

            <div className="lp-reveal mt-6">
              <CodeBlock label={primary.label} code={primary.code} />

              <details className="group mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-[hsl(var(--text-muted))] transition-colors hover:text-[hsl(var(--text))] [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  On a different platform? Show the other commands
                </summary>
                <div className="mt-3 space-y-4">
                  {others.map((command) => (
                    <CodeBlock key={command.label} label={command.label} code={command.code} />
                  ))}
                </div>
              </details>
            </div>

            <p className="lp-reveal mt-4 text-sm text-[hsl(var(--text-faint))]">
              Prefer to do it by hand? The{" "}
              <a
                href={`${GITHUB_URL}#-quick-start-production`}
                target="_blank"
                rel="noreferrer"
                className="text-[hsl(var(--brand-to))] underline-offset-4 transition-colors hover:text-[hsl(var(--text))] hover:underline"
              >
                manual setup guide
              </a>{" "}
              walks through the Docker Compose steps.
            </p>
          </section>

          {/* Step 2 — connect a device */}
          <section className="mx-auto mt-20 max-w-3xl">
            <div className="lp-reveal flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl gradient-brand font-mono text-sm font-semibold text-white shadow-lg">
                2
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Connect your devices</h2>
            </div>

            <div className="relative mt-8 grid gap-6 md:grid-cols-3">
              <span className="pointer-events-none absolute inset-x-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
              {CONNECT_STEPS.map(({ step, title, description }) => (
                <div
                  key={step}
                  className="lp-reveal relative flex flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-8 text-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(var(--surface))] shadow-lg">
                    <span className="font-mono text-sm font-semibold text-[hsl(var(--brand-to))]">
                      {step}
                    </span>
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-[hsl(var(--text))]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mx-auto mt-20 max-w-3xl">
            <div className="lp-reveal flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Ready to sync?</h2>
              <p className="max-w-md text-[hsl(var(--text-muted))]">
                Download the desktop client and point it at your fresh server.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="gap-1.5">
                  <Link to="/downloads">
                    <MonitorDown className="size-4" />
                    Download the app
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="gap-1.5">
                  <Link to="/admin">
                    Open dashboard
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
