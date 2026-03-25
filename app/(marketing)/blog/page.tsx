
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

                {/* Blog Grid */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Article: What is Async Work? */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[240px] flex flex-col gap-2">
                                <div className="bg-white rounded-md shadow-sm border border-slate-200 p-2 flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                        <span className="font-semibold text-slate-600">9:30 AM - Deep Work</span>
                                    </div>
                                    <span className="text-indigo-500 font-bold">In Flow 🧠</span>
                                </div>
                                <div className="bg-white rounded-md shadow-sm border border-slate-200 p-2 flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <span className="font-semibold text-slate-600">3:00 PM - PR Reviewed</span>
                                    </div>
                                    <span className="text-slate-400">Output ✅</span>
                                </div>
                                <div className="bg-white rounded-md shadow-sm border border-slate-200 p-2 flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                        <span className="font-semibold text-slate-600">5:00 PM - EOD Report</span>
                                    </div>
                                    <span className="text-slate-400">Async 🚀</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Async Fundamentals
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/what-is-async-work" className="hover:text-indigo-600 transition-colors">
                                    What is Async Work? A Complete Beginner&apos;s Guide
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Escape the &quot;always-on&quot; mentality. Learn how asynchronous work reclaims your deep time and transforms chaotic offices into focused environments.
                            </p>
                            <Link
                                href="/blog/what-is-async-work"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: W-P1 What is Asynchronous Communication */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="flex items-stretch gap-3 w-full max-w-[220px]">
                                <div className="flex-1 bg-white rounded-lg border border-rose-200 p-2.5 text-[10px]">
                                    <div className="font-bold text-rose-500 mb-1.5">🔴 Sync</div>
                                    <div className="text-slate-500 space-y-1">
                                        <div>15 min meeting</div>
                                        <div>45 min recovery</div>
                                        <div className="font-bold text-rose-500">= 60 min lost</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-slate-400 font-bold">→</div>
                                <div className="flex-1 bg-white rounded-lg border border-indigo-200 p-2.5 text-[10px]">
                                    <div className="font-bold text-indigo-500 mb-1.5">🟢 Async</div>
                                    <div className="text-slate-500 space-y-1">
                                        <div>2 min update</div>
                                        <div>Back to work</div>
                                        <div className="font-bold text-emerald-500">= 30x faster</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Async Fundamentals
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/what-is-asynchronous-communication" className="hover:text-indigo-600 transition-colors">
                                    What is Asynchronous Communication? A Plain-English Guide
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Learn what asynchronous communication is, how it compares to synchronous alternatives, and how managers use it to reclaim 60 minutes per team member every day.
                            </p>
                            <Link
                                href="/blog/what-is-asynchronous-communication"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: W-P8 What is an EOD Report */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px] transform -rotate-1">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">✓</div>
                                    <span className="font-bold text-slate-800">Daily EOD Report</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5"><span className="text-green-500">●</span><span className="text-slate-600">Shipped auth module</span></div>
                                    <div className="flex items-center gap-1.5"><span className="text-amber-500">●</span><span className="text-slate-600">API review pending</span></div>
                                    <div className="flex items-center gap-1.5"><span className="text-red-400">●</span><span className="text-slate-600">Blocked: design assets</span></div>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">Submitted 4:58 PM</div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Async Fundamentals
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/what-is-an-eod-report" className="hover:text-indigo-600 transition-colors">
                                    What is an EOD Report? (And Why Every Team Needs One)
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                The frustration of ending the workday without knowing what your team actually accomplished is a universal experience for managers. Discover how the simple EOD Report is replacing synchronous check-ins.
                            </p>
                            <Link
                                href="/blog/what-is-an-eod-report"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

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
                                It’s the digital equivalent of &quot;punching out.&quot; Learn why this simple 3-minute habit decreases anxiety and increases trust.
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
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[240px] flex flex-col items-center">
                                <div className="bg-indigo-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-md shadow-sm mb-2 z-10 relative">
                                    Is the issue urgent?
                                </div>
                                <div className="flex w-full justify-center gap-8 relative mt-1">
                                    {/* Connection Lines */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150%] w-24 h-px border-t border-dashed border-slate-300 -z-0"></div>
                                    <div className="absolute top-1/2 left-[calc(50%-3rem)] -translate-x-[50%] -translate-y-full w-px h-3 bg-slate-300"></div>
                                    <div className="absolute top-1/2 right-[calc(50%-3rem)] translate-x-[50%] -translate-y-full w-px h-3 bg-slate-300"></div>
                                    
                                    <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm z-10 w-24">
                                        <span className="text-[10px] font-bold text-rose-500 w-full text-center pb-1 border-b border-rose-100 uppercase">Yes</span>
                                        <span className="text-[10px] text-slate-600 mt-1">Sync Call 🔴</span>
                                    </div>
                                    
                                    <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm z-10 w-24">
                                        <span className="text-[10px] font-bold text-emerald-500 w-full text-center pb-1 border-b border-emerald-100 uppercase">No</span>
                                        <span className="text-[10px] text-slate-600 mt-1">Async Msg 🟢</span>
                                    </div>
                                </div>
                            </div>
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

                    {/* Article: Replace Daily Standups */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-rose-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="flex items-center gap-3">
                                <div className="bg-white rounded-lg shadow-sm border border-rose-200 p-2.5 text-[10px] opacity-60 transform -rotate-2">
                                    <div className="font-bold text-rose-600 mb-1">9:00 AM Standup</div>
                                    <div className="text-slate-400 line-through">10 people · 30 min</div>
                                    <div className="text-rose-400 font-bold mt-1">✕ Cancelled</div>
                                </div>
                                <div className="text-xl text-indigo-400 font-bold">→</div>
                                <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-2.5 text-[10px] transform rotate-1">
                                    <div className="font-bold text-indigo-600 mb-1">Async Check-in</div>
                                    <div className="text-slate-500">Submit by 10 AM</div>
                                    <div className="text-green-500 font-bold mt-1">✓ 8/8 done</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Strategy
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/replace-daily-standups" className="hover:text-indigo-600 transition-colors">
                                    How to Replace Daily Standups with Async Updates
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                A practical playbook for eliminating your morning standup without losing visibility or accountability.
                            </p>
                            <Link
                                href="/blog/replace-daily-standups"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: The Art of the Weekly Status Report */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-slate-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="font-bold text-slate-800 mb-2">Weekly Status Report</div>
                                <div className="flex items-end gap-1 h-14 mb-2">
                                    <div className="w-5 bg-emerald-200 rounded-t" style={{ height: '45%' }}></div>
                                    <div className="w-5 bg-emerald-300 rounded-t" style={{ height: '60%' }}></div>
                                    <div className="w-5 bg-emerald-400 rounded-t" style={{ height: '50%' }}></div>
                                    <div className="w-5 bg-emerald-500 rounded-t" style={{ height: '75%' }}></div>
                                    <div className="w-5 bg-indigo-500 rounded-t" style={{ height: '90%' }}></div>
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                    <span className="text-slate-500">Velocity: On Track</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Reporting
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/the-art-of-the-weekly-status-report" className="hover:text-indigo-600 transition-colors">
                                    The Art of the Weekly Status Report
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Weekly reports are the connective tissue between daily tasks and quarterly goals. Learn how to write one that leaders actually read.
                            </p>
                            <Link
                                href="/blog/the-art-of-the-weekly-status-report"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: Cancel Your Status Meetings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800">This Week&apos;s Meetings</span>
                                    <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">-80%</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2"><span className="text-rose-400 text-xs">✕</span><span className="text-slate-400 line-through">Mon Standup</span><span className="text-green-600">→ Async</span></div>
                                    <div className="flex items-center gap-2"><span className="text-rose-400 text-xs">✕</span><span className="text-slate-400 line-through">Wed Status Sync</span><span className="text-green-600">→ Async</span></div>
                                    <div className="flex items-center gap-2"><span className="text-rose-400 text-xs">✕</span><span className="text-slate-400 line-through">Fri Review</span><span className="text-green-600">→ Report</span></div>
                                    <div className="flex items-center gap-2"><span className="text-indigo-500 text-xs">✓</span><span className="text-slate-700 font-medium">Thu 1:1 Coaching</span></div>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-emerald-600 font-medium">12 hrs/week reclaimed</div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Productivity
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/cancel-your-status-meetings" className="hover:text-indigo-600 transition-colors">
                                    Why You Should Cancel Your Status Meetings
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Status meetings are the single biggest waste of engineering time. Here&apos;s how to replace them with something better.
                            </p>
                            <Link
                                href="/blog/cancel-your-status-meetings"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: Managing Remote Teams Asynchronously */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="font-bold text-slate-800 mb-2">Team Activity — Global</div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between"><span className="text-slate-600">🇺🇸 Sarah K.</span><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8px]">Online</span></div>
                                    <div className="flex items-center justify-between"><span className="text-slate-600">🇬🇧 James R.</span><span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px]">EOD sent</span></div>
                                    <div className="flex items-center justify-between"><span className="text-slate-600">🇦🇺 Aisha P.</span><span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px]">Offline</span></div>
                                    <div className="flex items-center justify-between"><span className="text-slate-600">🇯🇵 Yuki T.</span><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px]">Deep Work</span></div>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">Follow-the-sun coverage: 24h</div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Remote Work
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/managing-remote-teams-asynchronously" className="hover:text-indigo-600 transition-colors">
                                    Managing Remote Teams Asynchronously: Best Practices 101
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                The definitive guide to managing distributed teams without relying on synchronous meetings.
                            </p>
                            <Link
                                href="/blog/managing-remote-teams-asynchronously"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: The Manager's Guide to Asynchronous Leadership */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-violet-50 to-slate-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="font-bold text-slate-800 mb-2">Executive Rollup — AI Summary</div>
                                <div className="bg-violet-50 rounded p-2 mb-2 text-[9px] text-violet-800">
                                    <span className="font-bold">✨ Key Insight:</span> Team velocity ↑ 18% this sprint. One blocker flagged on Platform team.
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-slate-600">3 major wins shipped</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-slate-600">1 active blocker</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400"></span><span className="text-slate-600">Team morale: High</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Leadership
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/the-managers-guide-to-asynchronous-leadership" className="hover:text-indigo-600 transition-colors">
                                    The Manager&apos;s Guide to Asynchronous Leadership
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                How to lead effectively when you can&apos;t tap someone on the shoulder. A framework for async-first management.
                            </p>
                            <Link
                                href="/blog/the-managers-guide-to-asynchronous-leadership"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: Reducing Zoom Fatigue */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-amber-50 to-rose-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="font-bold text-slate-800 mb-2">Meeting Load This Week</div>
                                <div className="space-y-1.5 mb-2">
                                    <div className="flex items-center gap-2"><span className="text-slate-500 w-8">Mon</span><div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-rose-400 h-2.5 rounded-full" style={{ width: '85%' }}></div></div></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 w-8">Tue</span><div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-rose-300 h-2.5 rounded-full" style={{ width: '70%' }}></div></div></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 w-8">Wed</span><div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-amber-300 h-2.5 rounded-full" style={{ width: '45%' }}></div></div></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 w-8">Thu</span><div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: '20%' }}></div></div></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 w-8">Fri</span><div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: '10%' }}></div></div></div>
                                </div>
                                <div className="text-[9px] text-emerald-600 font-medium">↓ 60% fewer video calls with async</div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Wellbeing
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/reducing-zoom-fatigue-with-written-updates" className="hover:text-indigo-600 transition-colors">
                                    Reducing Zoom & Teams Fatigue with Written Updates
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Video call burnout is real. Learn how async written updates protect your team&apos;s energy and focus.
                            </p>
                            <Link
                                href="/blog/reducing-zoom-fatigue-with-written-updates"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: How to Write a Project Status Report */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-sky-50 to-slate-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800">Project Alpha</span>
                                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-bold">ON TRACK</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div><div className="flex justify-between mb-0.5"><span className="text-slate-500">Backend</span><span className="text-slate-500">92%</span></div><div className="bg-slate-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '92%' }}></div></div></div>
                                    <div><div className="flex justify-between mb-0.5"><span className="text-slate-500">Frontend</span><span className="text-slate-500">78%</span></div><div className="bg-slate-100 rounded-full h-1.5"><div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: '78%' }}></div></div></div>
                                    <div><div className="flex justify-between mb-0.5"><span className="text-slate-500">QA</span><span className="text-slate-500">45%</span></div><div className="bg-slate-100 rounded-full h-1.5"><div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '45%' }}></div></div></div>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">Ship date: March 28</div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Project Management
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/how-to-write-a-project-status-report" className="hover:text-indigo-600 transition-colors">
                                    How to Write a Project Status Report That Stakeholders Actually Read
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Most status reports get ignored. Learn how to write one that communicates project health clearly and efficiently.
                            </p>
                            <Link
                                href="/blog/how-to-write-a-project-status-report"
                                className="inline-flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                            >
                                Read Guide →
                            </Link>
                        </div>
                    </div>

                    {/* Article: EOM Reporting */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                        <div className="relative h-48 w-full border-b border-slate-100 bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center p-4 overflow-hidden">
                            <div className="w-full max-w-[220px] bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-[10px]">
                                <div className="font-bold text-slate-800 mb-2">March EOM Report</div>
                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                    <div className="bg-teal-50 rounded p-1.5 text-center"><div className="text-sm font-bold text-teal-700">94%</div><div className="text-[8px] text-teal-600">OKR Hit</div></div>
                                    <div className="bg-blue-50 rounded p-1.5 text-center"><div className="text-sm font-bold text-blue-700">↑12%</div><div className="text-[8px] text-blue-600">Velocity</div></div>
                                    <div className="bg-emerald-50 rounded p-1.5 text-center"><div className="text-sm font-bold text-emerald-700">4.2</div><div className="text-[8px] text-emerald-600">Morale</div></div>
                                </div>
                                <div className="text-[9px] text-slate-500">Strategic alignment: <span className="text-green-600 font-bold">Strong</span></div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-indigo-600 font-semibold text-xs uppercase tracking-wide mb-2">
                                Strategy
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 flex-1">
                                <Link href="/blog/eom-reporting-strategic-alignment" className="hover:text-indigo-600 transition-colors">
                                    EOM (End of Month) Reporting: Strategic Alignment for Teams
                                </Link>
                            </h3>
                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">
                                Monthly reports are where daily execution meets strategic direction. Learn how to build EOM reports that drive alignment.
                            </p>
                            <Link
                                href="/blog/eom-reporting-strategic-alignment"
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
