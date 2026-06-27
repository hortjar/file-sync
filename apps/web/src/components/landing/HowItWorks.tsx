import { Download, type LucideIcon, Pencil, RefreshCw } from "lucide-react";

const STEPS: { icon: LucideIcon; step: string; title: string; description: string }[] = [
  {
    icon: Download,
    step: "01",
    title: "Install & link",
    description: "Download the desktop app, point it at your server, and choose a folder to sync.",
  },
  {
    icon: Pencil,
    step: "02",
    title: "Work as usual",
    description:
      "Create, edit, rename, or delete files exactly like you always do — no new habits.",
  },
  {
    icon: RefreshCw,
    step: "03",
    title: "Synced everywhere",
    description: "Every change is caught on disk and pushed to your other devices within moments.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="lp-reveal mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--brand-to))]">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in three steps
          </h2>
        </div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          {/* Connecting line behind the cards on desktop */}
          <span className="pointer-events-none absolute inset-x-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />

          {STEPS.map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="lp-reveal relative flex flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-8 text-center"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(var(--surface))] shadow-lg">
                <Icon className="size-6 text-[hsl(var(--brand-to))]" />
              </span>
              <span className="mt-4 font-mono text-xs font-semibold text-[hsl(var(--text-faint))]">
                {step}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-[hsl(var(--text))]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
