"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Plus, Users } from "lucide-react"
import { joinTeamAction } from "@/app/invite/[token]/actions"
import { useAuth } from "@/components/providers/AuthProvider"

export function CreateTeamForm({ inviteToken }: { inviteToken?: string }) {
    const [teamName, setTeamName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const { refreshUser } = useAuth()

    const handleCreateTeam = async (e: React.FormEvent) => {
        // ... existing logic ...
        e.preventDefault()
        if (!teamName.trim()) return

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            // 1. Create Team
            const { data: team, error: teamError } = await supabase
                .from("teams")
                .insert({ name: teamName, billing_email: user.email })
                .select()
                .single()

            if (teamError) throw teamError

            // 2. Add User as Manager
            const { error: memberError } = await supabase
                .from("team_members")
                .insert({
                    team_id: team.id,
                    user_id: user.id,
                    role: "manager"
                })

            if (memberError) throw memberError

            toast.success("Team created successfully!")

            // Force auth refresh to update teams list BEFORE redirecting
            // This prevents the redirect loop where dashboard sees 0 teams -> onboarding
            await refreshUser()

            router.push("/dashboard")
            router.refresh()

        } catch (error: any) {
            console.error("Error creating team:", error)
            toast.error(error.message || "Failed to create team")
        } finally {
            setLoading(false)
        }
    }

    if (inviteToken) {
        const handleAcceptInvite = async () => {
            setLoading(true)
            try {
                const result = await joinTeamAction(inviteToken)

                if (!result.success) {
                    toast.error(result.error || "Failed to join team")
                    setLoading(false)
                    return
                }

                if (result.alreadyMember) {
                    toast.success("You are already a member of this team!")
                } else {
                    toast.success(`You have joined ${result.teamName}!`)
                }

                // Auto-switch to new team
                if (result.teamId) {
                    localStorage.setItem('status-loop-last-team', result.teamId)
                }

                // Redirect to daily
                router.push("/daily")
                router.refresh()

            } catch (err: any) {
                console.error("Join error:", err)
                toast.error("Failed to join team. Please try again.")
                setLoading(false)
            }
        }

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-indigo-100 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-6">
                        <Users className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Pending Invitation Found!</h1>
                    <p className="text-slate-600 mb-8">
                        You have been invited to join a team. Please accept the invitation to continue setting up your account.
                    </p>

                    <Button
                        onClick={handleAcceptInvite}
                        disabled={loading}
                        className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 mb-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Accept & Join Team"
                        )}
                    </Button>

                    <div className="mt-6 text-center">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut()
                                router.push("/login")
                            }}
                            className="text-sm text-slate-500 hover:text-slate-700 underline"
                        >
                            Sign Out / Switch Account
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                {/* ... existing Render ... */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                        <Users className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome to Status Loop</h1>
                    <p className="text-slate-600 mt-2">Create your first team to get started.</p>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Team Name
                        </label>
                        <Input
                            placeholder="e.g. Engineering, Marketing, Acme Corp"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="h-11"
                            autoFocus
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-medium"
                        disabled={loading || !teamName.trim()}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                        ) : (
                            <><Plus className="w-4 h-4 mr-2" /> Create Team</>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                            router.push("/login")
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                        Sign Out / Switch Account
                    </button>
                </div>
            </div>
        </div>
    )
}
