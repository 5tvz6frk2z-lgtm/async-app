"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Trash2, Crown, User } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Member {
    id: string
    user_id: string
    role: "manager" | "member"
    joined_at: string
    profile?: {
        name: string | null
        email: string | null
    }
}

export function MemberList() {
    const { currentTeam, role: myRole, user } = useAuth()
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchMembers = async () => {
        if (!currentTeam) return
        try {
            const { data, error } = await supabase
                .from("team_members")
                .select(`
                    *,
                    profile:profiles!team_members_user_id_fkey(name, email)
                `)
                .eq("team_id", currentTeam.id)
                .order("role", { ascending: true })

            if (error) throw error
            setMembers(data || [])
        } catch (err) {
            console.error("Error loading members:", err)
            toast.error("Failed to load team members")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMembers()
    }, [currentTeam])

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from("team_members")
                .delete()
                .eq("id", memberId)

            if (error) throw error

            toast.success("Member removed from team")
            // Optimistic update
            setMembers(members.filter(m => m.id !== memberId))

        } catch (err: any) {
            console.error("Remove error:", err)
            toast.error("Failed to remove member. " + err.message)
        }
    }

    if (!currentTeam) return null
    if (loading) return <div className="py-8 text-center text-slate-500 flex flex-col items-center"><Loader2 className="w-6 h-6 animate-spin mb-2" />Loading team...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold text-slate-900">Active Members <span className="text-slate-400 font-normal text-sm ml-2">{members.length} people</span></h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {members.map((member) => {
                    const displayName = member.profile?.name || member.profile?.email || "Unknown User"
                    const avatarInitial = displayName[0]?.toUpperCase() || 'U'
                    const isMe = member.user_id === user?.id

                    return (
                        <div key={member.id} className="group flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-sm transition-all duration-200">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                    <AvatarFallback className={`${member.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'} font-medium`}>
                                        {avatarInitial}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                                        {displayName}
                                        {isMe && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">You</span>}
                                    </div>
                                    <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                                        {member.role === 'manager' ? <Crown className="w-3 h-3 text-amber-500" /> : <User className="w-3 h-3 text-slate-400" />}
                                        <span className="capitalize">{member.role}</span>
                                        {member.profile?.email && <span className="text-slate-300">•</span>}
                                        {member.profile?.email && <span>{member.profile.email}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {myRole === "manager" && !isMe && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove <strong>{displayName}</strong> from the team?
                                                They will immediately lose access.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="bg-rose-600 hover:bg-rose-700">
                                                Remove Member
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
