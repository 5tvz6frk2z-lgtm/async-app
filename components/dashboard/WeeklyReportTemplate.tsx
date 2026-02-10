
import React from "react";
import { WeeklyReportData } from "@/lib/reporting/aggregator";
import { CheckCircle2, AlertCircle, TrendingUp, Users } from "lucide-react";

interface WeeklyReportTemplateProps {
    data: WeeklyReportData;
    teamName: string;
}

export function WeeklyReportTemplate({ data, teamName }: WeeklyReportTemplateProps) {
    const totalSentiment = data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red || 1;
    const greenPct = (data.sentimentBreakdown.green / totalSentiment) * 100;
    const yellowPct = (data.sentimentBreakdown.yellow / totalSentiment) * 100;
    const redPct = (data.sentimentBreakdown.red / totalSentiment) * 100;

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Weekly Roll-Up: {teamName}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {data.startDate} — {data.endDate}
                </p>
            </div>

            <div className="p-8 space-y-8">
                {/* Pulse Check */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Pulse</h2>
                    </div>

                    <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        {greenPct > 0 && <div style={{ width: `${greenPct}%` }} className="bg-emerald-500 h-full" />}
                        {yellowPct > 0 && <div style={{ width: `${yellowPct}%` }} className="bg-amber-400 h-full" />}
                        {redPct > 0 && <div style={{ width: `${redPct}%` }} className="bg-red-500 h-full" />}
                    </div>
                    <div className="flex justify-between text-sm mt-2 text-slate-500">
                        <span>{data.sentimentBreakdown.green} Positive</span>
                        <span>{data.sentimentBreakdown.yellow} Neutral</span>
                        <span>{data.sentimentBreakdown.red} Struggling</span>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Highlights */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Key Highlights</h2>
                        </div>
                        {data.highlights.length === 0 ? (
                            <p className="text-slate-500 italic">No highlights recorded this week.</p>
                        ) : (
                            <ul className="space-y-3">
                                {data.highlights.map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm">
                                        <span className="font-medium text-slate-900 dark:text-slate-200 shrink-0">{item.user}:</span>
                                        <span className="text-slate-600 dark:text-slate-400">{item.content}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

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
                </div>

                {/* Participation */}
                <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Participation</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.participation.map((p, idx) => (
                            <div key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                {p.user}
                                <span className="bg-slate-200 dark:bg-slate-700 px-1.5 rounded-full text-[10px]">{p.count}</span>
                            </div>
                        ))}
                        {data.participation.length === 0 && <p className="text-slate-500 text-sm">No reports submitted.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
