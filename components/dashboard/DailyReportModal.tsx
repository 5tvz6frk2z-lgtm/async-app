"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Sun, TrendingUp, CheckCircle2, Clock, ArrowRight, AlertCircle, Users, Focus } from "lucide-react"
import { useSettings } from "@/components/providers/SettingsProvider"
import { getLatestDailyReport } from "@/app/(app)/dashboard/actions"
import { DailyReportData } from "@/lib/reporting/aggregator"

export function DailyReportModal() {
    const { teamId } = useSettings()
    const [data, setData] = useState<DailyReportData | null>(null)
    const [teamName, setTeamName] = useState("")
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!open || !teamId) return
        setLoading(true)
        getLatestDailyReport(teamId)
            .then(res => {
                setData(res.data)
                setTeamName(res.teamName)
            })
            .catch(err => {
                console.error("Failed to load daily report:", err)
            })
            .finally(() => setLoading(false))
    }, [open, teamId])

    const handleExportPDF = () => {
        const printWindow = window.open('', '_blank')
        if (!printWindow || !data) return

        const html = generateDailyReportHtml(data, teamName)
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.onload = () => {
            printWindow.print()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                    <Sun className="w-4 h-4 mr-2" />
                    Generate Daily Roll-up
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 p-0 overflow-hidden gap-0">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Daily Team Roll-up</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                            Summary for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-zinc-400" />
                    </div>
                ) : data ? (
                    <>
                        <ScrollArea className="h-[500px] p-6">
                            <div className="space-y-8">
                                {/* Pulse Check */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5 text-zinc-500" />
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Team Pulse</h2>
                                    </div>
                                    <div className="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                                        {data.sentimentBreakdown.green > 0 && (
                                            <div style={{ width: `${(data.sentimentBreakdown.green / Math.max(1, data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red)) * 100}%` }} className="bg-emerald-500 h-full" />
                                        )}
                                        {data.sentimentBreakdown.yellow > 0 && (
                                            <div style={{ width: `${(data.sentimentBreakdown.yellow / Math.max(1, data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red)) * 100}%` }} className="bg-amber-400 h-full" />
                                        )}
                                        {data.sentimentBreakdown.red > 0 && (
                                            <div style={{ width: `${(data.sentimentBreakdown.red / Math.max(1, data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red)) * 100}%` }} className="bg-red-500 h-full" />
                                        )}
                                    </div>
                                    <div className="flex justify-between text-sm mt-2 text-zinc-500">
                                        <span>{data.sentimentBreakdown.green} Positive</span>
                                        <span>{data.sentimentBreakdown.yellow} Neutral</span>
                                        <span>{data.sentimentBreakdown.red} Struggling</span>
                                    </div>
                                </section>

                                {/* Priority Section: Working On Today */}
                                <section className="ring-1 ring-indigo-100 dark:ring-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Working On Today</h2>
                                    </div>
                                    {data.workingOnToday.length === 0 ? (
                                        <p className="text-zinc-500 italic text-sm">No active work items recorded.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {data.workingOnToday.map((item, idx) => (
                                                <li key={idx} className="flex gap-3 text-sm">
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 shrink-0 min-w-[80px]">{item.user}</span>
                                                    <span className="text-zinc-700 dark:text-zinc-300">{item.content}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                {/* Blockers (High Priority to see) */}
                                {data.blockers.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Blockers & Risks</h2>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Completed Section (Secondary) */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Completed</h2>
                                        </div>
                                        <div className="space-y-6">
                                            {data.completedToday.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs uppercase font-medium text-zinc-500 mb-2">Today</h3>
                                                    <ul className="space-y-2">
                                                        {data.completedToday.map((item, idx) => (
                                                            <li key={idx} className="flex gap-2 text-sm">
                                                                <span className="font-medium text-zinc-900 dark:text-zinc-200 shrink-0">{item.user}:</span>
                                                                <span className="text-zinc-600 dark:text-zinc-400">{item.content}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {data.completedYesterday.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs uppercase font-medium text-zinc-500 mb-2">Yesterday</h3>
                                                    <ul className="space-y-2">
                                                        {data.completedYesterday.map((item, idx) => (
                                                            <li key={idx} className="flex gap-2 text-sm">
                                                                <span className="font-medium text-zinc-900 dark:text-zinc-200 shrink-0">{item.user}:</span>
                                                                <span className="text-zinc-600 dark:text-zinc-400">{item.content}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {data.completedYesterday.length === 0 && data.completedToday.length === 0 && (
                                                <p className="text-zinc-500 italic text-sm">No items completed yet.</p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Planned for Tomorrow */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <ArrowRight className="w-5 h-5 text-purple-500" />
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">For Tomorrow</h2>
                                        </div>
                                        {data.workingOnTomorrow.length === 0 ? (
                                            <p className="text-zinc-500 italic text-sm">No plans for tomorrow recorded.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {data.workingOnTomorrow.map((item, idx) => (
                                                    <li key={idx} className="flex gap-2 text-sm">
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-200 shrink-0">{item.user}:</span>
                                                        <span className="text-zinc-600 dark:text-zinc-400">{item.content}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                </div>

                                {/* Participation */}
                                <section className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Participation</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {data.participation.map((p, idx) => (
                                            <div key={idx} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                                {p.user}
                                                {p.reportedToday ? (
                                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-1.5 rounded-full text-[10px]">✓</span>
                                                ) : (
                                                    <span className="bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full text-[10px] text-zinc-500">pending</span>
                                                )}
                                            </div>
                                        ))}
                                        {data.participation.length === 0 && <p className="text-zinc-500 text-sm">No reports submitted.</p>}
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>

                        <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            <Button variant="outline" onClick={handleExportPDF}>Export as PDF</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Share with Stakeholders</Button>
                        </div>
                    </>
                ) : (
                    <div className="p-10 text-center text-zinc-500">No report data available.</div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function generateDailyReportHtml(data: DailyReportData, teamName: string): string {
    const escape = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    const totalSentiment = data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red || 1;
    const greenPct = (data.sentimentBreakdown.green / totalSentiment) * 100;
    const yellowPct = (data.sentimentBreakdown.yellow / totalSentiment) * 100;
    const redPct = (data.sentimentBreakdown.red / totalSentiment) * 100;

    const pulseBar = `
        <div style="display: flex; height: 16px; border-radius: 9999px; overflow: hidden; background-color: #f4f4f5; width: 100%;">
            ${greenPct > 0 ? `<div style="width: ${greenPct}%; background-color: #10b981;"></div>` : ''}
            ${yellowPct > 0 ? `<div style="width: ${yellowPct}%; background-color: #fbbf24;"></div>` : ''}
            ${redPct > 0 ? `<div style="width: ${redPct}%; background-color: #ef4444;"></div>` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #71717a; margin-top: 8px;">
            <span>${data.sentimentBreakdown.green} Positive</span>
            <span>${data.sentimentBreakdown.yellow} Neutral</span>
            <span>${data.sentimentBreakdown.red} Struggling</span>
        </div>
    `;

    const completedList = (items: { user: string, content: string }[]) => items.length === 0
        ? `<p style="font-style: italic; color: #71717a;">No items recorded.</p>`
        : `<ul style="padding-left: 0; list-style: none;">
            ${items.map(item => `
            <li style="margin-bottom: 8px; font-size: 14px;">
                <span style="font-weight: 500; color: #18181b;">${escape(item.user)}:</span>
                <span style="color: #52525b;">${escape(item.content)}</span>
            </li>
            `).join('')}
        </ul>`;

    const workingOnTodayList = data.workingOnToday.length === 0
        ? `<p style="font-style: italic; color: #71717a;">No active work items recorded.</p>`
        : `<ul style="padding-left: 0; list-style: none;">
            ${data.workingOnToday.map(item => `
            <li style="margin-bottom: 8px; font-size: 14px; display: flex; gap: 12px;">
                <span style="font-weight: 600; color: #18181b; min-width: 80px;">${escape(item.user)}</span>
                <span style="color: #3f3f46;">${escape(item.content)}</span>
            </li>
            `).join('')}
        </ul>`;

    const workingOnTomorrowList = data.workingOnTomorrow.length === 0
        ? `<p style="font-style: italic; color: #71717a;">No plans recorded.</p>`
        : `<ul style="padding-left: 0; list-style: none;">
            ${data.workingOnTomorrow.map(item => `
            <li style="margin-bottom: 8px; font-size: 14px;">
                <span style="font-weight: 500; color: #18181b;">${escape(item.user)}:</span>
                <span style="color: #52525b;">${escape(item.content)}</span>
            </li>
            `).join('')}
        </ul>`;

    const blockersList = data.blockers.length === 0
        ? ''
        : `
            <div class="section">
                <h2>Blockers & Risks</h2>
                <ul style="padding-left: 0; list-style: none;">
                    ${data.blockers.map(item => `
                        <li style="margin-bottom: 8px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; font-size: 14px;">
                            <span style="font-weight: 500; color: #7f1d1d;">${escape(item.user)}:</span>
                            <span style="color: #b91c1c;">${escape(item.content)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

    const participationTags = data.participation.length === 0
        ? `<p style="font-size: 14px; color: #71717a;">No reports submitted.</p>`
        : `<div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${data.participation.map(p => `
            <div style="padding: 4px 12px; background-color: #f4f4f5; border-radius: 9999px; font-size: 12px; font-weight: 500; color: #3f3f46; display: inline-flex; align-items: center; gap: 4px;">
                ${escape(p.user)}
                <span style="background-color: ${p.reportedToday ? '#d1fae5' : '#e4e4e7'}; color: ${p.reportedToday ? '#065f46' : 'inherit'}; padding: 0 6px; border-radius: 9999px; font-size: 10px;">${p.reportedToday ? '✓' : 'Pending'}</span>
            </div>
            `).join('')}
        </div>`;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Report: ${escape(teamName)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 20px; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { background-color: #fafafa; padding: 32px; border-bottom: 1px solid #e4e4e7; }
          .content { padding: 32px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; color: #18181b; }
          h2 { font-size: 18px; font-weight: 600; color: #18181b; margin-bottom: 16px; margin-top: 0; }
          h3 { font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; margin-bottom: 8px; margin-top: 16px; }
          p.meta { margin: 0; color: #71717a; }
          .section { margin-bottom: 32px; }
          .highlight-section { background-color: #eef2ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
          .highlight-section h2 { margin-bottom: 16px; color: #1e1b4b; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
          @media print { body { background: white; } .container { box-shadow: none; } .highlight-section { border: 1px solid #e4e4e7; background-color: #fafafa; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Roll-Up: ${escape(teamName)}</h1>
            <p class="meta">${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <!-- Pulse -->
            <div class="section">
              <h2>Team Pulse</h2>
              ${pulseBar}
            </div>

            <!-- Focused Today Section -->
            <div class="highlight-section">
              <h2>Working On Today</h2>
              ${workingOnTodayList}
            </div>

             <!-- Blockers -->
            ${blockersList}

            <div class="grid">
              <!-- Completed -->
              <div class="section">
                <h2>Completed</h2>
                ${data.completedToday.length > 0 ? `<h3>Today</h3>${completedList(data.completedToday)}` : ''}
                ${data.completedYesterday.length > 0 ? `<h3>Yesterday</h3>${completedList(data.completedYesterday)}` : ''}
                ${data.completedYesterday.length === 0 && data.completedToday.length === 0 ? '<p style="font-style: italic; color: #71717a;">No items completed yet.</p>' : ''}
              </div>

               <!-- Tomorrow -->
              <div class="section">
                <h2>For Tomorrow</h2>
                ${workingOnTomorrowList}
              </div>
            </div>

            <!-- Participation -->
            <div class="section" style="margin-bottom: 0; padding-top: 32px; border-top: 1px solid #f4f4f5;">
              <h2>Participation</h2>
              ${participationTags}
            </div>
          </div>
        </div>
      </body>
    </html>
    `;
}
