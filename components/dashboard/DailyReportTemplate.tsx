"use client";

import React from "react";
import { DailyReportData } from "@/lib/reporting/aggregator";
import { CheckCircle2, AlertCircle, TrendingUp, Users, Clock, ArrowRight, Sun } from "lucide-react";

interface DailyReportTemplateProps {
    data: DailyReportData;
    teamName: string;
}

export function DailyReportTemplate({ data, teamName }: DailyReportTemplateProps) {
    const totalSentiment = data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red || 1;
    const greenPct = (data.sentimentBreakdown.green / totalSentiment) * 100;
    const yellowPct = (data.sentimentBreakdown.yellow / totalSentiment) * 100;
    const redPct = (data.sentimentBreakdown.red / totalSentiment) * 100;

    const reportedCount = data.participation.filter(p => p.reportedToday).length;
    const totalMembers = data.participation.length;

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
            {/* Header - Matching Weekly's clean style */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                        <Sun className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Daily Roll-Up: {teamName}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                    {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-slate-500">{reportedCount}/{totalMembers} team members reported</span>
                    {reportedCount === totalMembers && totalMembers > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">All In</span>
                    )}
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Team Pulse */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today's Pulse</h2>
                    </div>

                    <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        {greenPct > 0 && <div style={{ width: `${greenPct}%` }} className="bg-emerald-500 h-full transition-all" />}
                        {yellowPct > 0 && <div style={{ width: `${yellowPct}%` }} className="bg-amber-400 h-full transition-all" />}
                        {redPct > 0 && <div style={{ width: `${redPct}%` }} className="bg-red-500 h-full transition-all" />}
                    </div>
                    <div className="flex justify-between text-sm mt-2 text-slate-500">
                        <span>{data.sentimentBreakdown.green} Positive</span>
                        <span>{data.sentimentBreakdown.yellow} Neutral</span>
                        <span>{data.sentimentBreakdown.red} Struggling</span>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Working On Today - Priority section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">In Progress</h2>
                        </div>
                        {data.workingOnToday.length === 0 ? (
                            <p className="text-slate-500 italic">No tasks in progress.</p>
                        ) : (
                            <ul className="space-y-3">
                                {data.workingOnToday.map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm">
                                        <span className="font-medium text-slate-900 dark:text-slate-200 shrink-0">{item.user}:</span>
                                        <span className="text-slate-600 dark:text-slate-400">{item.content}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Completed Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Completed</h2>
                        </div>
                        {data.completedToday.length === 0 && data.completedYesterday.length === 0 ? (
                            <p className="text-slate-500 italic">No items completed yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {data.completedToday.map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm">
                                        <span className="font-medium text-slate-900 dark:text-slate-200 shrink-0">{item.user}:</span>
                                        <span className="text-slate-600 dark:text-slate-400">{item.content}</span>
                                    </li>
                                ))}
                                {data.completedYesterday.map((item, idx) => (
                                    <li key={`y-${idx}`} className="flex gap-3 text-sm opacity-70">
                                        <span className="font-medium text-slate-900 dark:text-slate-200 shrink-0">{item.user}:</span>
                                        <span className="text-slate-600 dark:text-slate-400">{item.content}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* Blockers - Only show if there are any */}
                {data.blockers.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Blockers & Risks</h2>
                        </div>
                        <ul className="space-y-3">
                            {data.blockers.map((item, idx) => (
                                <li key={idx} className="flex gap-3 text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/50">
                                    <span className="font-medium text-red-900 dark:text-red-200 shrink-0">{item.user}:</span>
                                    <span className="text-red-700 dark:text-red-300">{item.content}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Planned for Tomorrow */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowRight className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Up Next</h2>
                    </div>
                    {data.workingOnTomorrow.length === 0 ? (
                        <p className="text-slate-500 italic">No plans recorded.</p>
                    ) : (
                        <ul className="space-y-3">
                            {data.workingOnTomorrow.map((item, idx) => (
                                <li key={idx} className="flex gap-3 text-sm">
                                    <span className="font-medium text-slate-900 dark:text-slate-200 shrink-0">{item.user}:</span>
                                    <span className="text-slate-600 dark:text-slate-400">{item.content}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Participation */}
                <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Participation</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.participation.map((p, idx) => (
                            <div
                                key={idx}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${p.reportedToday
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                            >
                                {p.user}
                                {p.reportedToday ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                    <span className="text-[10px] opacity-70">pending</span>
                                )}
                            </div>
                        ))}
                        {data.participation.length === 0 && <p className="text-slate-500 text-sm">No team members found.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
