"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function leaveTeamAction(teamId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Not authenticated")
    }

    // 1. Delete user's reports for this team (Constraint: "Delete all user data")
    // Note: If you want to keep reports but anonymize, that's different.
    // User asked to "delete/remove all the users data".
    const { error: reportsError } = await supabase
        .from("reports")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id)

    if (reportsError) {
        console.error("Error deleting reports:", reportsError)
        throw new Error("Failed to clean up reports")
    }

    // 2. Delete membership
    const { error: membershipError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id)

    if (membershipError) {
        console.error("Error leaving team:", membershipError)
        throw new Error("Failed to leave team")
    }

    revalidatePath("/daily")
    revalidatePath("/dashboard")
    redirect("/onboarding")
}
