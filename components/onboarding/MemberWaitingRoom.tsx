"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"

export function MemberWaitingRoom() {
    const router = useRouter()
    const supabase = createClient()

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-6">
                    <Users className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome!</h1>
                <p className="text-slate-600 mb-8">
                    Your account is set up as a <strong>Member</strong>.
                    You cannot create a team directly. Please ask your manager for an invite link to join their team.
                </p>

                <div className="border-t border-slate-100 pt-6">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                            router.push("/login")
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
