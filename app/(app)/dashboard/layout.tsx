"use client"

import { ManagerNavbar } from "@/components/dashboard/ManagerNavbar"
import { useAuth } from "@/components/providers/AuthProvider"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { role, isLoading } = useAuth()

    // Show loading state while auth is being checked
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    // For managers, show the manager navbar
    if (role === "manager") {
        return (
            <div className="min-h-screen bg-slate-50">
                <ManagerNavbar />
                <main className="py-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        )
    }

    // For members (and others), render a simpler layout without redirect
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
