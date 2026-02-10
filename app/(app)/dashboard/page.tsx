import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardWrapper } from "@/components/dashboard/DashboardWrapper"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return <DashboardWrapper />
}
