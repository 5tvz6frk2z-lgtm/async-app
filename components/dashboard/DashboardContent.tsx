"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Timeline } from "@/components/dashboard/Timeline"
import { ManagerStats } from "@/components/dashboard/ManagerStats"
import { SmartSummary } from "@/components/dashboard/SmartSummary"
import { TeamActivityTable } from "@/components/dashboard/TeamActivityTable"
import { WeeklyReportView } from "@/components/dashboard/WeeklyReportView"
import { DailyReportView } from "@/components/dashboard/DailyReportView"
import { useSettings } from "@/components/providers/SettingsProvider"
import { createClient } from "@/lib/supabase/client"
import { Loader2, LayoutList, Users, CalendarDays, Repeat, AlertCircle, Sun } from "lucide-react"
import { toast } from "sonner"

export function DashboardContent() {
    const [view, setView] = useState<"feed" | "team" | "daily-rollup" | "weekly">("feed")
    const { teamId, isLoading: isSettingsLoading } = useSettings()

    // Data for Stats & Table
    const [members, setMembers] = useState<any[]>([])
    const [recentReports, setRecentReports] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        if (!teamId) return

        const fetchData = async () => {
            setIsLoadingData(true)
            setFetchError(null)

            try {
                // 1. Fetch Team Members (limit for performance)
                const { data: membersData, error: memError } = await supabase
                    .from("team_members")
                    .select("user_id")
                    .eq("team_id", teamId)
                    .neq("role", "manager")
                    .limit(100) // Limit to prevent slow loads with 200+ members

                if (memError) throw memError

                if (membersData && membersData.length > 0) {
                    const userIds = membersData.map((m: any) => m.user_id).filter((id: any) => Boolean(id))

                    if (userIds.length > 0) {
                        // Fetch profiles for these users
                        const { data: profilesData, error: profError } = await supabase
                            .from("profiles")
                            .select("id, name, email")
                            .in("id", userIds)

                        if (profError) throw profError

                        if (profilesData) {
                            const formattedMembers = profilesData.map((p: any) => ({
                                id: p.id,
                                name: p.name || p.email?.split('@')[0] || "User",
                                email: p.email,
                                avatarUrl: null,
                                userid: p.id
                            }))
                            setMembers(formattedMembers)
                        }
                    } else {
                        setMembers([])
                    }
                } else {
                    setMembers([])
                }

                // 2. Fetch Recent Reports (Last 48 hours for Say/Do & Today's stats)
                const twoDaysAgo = new Date()
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

                const { data: reportData, error: reportError } = await supabase
                    .from("reports")
                    .select(`
                        user_id,
                        date,
                        sentiment,
                        blockers,
                        created_at,
                        plan_items ( type, status, content )
                    `)
                    .eq("team_id", teamId)
                    .gte("date", twoDaysAgo.toISOString().split('T')[0])
                    .order("date", { ascending: false })

                if (reportError) throw reportError

                if (reportData) {
                    setRecentReports(reportData)
                }
            } catch (error: any) {
                console.error("Dashboard fetch error:", error)
                setFetchError(error.message || "Failed to load dashboard data")
                toast.error("Failed to load dashboard data. Please refresh the page.")
            } finally {
                setIsLoadingData(false)
            }
        }

        fetchData()
    }, [teamId])

    const todaysReports = recentReports.filter(r => r.date === new Date().toISOString().split('T')[0])

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            {/* Brand Header (Manager View) - Added to ensure visibility */}
            <Link href="/" className="flex items-center gap-2 mb-6 w-fit hover:opacity-80 transition-opacity cursor-pointer">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                    <Repeat className="w-5 h-5" />
                </div>
                <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Status Loop</span>
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {view === "feed" ? "Daily Standup" : view === "team" ? "Team Status" : view === "daily-rollup" ? "Daily Roll-Up" : "Weekly Roll-Up"}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {view === "feed" ? "Live feed of today's updates" :
                            view === "team" ? "Member activity & engagement metrics" :
                                view === "daily-rollup" ? "Quick snapshot of today's progress" :
                                    "Aggregated weekly report"}
                    </p>
                </div>

                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                    <button
                        onClick={() => setView("feed")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "feed" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                        <LayoutList className="w-4 h-4" />
                        Feed
                    </button>
                    <button
                        onClick={() => setView("team")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "team" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                        <Users className="w-4 h-4" />
                        Team
                    </button>
                    <button
                        onClick={() => setView("daily-rollup")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "daily-rollup" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                        <Sun className="w-4 h-4" />
                        Daily
                    </button>
                    <button
                        onClick={() => setView("weekly")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "weekly" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        Weekly
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isSettingsLoading || (view !== "weekly" && view !== "daily-rollup" && isLoadingData) ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : (
                <>
                    {/* AI Smart Summary Widget (Only visible to managers, which this view is) */}
                    {teamId && <SmartSummary teamId={teamId} />}

                    {view === "feed" && (
                        <div className="space-y-8">
                            <ManagerStats members={members} todaysReports={todaysReports} />
                            <Timeline />
                        </div>
                    )}

                    {view === "team" && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Re-use stats here too? Optional. Let's keep it specific. */}
                            <div className="grid gap-6">
                                <h2 className="text-lg font-semibold text-slate-900">Member Activity</h2>
                                <TeamActivityTable members={members} reports={recentReports} teamId={teamId || ""} />
                            </div>
                        </div>
                    )}

                    {view === "daily-rollup" && (
                        teamId ? <DailyReportView teamId={teamId} /> : <div className="text-center p-10 text-slate-500">Team context missing.</div>
                    )}

                    {view === "weekly" && (
                        teamId ? <WeeklyReportView teamId={teamId} /> : <div className="text-center p-10 text-slate-500">Team context missing.</div>
                    )}
                </>
            )}
        </div>
    )
}
