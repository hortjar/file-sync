import type { Feature } from "../../lib/landing-features";

type FeatureCardProperties = { feature: Feature };

export function FeatureCard({ feature }: FeatureCardProperties) {
  const { icon: Icon, title, description, hue } = feature;

  return (
    <div className="lp-reveal lp-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 hover:border-white/[0.14] hover:bg-white/[0.04]">
      {/* Corner glow on hover */}
      <span
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `hsl(${hue} 85% 60% / 0.22)` }}
      />
      {/* Top accent line on hover */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, hsl(${hue} 85% 66%), transparent)`,
        }}
      />

      <span
        className="relative flex size-12 items-center justify-center rounded-2xl"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 80% 58%), hsl(${hue + 28} 82% 50%))`,
          boxShadow: `0 8px 24px hsl(${hue} 80% 45% / 0.35)`,
        }}
      >
        <Icon className="size-6 text-white" />
      </span>

      <h3 className="relative mt-5 text-lg font-semibold text-[hsl(var(--text))]">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-[hsl(var(--text-muted))]">
        {description}
      </p>
    </div>
  );
}
