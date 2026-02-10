
"use client"

import { useEffect, useState } from "react"
import { WeeklyReportTemplate } from "./WeeklyReportTemplate"
import { getLatestWeeklyReport } from "@/app/(app)/dashboard/actions"
import { Loader2 } from "lucide-react"

export function WeeklyReportView({ teamId }: { teamId: string }) {
    const [data, setData] = useState<any>(null)
    const [teamName, setTeamName] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!teamId) return
        setLoading(true)

        // Detect user timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        getLatestWeeklyReport(teamId, userTimezone)
            .then(res => {
                setData(res.data)
                setTeamName(res.teamName)
            })
            .catch(err => {
                setError("Failed to load report")
                console.error(err)
            })
            .finally(() => setLoading(false))
    }, [teamId])

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>
    if (!data) return <div className="p-10 text-center text-slate-500">No report data available.</div>

    return <WeeklyReportTemplate data={data} teamName={teamName} />
}
