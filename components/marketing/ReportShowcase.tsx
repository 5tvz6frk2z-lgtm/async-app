"use client"

import { Mail, Calendar, TrendingUp, ArrowRight } from "lucide-react"

export function ReportShowcase() {
    return (
        <section className="py-24 bg-slate-50 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-3">
                        Automated reporting
                    </h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                        Standups delivered, not chased.
                    </h3>
                    <p className="text-lg text-slate-600">
                        Forget small talk on Jira, Teams, and Slack. We consolidate your team's updates into clean, actionable summaries delivered right to your inbox.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Daily Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group hover:border-indigo-100 transition-colors">
                        <div className="p-8 pb-0">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">Daily Digest</h4>
                                    <p className="text-slate-500 text-sm">Every morning at 9:00 AM</p>
                                </div>
                            </div>
                            Wake up to a consolidated view of yesterday's progress and today's blockers. Know exactly where your team stands before you sip your coffee.
                        </div>
                        {/* Mockup Bottom */}
                        <div className="bg-slate-50 border-t border-slate-100 p-6 pt-8">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-sm space-y-3 opacity-90 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="font-semibold text-slate-800">Tue, Oct 24</span>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">All Clear</span>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">JB</div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">John Byrne</p>
                                        <p className="text-slate-500 line-clamp-1">✅ Shipped the new login flow</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">AS</div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">Alice Smith</p>
                                        <p className="text-slate-500 line-clamp-1">🚧 Blocked on design assets</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group hover:border-indigo-100 transition-colors">
                        <div className="p-8 pb-0">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">Weekly Roll-up</h4>
                                    <p className="text-slate-500 text-sm">Every Friday at 5:00 PM</p>
                                </div>
                            </div>
                            End the week with a high-level view. Spot trends in team sentiment and track velocity without disrupting flow.
                        </div>
                        {/* Mockup Bottom */}
                        <div className="bg-slate-50 border-t border-slate-100 p-6 pt-8">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-sm space-y-4 opacity-90 group-hover:opacity-100 transition-opacity">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-500 uppercase">Team Sentiment</p>
                                    <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                                        <div className="w-[70%] bg-emerald-400"></div>
                                        <div className="w-[20%] bg-amber-400"></div>
                                        <div className="w-[10%] bg-rose-400"></div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-1">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-slate-900">42</p>
                                        <p className="text-[10px] text-slate-500">TASKS DONE</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-slate-900">3</p>
                                        <p className="text-[10px] text-slate-500">BLOCKERS</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
