"use client"

import Link from "next/link"
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    BarChart3,
    ShieldAlert,
    Zap,
    Users,
    FileText,
    CalendarCheck,
    Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProductPage() {
    return (
        <div className="bg-white">

            {/* ─── Hero ─────────────────────────────────────────────── */}
            <section className="relative pt-28 pb-20 overflow-hidden bg-gradient-to-b from-indigo-50/60 to-white">
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl -z-10" />
                <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-3xl -z-10" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-8 border border-indigo-100">
                        <Zap className="w-4 h-4" />
                        The async-first team operating system
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                        Everything your team needs to stay aligned —{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            without the meetings.
                        </span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                        Status Loop replaces daily standups and status-chasing with a lightweight async workflow.
                        Your team submits end of day reports in under two minutes. You get a clear,
                        AI-powered picture of what's happening — every single day and every week.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/pricing">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
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

            {/* ─── Stats Bar ────────────────────────────────────────── */}
            <section className="py-14 border-y border-slate-100 bg-slate-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { value: "3+ hrs", label: "Saved per manager, per day" },
                        { value: "< 2 min", label: "To submit a daily update" },
                        { value: "100%", label: "Team visibility, zero meetings" },
                        { value: "5×", label: "Faster weekly reporting" },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <p className="text-4xl font-bold text-indigo-600 mb-1">{stat.value}</p>
                            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── What is Status Loop ──────────────────────────────── */}
            <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-6">
                            <FileText className="w-4 h-4" />
                            How it works
                        </div>
                        <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            Replace standups with a smarter daily rhythm.
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Each team member answers three quick questions at the end of their day.
                            Status Loop collects these <strong>end of day reports</strong>, surfaces blockers,
                            tracks sentiment, and compiles everything into a clear feed for managers —
                            no meeting required.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "What did you complete today?",
                                "What are you working on tomorrow?",
                                "Any blockers or concerns?",
                            ].map((q, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-slate-700 font-medium">{q}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                        <div className="space-y-4">
                            {[
                                { icon: Clock, color: "text-indigo-600 bg-indigo-100", title: "Daily Updates", desc: "Team members submit end of day reports in under 2 minutes, on their schedule." },
                                { icon: CalendarCheck, color: "text-purple-600 bg-purple-100", title: "Weekly Roll-ups", desc: "Every Friday, AI compiles end of week reports summarizing progress, wins, and risks." },
                                { icon: ShieldAlert, color: "text-rose-600 bg-rose-100", title: "Burnout Alerts", desc: "Proactive flags when someone's sentiment or workload signals they're struggling." },
                            ].map(({ icon: Icon, color, title, desc }) => (
                                <div key={title} className="flex gap-4 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                                    <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{title}</p>
                                        <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Features Grid ────────────────────────────────────── */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            Built for teams that move fast.
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Every feature is designed to reduce friction, increase visibility, and give managers
                            the clarity they need to lead — not babysit.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: FileText,
                                color: "bg-indigo-100 text-indigo-600",
                                title: "End of Day Reports",
                                desc: "Structured daily check-ins that take under 2 minutes. Team members share what they did, what's next, and any blockers — all in one place.",
                            },
                            {
                                icon: CalendarCheck,
                                color: "bg-purple-100 text-purple-600",
                                title: "End of Week Reports",
                                desc: "Automatically compiled every Friday. AI synthesizes the week's updates into a concise summary — wins, risks, and what's coming next.",
                            },
                            {
                                icon: BarChart3,
                                color: "bg-emerald-100 text-emerald-600",
                                title: "Team Pulse Dashboard",
                                desc: "A real-time view of your team's mood, participation rate, and active blockers. Know what's happening without asking.",
                            },
                            {
                                icon: ShieldAlert,
                                color: "bg-rose-100 text-rose-600",
                                title: "Smart Burnout Detection",
                                desc: "AI monitors patterns — late updates, declining sentiment, repeated blockers — and alerts you before a team member burns out.",
                            },
                            {
                                icon: Zap,
                                color: "bg-amber-100 text-amber-600",
                                title: "AI Morning Briefing",
                                desc: "Start your day with an AI-generated briefing of your team's latest updates. No inbox-diving, no Slack threads to parse.",
                            },
                            {
                                icon: Users,
                                color: "bg-sky-100 text-sky-600",
                                title: "Multi-Team Management",
                                desc: "Manage multiple teams or franchises from a single dashboard. Perfect for distributed operations and regional managers.",
                            },
                        ].map(({ icon: Icon, color, title, desc }) => (
                            <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className={`inline-flex p-3 rounded-xl ${color} mb-4`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Case Study Snippet ───────────────────────────────── */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-4">
                            <CheckCircle2 className="w-4 h-4" />
                            Customer Story
                        </div>
                        <h2 className="text-4xl font-bold text-slate-900">
                            Real results, real businesses.
                        </h2>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 md:p-14 text-white relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

                        <div className="relative grid md:grid-cols-3 gap-10 items-center">
                            {/* Stats */}
                            <div className="md:col-span-1 space-y-6">
                                <div>
                                    <p className="text-4xl font-bold text-indigo-400">3+ hrs</p>
                                    <p className="text-slate-400 text-sm mt-1">Saved per day by the CEO</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-emerald-400">4</p>
                                    <p className="text-slate-400 text-sm mt-1">Franchise locations managed</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-purple-400">0</p>
                                    <p className="text-slate-400 text-sm mt-1">Daily check-in calls needed</p>
                                </div>
                            </div>

                            {/* Quote */}
                            <div className="md:col-span-2">
                                <Quote className="w-10 h-10 text-indigo-400 mb-4 opacity-60" />
                                <blockquote className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-6">
                                    "Since starting Status Loop, I don't have to waste time finding out what's going on.
                                    I'm now able to focus on growth and expansion."
                                </blockquote>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                        CR
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Caleb Reid</p>
                                        <p className="text-slate-400 text-sm">CEO, The Local Landscaper</p>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Link href="/case-studies/the-local-landscaper" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
                                        Read the full case study
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Who It's For ─────────────────────────────────────── */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">Who Status Loop is for</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Whether you're running a software team, a service business, or a multi-location operation —
                            if you manage people, Status Loop was built for you.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                emoji: "💻",
                                title: "Engineering Teams",
                                desc: "Replace daily standups with async end of day reports. Managers get full visibility without interrupting deep work.",
                            },
                            {
                                emoji: "🏢",
                                title: "Distributed Operations",
                                desc: "Manage multiple locations or franchises from one dashboard. Know what's happening across every site without a single call.",
                            },
                            {
                                emoji: "📈",
                                title: "Growing Businesses",
                                desc: "Scale your team without scaling your meeting load. Status Loop grows with you — from 5 to 500 people.",
                            },
                        ].map(({ emoji, title, desc }) => (
                            <div key={title} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
                                <span className="text-5xl mb-4 block">{emoji}</span>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                                <p className="text-slate-600 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Final CTA ────────────────────────────────────────── */}
            <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Ready to stop chasing updates?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
                        Join teams that have replaced their morning standups with Status Loop's
                        async-first workflow. Set up in minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl">
                                Get Started
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    )
}
