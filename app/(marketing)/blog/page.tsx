
"use client"
import Link from 'next/link'
import Image from 'next/image'

export default function BlogPage() {
    return (
        <div className="py-24 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-16">
                    <span className="text-4xl mb-4 block">✍️</span>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Status Loop Blog</h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Thoughts on remote work, async culture, and engineering productivity.
                    </p>
                </div>

                {/* Featured Post */}
                <div className="grid gap-10 lg:grid-cols-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="relative h-64 lg:h-auto min-h-[300px] w-full">
                        <Image
                            src="/images/blog/sync-vs-async-reporting.png"
                            alt="Async Reporting Guide"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="text-indigo-600 font-semibold text-sm uppercase tracking-wide mb-2">
                            Pillar Guide
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">
                            <Link href="/blog/ultimate-guide-to-async-reporting" className="hover:text-indigo-600 transition-colors">
                                The Ultimate Guide to Async Reporting for Remote Teams
                            </Link>
                        </h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Sick of status meetings? Master async reporting to reclaim deep work, boost transparency, and help your remote team thrive.
                        </p>
                        <Link
                            href="/blog/ultimate-guide-to-async-reporting"
                            className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 group"
                        >
                            Read Article
                            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>
                </div>

                {/* Grid for future posts */}
                <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full">
                            <Image
                                src="/images/blog/eod-report-template.png"
                                alt="EOD Report Template"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Remote Habits
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/mastering-end-of-day-report" className="hover:text-indigo-600 transition-colors">
                                    Mastering the End of Day (EOD) Report
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                It’s the digital equivalent of "punching out." Learn why this simple 3-minute habit decreases anxiety and increases trust.
                            </p>
                            <Link
                                href="/blog/mastering-end-of-day-report"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full">
                            <Image
                                src="/images/blog/eow_report_structure_template.png"
                                alt="EOW Report Structure"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Management
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/mastering-end-of-week-report" className="hover:text-indigo-600 transition-colors">
                                    Mastering the End of Week (EOW) Report
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Weekly synthesis is the bridge between daily tasks and quarterly goals. Learn how to lead with clarity.
                            </p>
                            <Link
                                href="/blog/mastering-end-of-week-report"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full">
                            <Image
                                src="/images/blog/async_vs_sync_decision_tree.png"
                                alt="Async vs Sync Communication Decision Framework"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Communication Strategy
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/async-vs-sync-communication" className="hover:text-indigo-600 transition-colors">
                                    Async vs. Sync Communication: Breaking Down the Differences
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Discover how async communication boosts developer productivity by 28% and learn when to use each mode.
                            </p>
                            <Link
                                href="/blog/async-vs-sync-communication"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
