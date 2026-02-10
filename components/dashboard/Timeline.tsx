"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/AuthProvider"
import { ReportCard } from "./ReportCard"
import { DailyReportModal } from "./DailyReportModal"
import { WeeklyReportModal } from "./WeeklyReportModal"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

// Real Data Interfaces
interface PlanItem {
    id: string
    content: string
    type: "plan_for_tomorrow" | "actual_done_today"
    status: "todo" | "done" | "carried_over"
    is_priority: boolean
}

interface Report {
    id: string
    date: string
    sentiment: "green" | "yellow" | "red"
    blockers?: string
    created_at: string
    // Joins
    profiles: {
        name: string | null
        email: string | null
    } | null
    plan_items: PlanItem[]
}

const PAGE_SIZE = 10

export function Timeline() {
    const { currentTeam } = useAuth()
    const [reports, setReports] = useState<Report[]>([])
    const [page, setPage] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [initialLoad, setInitialLoad] = useState(true)
    const supabase = createClient()

    // Reset when team changes
    useEffect(() => {
        if (currentTeam) {
            setReports([])
            setPage(0)
            setHasMore(true)
            setInitialLoad(true)
            loadMore(0, true)
        }
    }, [currentTeam])

    const loadMore = async (pageOverride?: number, isReset?: boolean) => {
        if (!currentTeam) return
        if (isLoading && !isReset) return

        setIsLoading(true)
        const currentPage = pageOverride !== undefined ? pageOverride : page

        try {
            const { data, error } = await supabase
                .from("reports")
                .select(`
                    id,
                    date,
                    sentiment,
                    blockers,
                    created_at,
                    profiles ( name, email ),
                    plan_items ( id, content, type, status, is_priority )
                `)
                .eq("team_id", currentTeam.id)
                .order("date", { ascending: false })
                .order("created_at", { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

            if (error) throw error

            const newReports = data as unknown as Report[]

            if (newReports.length < PAGE_SIZE) {
                setHasMore(false)
            }

            setReports(prev => isReset ? newReports : [...prev, ...newReports])
            setPage(prev => isReset ? 1 : prev + 1)

        } catch (err) {
            console.error("Failed to load reports:", err)
            toast.error("Failed to load timeline")
        } finally {
            setIsLoading(false)
            setInitialLoad(false)
        }
    }

    // Helper to reshape for ReportCard
    const formatReportForCard = (r: Report) => {
        const yest = r.plan_items.filter(i => i.type === "actual_done_today").map(i => i.content)

        return {
            id: r.id,
            user: { name: r.profiles?.name || r.profiles?.email || "Unknown User" },
            date: r.date,
            sentiment: r.sentiment,
            blockers: r.blockers,
            yest_completed: yest,
            today_plan: r.plan_items.filter(i => i.type === "plan_for_tomorrow").map(i => ({
                id: i.id,
                content: i.content,
                is_priority: i.is_priority
            })),
            timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    }

    // Handle Priority Toggle
    const handleTogglePriority = async (itemId: string, currentPriority: boolean) => {
        try {
            // Optimistic Update
            setReports(current => current.map(r => ({
                ...r,
                plan_items: r.plan_items.map(i =>
                    i.id === itemId ? { ...i, is_priority: !currentPriority } : i
                )
            })))

            const { error } = await supabase
                .from("plan_items")
                .update({ is_priority: !currentPriority })
                .eq("id", itemId)

            if (error) throw error

        } catch (error) {
            console.error("Error toggling priority:", error)
            toast.error("Failed to update priority")
        }
    }

    // Handle Save from ReportCard
    const handleSaveReport = async (id: string, updates: { sentiment: "green" | "yellow" | "red"; today_plan: string[] }) => {
        try {
            // 1. Update Report Metadata (Sentiment)
            const { error: reportError } = await supabase
                .from("reports")
                .update({ sentiment: updates.sentiment })
                .eq("id", id)

            if (reportError) throw reportError

            // 2a. Delete existing future plan items
            const { error: deleteError } = await supabase
                .from("plan_items")
                .delete()
                .eq("report_id", id)
                .eq("type", "plan_for_tomorrow")

            if (deleteError) throw deleteError

            // 2b. Insert new items
            const newItems = updates.today_plan.map(content => ({
                report_id: id,
                content,
                type: "plan_for_tomorrow",
                status: "todo"
            }))

            if (newItems.length > 0) {
                const { error: insertError } = await supabase.from("plan_items").insert(newItems)
                if (insertError) throw insertError
            }

            toast.success("Report updated")

            // Optimistic local state update
            setReports(current => current.map(r => {
                if (r.id === id) {
                    const keptItems = r.plan_items.filter(i => i.type !== "plan_for_tomorrow")
                    const addedItems = updates.today_plan.map((c, idx) => ({
                        id: `temp-${idx}`,
                        content: c,
                        type: "plan_for_tomorrow" as const,
                        status: "todo" as const,
                        is_priority: false
                    }))

                    return {
                        ...r,
                        sentiment: updates.sentiment,
                        plan_items: [...keptItems, ...addedItems]
                    }
                }
                return r
            }))

        } catch (err: any) {
            console.error("Error updating report:", err)
            toast.error("Failed to update report")
        }
    }

    if (!currentTeam) return <div className="p-8 text-center text-slate-500">Please select a team.</div>

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{currentTeam.name} Pulse</h1>
                    <span className="text-sm text-slate-500">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <DailyReportModal />
                    <WeeklyReportModal />
                </div>
            </div>

            {reports.map(report => (
                <ReportCard
                    key={report.id}
                    report={formatReportForCard(report)}
                    onSave={handleSaveReport}
                    onTogglePriority={handleTogglePriority}
                />
            ))}

            {initialLoad && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>}

            {!initialLoad && reports.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-slate-500">No reports yet.</p>
                    <p className="text-sm text-slate-400">Team members need to submit their daily check-in.</p>
                </div>
            )}

            {!initialLoad && hasMore && (
                <div className="text-center pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => loadMore()}
                        disabled={isLoading}
                        className="text-slate-500 hover:text-indigo-600"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Older Reports"}
                    </Button>
                </div>
            )}
        </div>
    )
}
