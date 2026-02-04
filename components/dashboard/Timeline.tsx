import { useState } from "react"
"use client"

import { ReportCard } from "./ReportCard"
import { WeeklyReportModal } from "./WeeklyReportModal"

// Mock Data
const MOCK_REPORTS = [
    {
        id: "r1",
        user: { name: "Alice" },
        date: "2023-10-27",
        sentiment: "red" as const,
        blockers: "Waiting on design assets for the landing page.",
        yest_completed: ["Fixed navbar bug"],
        today_plan: ["Implement hero section", "Setup analytics"],
        timestamp: "8:45 AM"
    },
    {
        id: "r2",
        user: { name: "Bob" },
        date: "2023-10-27",
        sentiment: "green" as const,
        yest_completed: ["Database schema", "Auth setup"],
        today_plan: ["API Routes for reports", "Middleware logic"],
        timestamp: "9:00 AM"
    },
    {
        id: "r3",
        user: { name: "Charlie" },
        date: "2023-10-27",
        sentiment: "yellow" as const,
        yest_completed: [],
        today_plan: ["Research payment gateways"],
        timestamp: "9:15 AM"
    }
]

export function Timeline() {
    const [reports, setReports] = useState(MOCK_REPORTS)

    const handleSaveReport = (id: string, updates: { sentiment: "green" | "yellow" | "red"; today_plan: string[] }) => {
        setReports(current => current.map(report =>
            report.id === id ? { ...report, ...updates } : report
        ))
        // In a real app, we would make an API call to Supabase here
        console.log("Updated report", id, updates)
    }

    // Sorting logic: Red > Yellow > Green
    const sortedReports = [...reports].sort((a, b) => {
        const sentimentScore = { red: 3, yellow: 2, green: 1 }
        const scoreA = sentimentScore[a.sentiment] + (a.blockers ? 10 : 0) // Boost blockers
        const scoreB = sentimentScore[b.sentiment] + (b.blockers ? 10 : 0)
        return scoreB - scoreA
    })

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Status Loop Team Pulse</h1>
                    <span className="text-sm text-slate-500">{new Date().toLocaleDateString()}</span>
                </div>
                <WeeklyReportModal />
            </div>

            {sortedReports.map(report => (
                <ReportCard key={report.id} report={report} onSave={handleSaveReport} />
            ))}
        </div>
    )
}
