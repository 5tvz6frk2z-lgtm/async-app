"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

const resources = [
    {
        tag: "Guide",
        tagColor: "text-indigo-600",
        title: "The Ultimate Guide to Async Reporting",
        description: "Everything you need to know about replacing meetings with async updates — the philosophy, the framework, and the tools.",
        href: "/blog/ultimate-guide-to-async-reporting",
    },
    {
        tag: "Guide",
        tagColor: "text-indigo-600",
        title: "Mastering the End of Day Report",
        description: "How to write EOD reports that actually help your team and your manager — with templates and examples.",
        href: "/blog/mastering-end-of-day-report",
    },
    {
        tag: "Guide",
        tagColor: "text-indigo-600",
        title: "Mastering the End of Week Report",
        description: "Turn Friday check-ins into strategic summaries that drive Monday action.",
        href: "/blog/mastering-end-of-week-report",
    },
    {
        tag: "Strategy",
        tagColor: "text-purple-600",
        title: "Async vs. Sync Communication",
        description: "When to use async updates vs. real-time conversation — and how to get the balance right for your team.",
        href: "/blog/async-vs-sync-communication",
    },
    {
        tag: "Case Study",
        tagColor: "text-emerald-600",
        title: "How The Local Landscaper Saved 3+ Hours a Day",
        description: "CEO Caleb Reid replaced a morning of chaotic check-in calls with a 10-minute async workflow.",
        href: "/case-studies/the-local-landscaper",
    },
]

export default function ResourcesPage() {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Resources</h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Guides, case studies, and best practices for running async-first teams.
                    </p>
                </div>
            </section>

            {/* Resource Cards */}
            <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {resources.map((resource) => (
                        <Link key={resource.href} href={resource.href} className="group">
                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all h-full flex flex-col">
                                <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                                    <span className="text-5xl opacity-30">📄</span>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <span className={`text-xs font-semibold ${resource.tagColor} uppercase tracking-wide`}>
                                        {resource.tag}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                        {resource.title}
                                    </h3>
                                    <p className="text-slate-600 text-sm line-clamp-3 flex-1">
                                        {resource.description}
                                    </p>
                                    <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4">
                                        Read more <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
