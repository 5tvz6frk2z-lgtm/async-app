"use client"

export function DashboardPreview() {
    return (
        <section className="py-24 bg-white border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-3">
                        See it in action
                    </h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        Your team&apos;s command center.
                    </h3>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Everything you need to know about your team — participation, sentiment, blockers, and AI-powered insights — in one clean dashboard.
                    </p>
                </div>

                <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">

                    {/* App Navbar */}
                    <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-600 text-white p-1 rounded-md">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                                <span className="font-bold text-slate-900 text-sm">Status Loop</span>
                            </div>
                            <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
                                Demo Team
                                <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
                            <span className="text-indigo-600 border-b-2 border-indigo-600 pb-3 -mb-3">Reports</span>
                            <span>Team</span>
                            <span>Settings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">SJ</div>
                            <span className="hidden md:inline text-xs font-medium text-slate-700">Sarah Jenkins</span>
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 text-left">Daily Standup</h2>
                                <p className="text-xs text-slate-500 text-left">Live feed of today&apos;s updates</p>
                            </div>
                            <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-[11px] font-medium">
                                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md">Feed</span>
                                <span className="px-3 py-1.5 text-slate-500">Team</span>
                                <span className="px-3 py-1.5 text-slate-500">Daily</span>
                                <span className="px-3 py-1.5 text-slate-500">Weekly</span>
                            </div>
                        </div>

                        {/* AI Briefing Card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-slate-900">AI Morning Briefing</p>
                                    <p className="text-xs text-slate-500">Generate a concise summary of your team&apos;s latest updates.</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-default whitespace-nowrap">
                                Generate Briefing
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Participation</p>
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">80%<span className="text-sm font-normal text-slate-500 ml-1">rate</span></p>
                                <p className="text-[11px] text-slate-400 mt-0.5">4/5 members reported</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Team Pulse</p>
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">High</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Based on today&apos;s reports</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Blockers</p>
                                    <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">1<span className="text-sm font-normal text-slate-500 ml-1">issue</span></p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Needing attention</p>
                            </div>
                        </div>

                        {/* Team Feed Preview */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-900">Team Activity</p>
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md font-medium">Generate Daily Roll-up</span>
                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md font-medium border border-slate-200">Generate Weekly Roll-up</span>
                                </div>
                            </div>
                            {[
                                { initials: "AC", name: "Alex Chen", status: "GREEN", task: "Completed Settings page with dark mode toggle", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                                { initials: "CK", name: "Casey Kim", status: "BEHIND", task: "Found critical crash on Android API 33 — blocks release", color: "bg-rose-50 text-rose-700 border-rose-100" },
                            ].map((member) => (
                                <div key={member.initials} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3 last:border-b-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">{member.initials}</div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${member.color}`}>{member.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{member.task}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
