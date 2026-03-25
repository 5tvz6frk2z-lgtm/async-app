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

    // F7: Delete membership first (less destructive), then reports
    // If report cleanup fails, the user is already removed from the team
    // but their data can be cleaned up later (safer partial state)
    const { error: membershipError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id)

    if (membershipError) {
        console.error("Error leaving team:", membershipError)
        throw new Error("Failed to leave team")
    }

    // Clean up reports — non-critical if it fails
    const { error: reportsError } = await supabase
        .from("reports")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id)

    if (reportsError) {
        console.error("Warning: Reports cleanup failed:", reportsError)
        // Don't throw — the user has left the team, reports can be cleaned up later
    }

    revalidatePath("/daily")
    revalidatePath("/dashboard")
    redirect("/onboarding")
}
