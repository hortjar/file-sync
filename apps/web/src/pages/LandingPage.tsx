import { FeatureGrid } from "../components/landing/FeatureGrid";
import { Hero } from "../components/landing/Hero";
import { HowItWorks } from "../components/landing/HowItWorks";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingNav } from "../components/landing/LandingNav";
import { OpenSourceSection } from "../components/landing/OpenSourceSection";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[hsl(var(--bg))] text-[hsl(var(--text))]">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lp-grid absolute inset-x-0 top-0 h-[640px]" />
        <div className="lp-aurora absolute -left-40 -top-40 size-[520px] rounded-full bg-[hsl(var(--brand-from)/.18)] blur-[120px]" />
        <div
          className="lp-aurora absolute -right-40 top-40 size-[480px] rounded-full bg-[hsl(var(--brand-to)/.14)] blur-[120px]"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative">
        <LandingNav />
        <main>
          <Hero />
          <FeatureGrid />
          <HowItWorks />
          <OpenSourceSection />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
