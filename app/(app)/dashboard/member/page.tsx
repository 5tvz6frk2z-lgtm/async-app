import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MemberDashboard } from "@/components/dashboard/MemberDashboard"

export default async function MemberDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Just render the member dashboard - let the component handle its own data
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <MemberDashboard />
        </div>
    )
}
