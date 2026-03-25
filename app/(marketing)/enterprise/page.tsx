"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Shield,
    KeyRound,
    FileSearch,
    HeadphonesIcon,
    Building2,
    Plug,
    ArrowRight,
    CheckCircle2,
} from "lucide-react"

const enterpriseFeatures = [
    {
        icon: KeyRound,
        title: "Single Sign-On (SSO)",
        description: "SAML 2.0 and OAuth integration with your existing identity provider — Okta, Azure AD, Google Workspace, and more.",
    },
    {
        icon: FileSearch,
        title: "Audit Logs",
        description: "Full activity logs for compliance. Track who did what, when, and from where — exportable for SOC 2 and ISO 27001.",
    },
    {
        icon: HeadphonesIcon,
        title: "Dedicated Success Manager",
        description: "A named point of contact who knows your team, your workflow, and your goals. Onboarding, training, and ongoing support.",
    },
    {
        icon: Shield,
        title: "Enterprise SLA",
        description: "99.9% uptime guarantee with priority incident response and dedicated escalation paths.",
    },
    {
        icon: Plug,
        title: "Custom Integrations",
        description: "Connect Status Loop to your internal tools, HR systems, and project management platforms via API or webhooks.",
    },
    {
        icon: Building2,
        title: "Multi-Org Management",
        description: "Manage multiple divisions, departments, or subsidiaries from a single admin console with role-based access controls.",
    },
]

export default function EnterprisePage() {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="pt-32 pb-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-sm font-medium mb-6 border border-white/20">
                        <Building2 className="w-4 h-4" />
                        Enterprise
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Built for organizations that need security, scale, and support
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
                        Everything in Pro, plus SSO, audit logs, a dedicated success manager, and an SLA your compliance team will love.
                    </p>
                    <Link href="mailto:sales@statusloop.com">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg">
                            Contact Sales
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {enterpriseFeatures.map((feature) => (
                        <div key={feature.title} className="p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <feature.icon className="w-8 h-8 text-indigo-600 mb-5" />
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-12">Security & Compliance</h2>
                    <div className="grid sm:grid-cols-3 gap-8">
                        {[
                            { label: "SOC 2 Type II", detail: "Audited annually" },
                            { label: "GDPR Compliant", detail: "EU data residency available" },
                            { label: "99.9% Uptime SLA", detail: "With priority support" },
                        ].map((item) => (
                            <div key={item.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                <p className="font-bold text-slate-900">{item.label}</p>
                                <p className="text-sm text-slate-500">{item.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">
                        Let's talk about your team
                    </h2>
                    <p className="text-lg text-slate-600 mb-10">
                        We'll walk you through the platform, answer your security questions, and build a rollout plan together.
                    </p>
                    <Link href="mailto:sales@statusloop.com">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            Contact Sales
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    )
}
