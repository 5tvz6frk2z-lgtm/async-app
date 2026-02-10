"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { BurnoutAlert } from "./BurnoutAlert"
import { getTeamBurnoutRisks, BurnoutRiskResult } from "@/app/actions/burnout"
import { useEffect, useState } from "react"

interface Member {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
    lastSeen?: string | null
}

interface Report {
    user_id: string
    date: string
    sentiment: "green" | "yellow" | "red"
    plan_items: { type: string, status: string }[]
    created_at: string
}

interface TeamActivityTableProps {
    members: Member[]
    reports: Report[] // All recent reports, we'll filter for today/yesterday
    teamId: string
}

export function TeamActivityTable({ members, reports, teamId }: TeamActivityTableProps) {
    const today = new Date().toISOString().split('T')[0]
    const [burnoutRisks, setBurnoutRisks] = useState<Record<string, BurnoutRiskResult>>({})
    const [loadingBurnout, setLoadingBurnout] = useState(true)

    useEffect(() => {
        const fetchRisks = async () => {
            if (!teamId) return
            setLoadingBurnout(true)
            try {
                const risks = await getTeamBurnoutRisks(teamId)
                if (risks) setBurnoutRisks(risks)
            } catch (e) {
                console.error("Failed to fetch team burnout risks", e)
            } finally {
                setLoadingBurnout(false)
            }
        }
        fetchRisks()
    }, [teamId])

    // Sort members: Those who haven't reported today come first? Or alphabetically?
    // Let's sort logic: Reported Today (Late -> Early), then Not Reported

    const getMemberStats = (memberId: string) => {
        const todayReport = reports.find(r => r.user_id === memberId && r.date === today)

        let doneToday = 0
        let plannedTomorrow = 0
        let sentiment = null
        let sayDo = null // null means N/A

        if (todayReport) {
            doneToday = todayReport.plan_items.filter(i => i.type === 'actual_done_today').length // Just count raw items for now
            plannedTomorrow = todayReport.plan_items.filter(i => i.type === 'plan_for_tomorrow').length
            sentiment = todayReport.sentiment

            // Say/Do Logic:
            // Ideally we find Yesterday's report and compare 'plan_for_tomorrow' items vs today's 'actual_done_today'
            // BUT for MVP/this view, let's calculate based on Today's 'actual_done_today' status (completed vs not)
            // Wait, the data model for 'actual_done_today' is effectively "what I did".
            // If we want "Say/Do", we need to check if these items MATCH yesterday's plan.
            // That is complex matching.

            // Simplification for MVP as agreed: 
            // "Say/Do Ratio: A specialized metric showing how much of *yesterday's* plan was completed *today*."

            // For now, let's mock the "Say/Do" with a placeholder logic or random for demo if real matching isn't ready.
            // Let's use a "Completion Score" based on done vs planned counts for visualization?
            // Actually, let's try to find yesterday's report.

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const yesterdayReport = reports.find(r => r.user_id === memberId && r.date === yesterdayStr);

            if (yesterdayReport) {
                const plannedCount = yesterdayReport.plan_items.filter(i => i.type === 'plan_for_tomorrow').length;
                // We don't track strictly "completed vs incomplete" on the plan items themselves in the DB well yet without checking IDs.
                // Let's assume for this metric: (Done Today Count / Planned Yesterday Count) * 100 capped at 100
                if (plannedCount > 0) {
                    sayDo = Math.min(Math.round((doneToday / plannedCount) * 100), 100);
                }
            }
        }

        return { todayReport, doneToday, plannedTomorrow, sentiment, sayDo }
    }

    const handleRemind = (email: string) => {
        // In a real app, this calls an API. For now, mailto link or toast.
        window.location.href = `mailto:${email}?subject=Status Loop Reminder&body=Hi there, please don't forget to submit your daily status update!`
        toast.success(`Reminder preprared for ${email}`) // "Prepared" since it opens mail client
    }

    // Circle Chart Component (SVG)
    const CircleChart = ({ percent }: { percent: number }) => {
        const radius = 16
        const circumference = 2 * Math.PI * radius
        const offset = circumference - (percent / 100) * circumference

        // Color based on percent
        const color = percent >= 80 ? 'text-green-500' : percent >= 50 ? 'text-yellow-500' : 'text-red-500'

        return (
            <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r={radius} className="text-slate-100 fill-none stroke-current" strokeWidth="4" />
                    <circle
                        cx="20" cy="20" r={radius}
                        className={`${color} fill-none stroke-current transition-all duration-500 ease-out`}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-[10px] font-medium text-slate-700">{percent}%</span>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="font-semibold text-slate-900">Today's Activity</h3>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{today}</span>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Member</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Items</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Say/Do</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {members.map(member => {
                        const { todayReport, doneToday, plannedTomorrow, sentiment, sayDo } = getMemberStats(member.id)

                        return (
                            <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 ring-2 ring-white shadow-sm">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                                                {member.name}
                                                {loadingBurnout ? (
                                                    <div className="h-3 w-12 bg-slate-200 animate-pulse rounded"></div>
                                                ) : (
                                                    <BurnoutAlert userId={member.id} teamId={teamId} riskResult={burnoutRisks[member.id]} />
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {todayReport ? (
                                        <Badge variant="outline" className={`
                                            ${sentiment === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-600/10' :
                                                sentiment === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100 ring-1 ring-amber-600/10' :
                                                    'bg-rose-50 text-rose-700 border-rose-100 ring-1 ring-rose-600/10'}
                                            uppercase text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full shadow-sm
                                        `}>
                                            {sentiment}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide">
                                            PENDING
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {todayReport ? (
                                        <div className="flex gap-4 text-xs font-medium">
                                            <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {doneToday} Done
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                {plannedTomorrow} Planned
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-300 font-light italic">Waiting for update...</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {sayDo !== null ? (
                                        <div className="flex items-center gap-2">
                                            <CircleChart percent={sayDo} />
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!todayReport && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 text-xs font-medium"
                                            onClick={() => handleRemind(member.email)}
                                        >
                                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                                            Nudge
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
