"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

type Role = "member" | "manager"

interface AuthContextType {
    role: Role
    setRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<Role>("member") // Default to member for safety
    const router = useRouter()
    const pathname = usePathname()

    // Simple Persist (for dev demo)
    useEffect(() => {
        const savedRole = localStorage.getItem("status_loop_role") as Role
        if (savedRole) setRole(savedRole)
    }, [])

    const handleSetRole = (newRole: Role) => {
        setRole(newRole)
        localStorage.setItem("status_loop_role", newRole)
        // Redirect on role switch
        if (newRole === "member") router.push("/daily")
        if (newRole === "manager") router.push("/dashboard")
    }

    // Route Protection Logic
    useEffect(() => {
        if (role === "member" && pathname.startsWith("/dashboard")) {
            router.replace("/daily")
        }
        // Optional: Force manager to dashboard if they try accessing daily? 
        // Usually managers MIGHT want to see the daily form to test it, 
        // but the request says "manager of the team to see the dashboard with the reports only".
        // Let's implement strict separation for now as requested.
        if (role === "manager" && pathname.startsWith("/daily")) {
            router.replace("/dashboard")
        }
    }, [role, pathname, router])

    return (
        <AuthContext.Provider value={{ role, setRole: handleSetRole }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within AuthProvider")
    return context
}
