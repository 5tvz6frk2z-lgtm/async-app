"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { MemberList } from "@/components/team/MemberList"
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog"
import { PendingInvites } from "@/components/team/PendingInvites"
import { useRouter } from "next/navigation"

export default function TeamPage() {
    const { role } = useAuth()
    const router = useRouter()

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team</h1>
                    <p className="text-slate-500">View and manage your team members.</p>
                </div>
                {role === 'manager' && <InviteMemberDialog />}
            </div>

            {role === 'manager' && <PendingInvites />}
            <MemberList />
        </div>
    )
}
