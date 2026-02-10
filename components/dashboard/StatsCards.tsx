// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { startOfWeek, isSameDay, isAfter } from "date-fns"

interface Report {
    date: string
    sentiment: "green" | "yellow" | "red"
}

interface StatsCardsProps {
    reports: Report[]
}

export function StatsCards({ reports }: StatsCardsProps) {
    // 1. Calculate Reports This Week (starting Monday)
    const now = new Date()
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }) // 1 = Monday

    const reportsThisWeek = reports.filter(r => {
        const reportDate = new Date(r.date)
        return isAfter(reportDate, startOfCurrentWeek) || isSameDay(reportDate, startOfCurrentWeek)
    }).length

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-start justify-between group hover:border-indigo-100 transition-colors">
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Reports This Week</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{reportsThisWeek}</span>
                    <span className="text-sm text-slate-400">updates</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                    Since Monday
                </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <CheckCircle className="h-5 w-5" />
            </div>
        </div>
    )
}
