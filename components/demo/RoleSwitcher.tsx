"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function RoleSwitcher() {
    const { role, setRole } = useAuth()

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-full shadow-lg">
            <span className="text-xs font-medium text-slate-500 pl-2">Viewing as:</span>
            <Badge variant={role === "manager" ? "default" : "outline"} className="cursor-pointer" onClick={() => setRole("manager")}>
                Manager
            </Badge>
            <Badge variant={role === "member" ? "default" : "outline"} className="cursor-pointer" onClick={() => setRole("member")}>
                Member
            </Badge>
        </div>
    )
}
