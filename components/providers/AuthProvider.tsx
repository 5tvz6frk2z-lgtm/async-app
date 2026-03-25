"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Team, TeamMember, Role } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

// F15: Proper types instead of `any`
interface Profile {
    id: string
    name: string
    email: string
    avatar_url?: string | null
}

interface AuthContextType {
    user: User | null
    role: Role | null
    currentTeam: Team | null
    teams: Team[]
    profile: Profile | null
    isLoading: boolean
    switchTeam: (teamId: string) => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<Role | null>(null)
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [profile, setProfile] = useState<Profile | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const refreshUser = async () => {
        setIsLoading(true)
        try {
            // F1: Use getUser() (cryptographically verified) instead of getSession() (reads unverified cookie)
            const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser()

            if (authError || !verifiedUser) {
                setUser(null)
                if (isPublicRoute(pathname)) {
                    setIsLoading(false)
                    return
                }
                router.push("/login")
                setIsLoading(false)
                return
            }

            setUser(verifiedUser)

            // F8: Fetch profile OUTSIDE the retry loop (it never changes between retries)
            const { data: profileData } = await supabase
                .from("profiles")
                .select("id, name, email, avatar_url")
                .eq("id", verifiedUser.id)
                .single()

            if (profileData) setProfile(profileData as Profile)

            // Fetch User's Teams with Retry Logic
            let memberships: any[] | null = null
            let attempts = 0

            while (attempts < 3) {
                const { data } = await supabase
                    .from("team_members")
                    .select("*, team:teams(*)")
                    .eq("user_id", verifiedUser.id)

                if (data && data.length > 0) {
                    memberships = data
                    break
                }

                if (pathname === '/daily' || pathname === '/dashboard') {
                    await new Promise(r => setTimeout(r, 500))
                } else {
                    if (attempts > 0) break
                }
                attempts++
                if (attempts === 3) memberships = data || []
            }

            if (!memberships || memberships.length === 0) {
                setTeams([])

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

    // F12: Run once on mount — let onAuthStateChange handle subsequent updates
    useEffect(() => {
        refreshUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
            if (_event === 'SIGNED_OUT' && !isPublicRoute(pathname)) {
                router.push("/login")
            } else if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
                refreshUser()
            }
        })

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Route Protection Effect
    useEffect(() => {
        if (isLoading) return

        if (pathname.startsWith("/invite/")) return

        if (!user && !isPublicRoute(pathname)) {
            router.push("/login")
            return
        }

        if (user && teams.length === 0 && pathname !== "/onboarding" && !pathname.startsWith("/invite/") && !isPublicRoute(pathname)) {
            router.push("/onboarding")
            return
        }

        if (user && teams.length > 0 && pathname === "/onboarding") {
            router.push("/dashboard")
            return
        }

    }, [user, teams, pathname, isLoading, router])

    const switchTeam = async (teamId: string) => {
        const nextTeam = teams.find(t => t.id === teamId)
        if (nextTeam && user) {
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
        "/product",
        "/demo",
        "/blog",
        "/guides",
        "/help",
        "/privacy",
        "/terms"
    ]
    return publicRoutes.includes(path) || path.startsWith("/auth/") || path.startsWith("/invite/") || path.startsWith("/blog/") || path.startsWith("/case-studies/")
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within AuthProvider")
    return context
}
