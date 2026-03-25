"use client"

import { CheckCircle2, Zap, ShieldAlert, Sparkles } from "lucide-react"

export function FeatureShowcase() {
    return (
        <section id="features" className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">

                {/* Feature 1: Daily Wizard */}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6">
                            <Zap className="w-4 h-4" />
                            <span>Efficiency First</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            The 2-minute daily ritual your team will actually love.
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            No more 9:00 AM Zoom calls. Your team answers 3 simple prompts when it suits them. We handle the rest.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "What did you complete yesterday?",
                                "What are you working on today?",
                                "Any blockers standing in your way?"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-50 rounded-3xl transform rotate-3 scale-95 opacity-50 -z-10" />
                        <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                            {/* Header Bar */}
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-indigo-600 text-white p-1 rounded-md">
                                        <Zap className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-bold text-slate-900 text-sm">Daily Check-in</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {["Done Today", "Plan", "Submit"].map((step, i) => (
                                        <div key={step} className="flex items-center gap-1.5">
                                            <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <span className={`text-[11px] font-medium ${i === 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{step}</span>
                                            {i < 2 && <div className="w-4 h-px bg-slate-200" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5">
                                {/* Completed Items */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What did you complete today?</p>
                                    <div className="space-y-2">
                                        {[
                                            { text: "Shipped the new onboarding flow", checked: true },
                                            { text: "Reviewed PR #142 — API refactor", checked: true },
                                            { text: "Fixed responsive layout on settings page", checked: true },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 font-medium">{item.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Plan for Tomorrow */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Plan for tomorrow</p>
                                    <div className="space-y-2">
                                        {[
                                            "Integrate analytics dashboard charts",
                                            "Write unit tests for auth module",
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                                <div className="w-4 h-4 rounded-full border-2 border-indigo-300 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 font-medium">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sentiment */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sentiment Check</p>
                                    <p className="text-[11px] text-slate-400 mb-3">How are you feeling about completing your taskload?</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { emoji: "🟢", label: "On Track", selected: true, borderColor: "border-emerald-500", bgColor: "bg-emerald-50" },
                                            { emoji: "🟡", label: "Caution", selected: false, borderColor: "border-slate-100", bgColor: "bg-white" },
                                            { emoji: "🔴", label: "Behind", selected: false, borderColor: "border-slate-100", bgColor: "bg-white" },
                                        ].map((item) => (
                                            <div key={item.label} className={`flex flex-col items-center justify-center p-3.5 rounded-lg border-2 ${item.borderColor} ${item.bgColor} cursor-default`}>
                                                <span className="text-2xl mb-1.5">{item.emoji}</span>
                                                <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6">
                                <div className="bg-indigo-600 text-white text-center py-3 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200 cursor-default">
                                    Next →
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 2: Burnout Detection */}
                <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
                    <div className="order-2 md:order-1 relative">
                        <div className="absolute inset-0 bg-gradient-to-bl from-rose-100 to-orange-50 rounded-3xl transform -rotate-3 scale-95 opacity-50 -z-10" />
                        <div className="relative z-10">
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-w-sm mx-auto">
                                {/* Mobile Navbar */}
                                <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-indigo-600 text-white p-1 rounded-md">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </div>
                                        <span className="font-bold text-slate-900 text-sm">Demo Team</span>
                                    </div>
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                                </div>

                                {/* Team Feed */}
                                <div className="p-3 space-y-3 bg-slate-50/50">
                                    {/* Member 1: Alex Chen — GREEN */}
                                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">A</div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Alex Chen</p>
                                                    <p className="text-[10px] text-slate-400">10:21 AM</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">GREEN</span>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Completed Yesterday</p>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Completed Settings page with dark mode toggle</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Added haptic feedback to all buttons</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Plan for Today</p>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-700 flex items-center gap-1.5"><span className="text-slate-300">•</span> Implement push notification handling</p>
                                                <p className="text-xs text-slate-700 flex items-center gap-1.5"><span className="text-slate-300">•</span> Code review for Android PR</p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-indigo-500 font-medium cursor-default">Edit Report</p>
                                    </div>

                                    {/* Member 2: Casey Kim — BEHIND */}
                                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">C</div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Casey Kim</p>
                                                    <p className="text-[10px] text-slate-400">10:20 AM</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-100">BEHIND</span>
                                        </div>

                                        {/* Blocker Alert */}
                                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Blocker</p>
                                            <p className="text-xs text-rose-600">Found critical crash on Android API 33 when opening feed — blocks release</p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Completed Yesterday</p>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Wrote 8 E2E test cases for login flow</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Found and documented critical Android crash bug</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Floating Badge */}
                            <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce shadow-rose-100/50 z-20">
                                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Risk Detected</p>
                                    <p className="font-bold text-slate-900">High Burnout Risk</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>New Feature</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            Spot burnout before it becomes a resignation.
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Status Loop AI analyzes work patterns, sentiment, and compounding tasks to flag team members who might be pushing too hard or falling behind.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-rose-100 rounded text-rose-600">
                                    <ShieldAlert className="w-4 h-4" />
                                </div>
                                <div>
                                    <strong className="block text-slate-900">Proactive Alerts</strong>
                                    <span className="text-slate-600">Get notified when someone works late consistently.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-amber-100 rounded text-amber-600">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <strong className="block text-slate-900">Sentiment Tracking</strong>
                                    <span className="text-slate-600">Monitor team morale trends over time.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </section>
    )
}

function TrendingUp(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}
