import { WizardContainer } from "@/components/daily-wizard/WizardContainer"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DailyPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Check if user is a MEMBER of any team
    const { data: memberships } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)

    // If user has NO 'member' roles (e.g. only 'manager'), redirect to dashboard
    const hasMemberRole = memberships?.some(m => m.role === 'member')

    if (!memberships || memberships.length === 0) {
        redirect("/onboarding")
    }

    if (!hasMemberRole) {
        // User is likely just a manager
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

            <div className="w-full max-w-lg">
                <WizardContainer />
            </div>
        </div>
    )
}
