import { FEATURES } from "../../lib/landing-features";

import { FeatureCard } from "./FeatureCard";

export function FeatureGrid() {
  return (
    <section id="features" className="relative scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="lp-reveal mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--brand-to))]">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to keep files in sync
          </h2>
          <p className="mt-4 text-[hsl(var(--text-muted))]">
            A complete, self-hosted sync platform — from real-time propagation to graceful conflict
            handling, all built in and running on hardware you own.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
