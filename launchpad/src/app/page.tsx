import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { FeaturedLaunches } from "@/components/landing/featured-launches";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ExtensionBanner } from "@/components/landing/extension-banner";
import { CTASection } from "@/components/landing/cta-section";

/**
 * Marketing landing. Sections are self-contained components under
 * components/landing/ and render mock data (see landing/data.ts) so the page
 * is fully static; swapping in live API data is a data.ts-only change.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <FeaturedLaunches />
      <HowItWorks />
      <ExtensionBanner />
      <CTASection />
    </>
  );
}
