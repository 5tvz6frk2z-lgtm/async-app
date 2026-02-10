"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { joinTeamAction } from "./actions"

export default function AcceptInvitePage() {
    const params = useParams()
    const token = params.token as string
    const router = useRouter()
    const supabase = createClient()

    const [invite, setInvite] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                // 1. Get Invite Details (Public RLS allows reading by token)
                const { data, error } = await supabase
                    .from("invitations")
                    .select("*, team:teams(name)")
                    .eq("token", token)
                    .single()

                if (error || !data) {
                    setError("This invite link is invalid or has expired.")
                    setLoading(false)
                    return
                }

                // Check for invalid team (e.g. deleted)
                if (!data.team) {
                    setError("This invitation is invalid because the team no longer exists.")
                    setLoading(false)
                    return
                }


                if (data.status !== "pending") {
                    setError("This invite has already been used.")
                    setLoading(false)
                    return
                }

                setInvite(data)

                // 2. Check Auth Status
                const { data: { user } } = await supabase.auth.getUser()
                setCurrentUser(user)

                // 3. Set Recovery Cookie (in case they get lost during signup)
                // Use Secure in production, SameSite=Lax for CSRF protection
                const isSecure = window.location.protocol === 'https:'
                document.cookie = `pending_invite=${token}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`

            } catch (err) {
                console.error("Error fetching invite:", err)
                setError("Failed to load invitation.")
            } finally {
                setLoading(false)
            }
        }
        fetchInvite()
    }, [token, supabase])

    const handleJoin = async () => {
        if (!currentUser) {
            // Redirect to Signup (preserving return url)
            router.push(`/login?next=/invite/${token}`)
            return
        }

        setJoining(true)

        try {
            // Call server action to handle the join
            const result = await joinTeamAction(token)

            if (!result.success) {
                toast.error(result.error || "Failed to join team")
                setJoining(false)
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

            // Force refresh to update Auth Context
            window.location.href = "/daily"

        } catch (err: any) {
            console.error("Join error:", err)
            toast.error("Failed to join team. Please try again.")
            setJoining(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-rose-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invite</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link href="/">
                        <Button variant="outline">Go Home</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="w-8 h-8 text-indigo-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Join {invite.team?.name}</h1>
                <p className="text-slate-600 mb-8">
                    You have been invited to join <strong>{invite.team?.name}</strong> on Status Loop.
                </p>

                <div className="bg-slate-50 p-4 rounded-lg mb-8 text-left">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Invited as</p>
                    <p className="font-medium text-slate-900">{invite.email}</p>
                </div>

                {currentUser ? (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                            Logged in as <strong>{currentUser.email}</strong>
                            {currentUser.email !== invite.email && (
                                <div className="mt-1 text-amber-700 text-xs">
                                    Warning: You are logged in with a different email than the invitation.
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleJoin}
                            disabled={joining}
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium"
                        >
                            {joining ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Joining...</>
                            ) : (
                                "Accept & Join Team"
                            )}
                        </Button>

                        <button
                            onClick={async () => {
                                await supabase.auth.signOut()
                                window.location.reload()
                            }}
                            className="text-sm text-slate-500 hover:text-indigo-600 underline w-full"
                        >
                            Not you? Sign out
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Link href={`/signup?next=/invite/${token}&role=member&email=${encodeURIComponent(invite.email)}`}>
                            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium text-white">
                                Create new account
                            </Button>
                        </Link>

                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">Or</span>
                        </div>

                        <Link href={`/login?next=/invite/${token}`}>
                            <Button className="w-full h-11" variant="outline">
                                Log in to Accept
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
