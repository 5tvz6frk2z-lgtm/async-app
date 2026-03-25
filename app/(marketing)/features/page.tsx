"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    FileText,
    BarChart3,
    ShieldAlert,
    Sparkles,
    Users,
    Calendar,
    ArrowRight,
    CheckCircle2,
} from "lucide-react"

const features = [
    {
        icon: FileText,
        title: "End of Day Reports",
        description:
            "Team members submit a quick daily update — what they did, what's planned tomorrow, and any blockers. Takes under 2 minutes.",
        color: "text-indigo-600",
        bg: "bg-indigo-50",
    },
    {
        icon: Calendar,
        title: "End of Week Reports",
        description:
            "Automated weekly roll-ups summarize the entire week's progress, wins, and issues across your team — ready for Friday review.",
        color: "text-purple-600",
        bg: "bg-purple-50",
    },
    {
        icon: Sparkles,
        title: "AI Morning Briefing",
        description:
            "Wake up to an AI-generated summary of yesterday's activity across all your teams. Know what happened before your first coffee.",
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
    {
        icon: ShieldAlert,
        title: "Burnout Detection",
        description:
            "Sentiment tracking flags team members who may be struggling — repeated blockers, low mood, or declining engagement.",
        color: "text-rose-600",
        bg: "bg-rose-50",
    },
    {
        icon: BarChart3,
        title: "Team Pulse Dashboard",
        description:
            "See participation rates, sentiment trends, and blocker patterns at a glance. Spot issues before they become problems.",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        icon: Users,
        title: "Multi-Team Management",
        description:
            "Manage multiple teams from a single dashboard. Perfect for franchise owners, agency leads, or engineering managers with several squads.",
        color: "text-sky-600",
        bg: "bg-sky-50",
    },
]

export default function FeaturesPage() {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="pt-32 pb-20 bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        Everything your team needs
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        Features built for async-first teams
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Replace status meetings with a 2-minute daily ritual. Get full visibility into what your team accomplished, what's next, and where they need help.
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
                        >
                            <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">How it works</h2>
                    <div className="space-y-12">
                        {[
                            {
                                step: "1",
                                title: "Team members submit end of day reports",
                                desc: "Each person spends under 2 minutes answering: What did I accomplish? What's my plan for tomorrow? Any blockers?",
                            },
                            {
                                step: "2",
                                title: "AI summarizes everything overnight",
                                desc: "Status Loop's AI reads every report and generates a morning briefing — one concise summary for each team.",
                            },
                            {
                                step: "3",
                                title: "You wake up informed",
                                desc: "Open your dashboard, read the briefing, and start your day making decisions — not chasing updates.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-6 items-start">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">
                        Ready to try it?
                    </h2>
                    <p className="text-lg text-slate-600 mb-10">
                        Set up your team in under 5 minutes. No credit card required.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                Get Started
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 hover:bg-slate-50">
                                See a Demo
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
