"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { Trash2, Copy, Mail, Clock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Invitation {
    id: string
    email: string
    token: string
    role: string
    created_at: string
    expires_at: string
    status: string
}

export function PendingInvites() {
    const { currentTeam } = useAuth()
    const [invites, setInvites] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const supabase = createClient()

    const fetchInvites = async () => {
        if (!currentTeam) return
        try {
            const { data, error } = await supabase
                .from("invitations")
                .select("*")
                .eq("team_id", currentTeam.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(50) // Prevent loading too many invites at once

            if (error) throw error
            setInvites(data || [])
        } catch (err) {
            console.error("Error loading invites", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvites()

        const channel = supabase.channel('invites_change')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `team_id=eq.${currentTeam?.id}` }, async () => {
                try {
                    await fetchInvites()
                } catch (error) {
                    console.error('Realtime invite fetch failed:', error)
                    // Silent failure - don't spam user with toasts
                }
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime connection failed for invitations')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentTeam, supabase, fetchInvites])

    const handleDelete = async (id: string, email: string) => {
        setDeletingId(id)
        try {
            const { error } = await supabase
                .from("invitations")
                .delete()
                .eq("id", id)

            if (error) throw error
            toast.success(`Revoked invitation for ${email}`)
            setInvites(prev => prev.filter(i => i.id !== id))
        } catch (err: any) {
            console.error(err)
            toast.error("Failed to delete invite: " + err.message)
        } finally {
            setDeletingId(null)
        }
    }

    const copyLink = (token: string) => {
        const link = `${window.location.origin}/invite/${token}`
        navigator.clipboard.writeText(link)
        toast.success("Invite link copied")
    }

    if (loading) return null
    if (invites.length === 0) return null

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 px-1">Pending Invitations</h2>
            <div className="space-y-3">
                {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-4 bg-orange-50/30 border border-orange-100/50 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">{invite.email}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {format(new Date(invite.expires_at), 'MMM d')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => copyLink(invite.token)} title="Copy Link">
                                <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDelete(invite.id, invite.email)}
                                disabled={deletingId === invite.id}
                                title="Revoke Invite"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
