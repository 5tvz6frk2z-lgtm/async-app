"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock, BarChart3, ShieldAlert, Quote, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LocalLandscaperCaseStudy() {
    return (
        <div className="bg-white">

            {/* ─── Hero ─────────────────────────────────────────────── */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-slate-900 text-white">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-slate-900">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Link href="/product" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Product
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium mb-6 border border-indigo-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        Customer Story
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                        How The Local Landscaper Saved 3+ Hours a Day
                    </h1>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        CEO Caleb Reid replaced a morning of chaotic check-in calls with a 10-minute async workflow,
                        unlocking time for growth and expansion.
                    </p>
                </div>
            </section>

            {/* ─── Stats Bar ────────────────────────────────────────── */}
            <section className="py-12 border-b border-slate-100 bg-white shadow-sm relative z-10 -mt-8 mx-4 md:mx-auto max-w-5xl rounded-2xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-8">
                    {[
                        { value: "3+ hrs", label: "Saved per day" },
                        { value: "4", label: "Locations managed" },
                        { value: "100%", label: "Visibility score" },
                        { value: "Zero", label: "Daily meetings" },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <p className="text-3xl font-bold text-indigo-600 mb-1">{stat.value}</p>
                            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Narrative Content ────────────────────────────────── */}
            <section className="py-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* 1. The Problem */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">The Challenge: Chaos Across 4 Locations</h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        Caleb Reid runs four landscaping franchise locations across the region. Each location has its own crew manager,
                        seasonal staff, and a constant stream of daily operational decisions.
                    </p>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        Before Status Loop, Caleb's mornings were consumed by a reactive check-in routine:
                    </p>
                    <ul className="space-y-4 bg-rose-50 p-6 rounded-xl border border-rose-100 text-slate-700">
                        <li className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-rose-500 mt-0.5" />
                            <span><strong>7:15 AM — Northside:</strong> Call the foreman. No answer. Text: "Did you finish the Henderson job?" Waits 20 min. Reply: "yeah most of it." What does that mean? Calls back to clarify. Learns the mower broke down at 3 PM yesterday.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-rose-500 mt-0.5" />
                            <span><strong>7:50 AM — Eastside:</strong> Texts the manager: "What's on for today?" No reply. Calls. Goes to voicemail. Tries again at 8:15. Finally connects — learns yesterday's sod delivery never arrived and today's schedule is already behind.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-rose-500 mt-0.5" />
                            <span><strong>8:30 AM — Southside:</strong> Manager picks up but is vague. "Everything's fine." Caleb asks: "Did you finish the irrigation install?" Pause. "Uh, mostly." Has to ask three more questions to learn they're short a crew member and need someone reassigned.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-rose-500 mt-0.5" />
                            <span><strong>9:20 AM — Westside:</strong> Finally reaches the fourth manager. Same questions again — what got done, what's planned, any problems? Turns out a client complained yesterday about edging quality. First Caleb's hearing of it.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-rose-500 mt-0.5" />
                            <span><strong>10:00 AM:</strong> Three hours of calls, texts, and follow-ups — just to get the same basic information from four people. And he'll do it all again tomorrow.</span>
                        </li>
                    </ul>
                    <p className="text-lg text-slate-600 leading-relaxed mt-6">
                        By the time he had a clear picture of what was happening, it was mid-morning — and he hadn't done a single thing to grow the business.
                    </p>
                </div>

                {/* 2. The Solution */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">The Switch to Async</h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        Caleb needed a way to manage remote teams without constant check-ins. He found Status Loop and was drawn to the
                        simplicity of the <strong>end of day report</strong> workflow.
                    </p>
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-6">
                        <h3 className="font-bold text-indigo-900 mb-4">The New Workflow</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-indigo-800">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                Setup took less than a day for all 4 locations.
                            </li>
                            <li className="flex items-center gap-3 text-indigo-800">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                Managers submit reports in &lt; 2 minutes.
                            </li>
                            <li className="flex items-center gap-3 text-indigo-800">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                Caleb gets one AI Morning Briefing for everything.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Quote */}
                <div className="my-20">
                    <blockquote className="text-2xl font-medium text-slate-900 leading-relaxed border-l-4 border-indigo-500 pl-6 italic">
                        "Since starting Status Loop, I don't have to waste time finding out what's going on.
                        I'm now able to focus on growth and expansion."
                    </blockquote>
                    <div className="mt-6 flex items-center gap-4 pl-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            CR
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">Caleb Reid</p>
                            <p className="text-slate-500 text-sm">CEO, The Local Landscaper</p>
                        </div>
                    </div>
                </div>

                {/* 3. The Results */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">Results: Focus on Growth</h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        Within 30 days, the daily check-in routine dropped from 3+ hours to under 10 minutes.
                        Caleb now starts his day by reading an AI Morning Briefing that synthesizes updates from all four locations.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <ShieldAlert className="w-8 h-8 text-rose-500 mb-4" />
                            <h3 className="font-bold text-slate-900 mb-2">Proactive Alerts</h3>
                            <p className="text-slate-600 text-sm">Blockers and burnout risks are flagged immediately, not weeks later.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <BarChart3 className="w-8 h-8 text-emerald-500 mb-4" />
                            <h3 className="font-bold text-slate-900 mb-2">Weekly Visibility</h3>
                            <p className="text-slate-600 text-sm">End of week reports summarize progress and wins automatically every Friday.</p>
                        </div>
                    </div>
                </div>

            </section>

            {/* ─── CTA ──────────────────────────────────────────────── */}
            <section className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                        Ready to reclaim your time?
                    </h2>
                    <p className="text-lg text-slate-600 mb-10">
                        Join Caleb and hundreds of other leaders who have switched to async updates.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                Get Started
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/product">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 hover:bg-white text-slate-600">
                                See How It Works
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    )
}
