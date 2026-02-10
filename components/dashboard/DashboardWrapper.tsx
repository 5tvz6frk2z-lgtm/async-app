"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { DashboardContent } from "./DashboardContent"
import { MemberDashboard } from "./MemberDashboard"
import { Loader2 } from "lucide-react"

export function DashboardWrapper() {
    const { role, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    // Strict role enforcement: managers see manager view, members see member view
    return role === "manager" ? <DashboardContent /> : <MemberDashboard />
}
