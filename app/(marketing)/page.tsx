import { Hero } from "@/components/marketing/Hero"
import { ReportShowcase } from "@/components/marketing/ReportShowcase"
import { RoiComparison } from "@/components/marketing/RoiComparison"
import { FinalCTA } from "@/components/marketing/FinalCTA"
import { FeatureShowcase } from "@/components/marketing/FeatureShowcase"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Status Loop | Async Standups & Reporting for All Teams",
  description: "Automate daily standups, End of Day (EoD) reports, and weekly roll-ups. Replace meetings with a 3-minute async ritual.",
}

export default function Home() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Hero />

      {/* ROI / Stats Section */}
      <RoiComparison />

      {/* Reports Highlight Section */}
      <ReportShowcase />

      {/* New Feature Showcase (Daily Wizard + Burnout) */}
      <FeatureShowcase />

      <section className="py-20 bg-slate-50 border-t border-slate-200 text-center">
        <p className="text-slate-500 font-medium mb-8 uppercase tracking-widest text-sm">Trusted by modern engineering teams</p>
        <div className="flex justify-center gap-12 opacity-50 grayscale">
          <span className="text-xl font-bold">ACME Corp</span>
          <span className="text-xl font-bold">Globex</span>
          <span className="text-xl font-bold">Soylent</span>
          <span className="text-xl font-bold">Initech</span>
        </div>
      </section>

      {/* SEO / Final CTA Section */}
      <FinalCTA />
    </div>
  );
}
