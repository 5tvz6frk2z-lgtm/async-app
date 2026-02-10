"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Team, TeamMember, Role } from "@/lib/types"

interface AuthContextType {
    user: any | null
    role: Role | null
    currentTeam: Team | null
    teams: Team[]
    profile: any | null
    isLoading: boolean
    switchTeam: (teamId: string) => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null)
    const [role, setRole] = useState<Role | null>(null)
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const refreshUser = async () => {
        setIsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setUser(null)
                if (isPublicRoute(pathname)) {
                    setIsLoading(false)
                    return
                }
                router.push("/login")
                setIsLoading(false)
                return
            }

            setUser(session.user)

            // Fetch User's Teams with Retry Logic
            let memberships: any[] | null = null
            let attempts = 0

            while (attempts < 3) {
                const { data, error } = await supabase
                    .from("team_members")
                    .select("*, team:teams(*)")
                    .eq("user_id", session.user.id)

                // Fetch Profile
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single()

                if (profileData) setProfile(profileData)


                if (data && data.length > 0) {
                    memberships = data
                    break
                }

                if (pathname === '/daily' || pathname === '/dashboard') {
                    // console.log(`[AuthProvider] No memberships found on attempt ${attempts + 1}. Retrying...`)
                    await new Promise(r => setTimeout(r, 500))
                } else {
                    if (attempts > 0) break
                }
                attempts++
                if (attempts === 3) memberships = data || []
            }

            if (!memberships || memberships.length === 0) {
                // User has no team -> Onboarding
                setTeams([])

                // If on public route (like home), don't force redirect
                if (isPublicRoute(pathname)) {
                    setIsLoading(false)
                    return
                }

                if (pathname === "/onboarding") {
                    setIsLoading(false)
                    return
                }
                router.push("/onboarding")
                setIsLoading(false)
                return
            }

            // Process Teams
            const userTeams = memberships
                .map((m: any) => m.team)
                .filter((t: any) => t !== null) as Team[]

            setTeams(userTeams)

            if (userTeams.length > 0) {
                const storedTeamId = typeof window !== 'undefined' ? localStorage.getItem('status-loop-last-team') : null
                const storedTeam = storedTeamId ? userTeams.find(t => t.id === storedTeamId) : null
                const activeTeam = storedTeam || userTeams[0]
                setCurrentTeam(activeTeam)

                const activeMembership = memberships.find((m: any) => m.team_id === activeTeam.id)
                const resolvedRole = activeMembership?.role as Role || "member"
                setRole(resolvedRole)
            } else {
                setRole(null)
            }

            setIsLoading(false)

        } catch (error) {
            console.error("Auth check failed:", error)
            setIsLoading(false)
        }
    }

    // Main Auth Check
    useEffect(() => {
        refreshUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && !isPublicRoute(pathname)) {
                router.push("/login")
            }
        })

        return () => subscription.unsubscribe()
    }, [pathname]) // Simplify dependencies 

    // Route Protection Effect
    useEffect(() => {
        if (isLoading) return

        if (pathname.startsWith("/invite/")) return

        if (!user && !isPublicRoute(pathname)) {
            router.push("/login")
            return
        }

        // Redirect logic based on role/onboarding
        if (user && teams.length === 0 && pathname !== "/onboarding" && !pathname.startsWith("/invite/") && !isPublicRoute(pathname)) {
            router.push("/onboarding")
            return
        }

        if (user && teams.length > 0 && pathname === "/onboarding") {
            router.push("/dashboard") // Already onboarded
            return
        }

    }, [user, teams, pathname, isLoading, router])

    const switchTeam = async (teamId: string) => {
        const nextTeam = teams.find(t => t.id === teamId)
        if (nextTeam) {
            setCurrentTeam(nextTeam)
            localStorage.setItem('status-loop-last-team', teamId)

            const { data: member } = await supabase
                .from("team_members")
                .select("role")
                .eq("user_id", user.id)
                .eq("team_id", teamId)
                .single()

            if (member) setRole(member.role)
        }
    }

    return (
        <AuthContext.Provider value={{ user, role, currentTeam, teams, profile, isLoading, switchTeam, refreshUser }}>
            {!isLoading && children}
            {isLoading && (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}
        </AuthContext.Provider>
    )
}

function isPublicRoute(path: string) {
    const publicRoutes = [
        "/",
        "/pricing",
        "/resources",
        "/login",
        "/signup",
        "/features",
        "/enterprise",
        "/blog",
        "/guides",
        "/help",
        "/privacy",
        "/terms"
    ]
    return publicRoutes.includes(path) || path.startsWith("/auth/") || path.startsWith("/invite/")
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within AuthProvider")
    return context
}
