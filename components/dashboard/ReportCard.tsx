"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Need to install avatar or use placeholder
import { Button } from "@/components/ui/button"

// Mock type for now
interface Report {
    id: string
    user: { name: string; avatarUrl?: string }
    date: string
    sentiment: "green" | "yellow" | "red"
    blockers?: string
    yest_completed: string[]
    today_plan: { id: string; content: string; is_priority: boolean }[]
    timestamp: string
}

import { useState } from "react"
import { EditReportDialog } from "./EditReportDialog"
// ... imports

// ... Report interface

import { Flag } from "lucide-react"

interface ReportCardProps {
    report: Report
    onSave: (id: string, updates: { sentiment: "green" | "yellow" | "red"; today_plan: string[] }) => void
    onTogglePriority: (itemId: string, currentPriority: boolean) => void
}

export function ReportCard({ report, onSave, onTogglePriority }: ReportCardProps) {
    const [isEditing, setIsEditing] = useState(false)

    const sentimentColor = {
        green: "bg-emerald-50 text-emerald-700 border-emerald-100",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
        red: "bg-rose-50 text-rose-700 border-rose-100",
    }[report.sentiment]

    return (
        <Card className="bg-white rounded-2xl border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden transition-all hover:border-indigo-100">
            {/* ... Sentiment Strip ... */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${report.sentiment === 'green' ? 'bg-emerald-400' :
                report.sentiment === 'yellow' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />

            <CardContent className="pt-6 pl-6">
                {/* ... Header & Blockers ... */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                            {report.user.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{report.user.name}</h3>
                            <p className="text-xs text-slate-500">{report.timestamp}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className={sentimentColor}>
                        {report.sentiment === 'red' ? 'BEHIND' : report.sentiment.toUpperCase()}
                    </Badge>
                </div>

                {report.blockers && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-md">
                        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide mb-1">Blocker</h4>
                        <p className="text-sm text-rose-700">{report.blockers}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Yesterday */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Completed Yesterday</h4>
                        <ul className="space-y-1">
                            {report.yest_completed.length > 0 ? (
                                report.yest_completed.map((item, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                        <span className="text-emerald-500 mt-1">✓</span>
                                        <span className="line-through opacity-70">{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-slate-400 italic">Nothing completed</li>
                            )}
                        </ul>
                    </div>

                    {/* Today */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Plan for Today</h4>
                        <ul className="space-y-1">
                            {report.today_plan.map((item, i) => (
                                <li key={item.id} className="text-sm text-slate-700 flex items-start group justify-between">
                                    <div className="flex items-start gap-2">
                                        <span className="text-indigo-500 mt-1">•</span>
                                        <span>{item.content}</span>
                                    </div>
                                    {/* Priority Flag Action */}
                                    <button
                                        onClick={() => onTogglePriority(item.id, item.is_priority)}
                                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${item.is_priority
                                            ? "text-red-500 hover:text-red-600 opacity-100"
                                            : "text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                            }`}
                                        title={item.is_priority ? "Remove Priority" : "Mark as Priority"}
                                    >
                                        <Flag className={`w-3.5 h-3.5 ${item.is_priority ? "fill-current" : ""}`} />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="mt-2 h-6 text-xs text-indigo-600 hover:text-indigo-800 p-0"
                        >
                            Edit Report
                        </Button>
                    </div>
                </div>
            </CardContent>

            <EditReportDialog
                report={report}
                open={isEditing}
                onOpenChange={setIsEditing}
                onSave={onSave}
            />
        </Card>
    )
}
