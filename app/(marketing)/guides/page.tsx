"use client"

import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"

const guides = [
    {
        title: "The Ultimate Guide to Async Reporting",
        description: "Everything you need to know about replacing meetings with async updates.",
        href: "/blog/ultimate-guide-to-async-reporting",
        tag: "Fundamentals",
    },
    {
        title: "Mastering the End of Day Report",
        description: "How to write EOD reports that actually help your team and your manager.",
        href: "/blog/mastering-end-of-day-report",
        tag: "Daily Reports",
    },
    {
        title: "Mastering the End of Week Report",
        description: "Turn Friday check-ins into strategic summaries that drive Monday action.",
        href: "/blog/mastering-end-of-week-report",
        tag: "Weekly Reports",
    },
    {
        title: "Async vs. Sync Communication",
        description: "When to use async updates vs. real-time conversation — and how to get the balance right.",
        href: "/blog/async-vs-sync-communication",
        tag: "Strategy",
    },
]

export default function GuidesPage() {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Guides</h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Step-by-step tutorials on getting the most out of Status Loop and async workflows.
                    </p>
                </div>
            </section>

            {/* Guide Cards */}
            <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    {guides.map((guide) => (
                        <Link key={guide.href} href={guide.href} className="block group">
                            <div className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{guide.tag}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                                        {guide.title}
                                    </h3>
                                    <p className="text-slate-600 text-sm">{guide.description}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-1 flex-shrink-0" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
