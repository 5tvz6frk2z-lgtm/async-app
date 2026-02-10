import { Hero } from "@/components/marketing/Hero"
import { ReportShowcase } from "@/components/marketing/ReportShowcase"
import { RoiComparison } from "@/components/marketing/RoiComparison"
import { FinalCTA } from "@/components/marketing/FinalCTA"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Status Loop | Async Standups & Reporting for Engineering Teams",
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

      {/* Features / Demo Section (Legacy) */}
      <section id="demo" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Your daily standup, <br />
                <span className="text-indigo-600">reimagined.</span>
              </h2>
              <p className="text-slate-600 text-lg mb-6">
                No more "Is everyone here?" or taking turns on Zoom.
                Your team spends 2 minutes answering specific prompts:
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>What did you complete?</strong> Skip the status update.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500 font-bold">→</span>
                  <span><strong>What's the plan?</strong> Align asynchronously.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold">!</span>
                  <span><strong>Any blockers?</strong> Unblock work without a meeting.</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-lg">
              {/* Placeholder for Wizard Screenshot */}
              <div className="aspect-square bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                Wizard UI Mockup
              </div>
            </div>
          </div>
        </div>
      </section>

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
