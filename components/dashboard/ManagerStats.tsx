// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Removed for custom styling
import { Users, Activity, MessageSquare } from "lucide-react"

interface Member {
    id: string
    hasReportedToday: boolean
}

interface Report {
    sentiment: "green" | "yellow" | "red"
    date: string
    blockers: string | null
}

interface ManagerStatsProps {
    members: Member[]
    todaysReports: Report[]
}

export function ManagerStats({ members, todaysReports }: ManagerStatsProps) {
    const totalMembers = members.length
    const reportingCount = todaysReports.length
    const participationRate = totalMembers > 0 ? Math.round((reportingCount / totalMembers) * 100) : 0

    // Average Sentiment Score (Green=3, Yellow=2, Red=1)
    const sentimentScore = todaysReports.reduce((acc, report) => {
        if (report.sentiment === "green") return acc + 3
        if (report.sentiment === "yellow") return acc + 2
        return acc + 1
    }, 0)

    const avgSentiment = reportingCount > 0 ? sentimentScore / reportingCount : 0
    let teamMood = "Neutral"
    if (reportingCount > 0) {
        if (avgSentiment >= 2.5) teamMood = "High"
        else if (avgSentiment >= 1.5) teamMood = "Medium"
        else teamMood = "Low"
    }

    const blockerCount = todaysReports.filter(r => r.blockers).length

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Participation Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-start justify-between group hover:border-indigo-100 transition-colors">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Participation</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-slate-900">{participationRate}%</span>
                        <span className="text-sm text-slate-400">rate</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        {reportingCount}/{totalMembers} members reported
                    </p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="h-5 w-5" />
                </div>
            </div>

            {/* Team Pulse Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-start justify-between group hover:border-indigo-100 transition-colors">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Team Pulse</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-slate-900">{teamMood}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        Based on today's reports
                    </p>
                </div>
                <div className={`p-3 rounded-xl ${teamMood === "High" ? "bg-emerald-50 text-emerald-600" :
                    teamMood === "Medium" ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                    }`}>
                    <Activity className="h-5 w-5" />
                </div>
            </div>

            {/* Active Blockers Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-start justify-between group hover:border-indigo-100 transition-colors">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Active Blockers</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-slate-900">{blockerCount}</span>
                        <span className="text-sm text-slate-400">issues</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        Needing attention
                    </p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <MessageSquare className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}
