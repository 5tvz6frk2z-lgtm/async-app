import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { MemberWaitingRoom } from "@/components/onboarding/MemberWaitingRoom"
import { CreateTeamForm } from "@/components/onboarding/CreateTeamForm"

export default async function OnboardingPage(props: { searchParams: Promise<{ ignore_invite?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // 1. Check for pending invite cookie (Recovery Flow)
    // Priority: If invite exists, show Join UI (even if role is already set)
    const cookieStore = await cookies()
    const inviteToken = cookieStore.get("pending_invite")?.value

    // If explicitly ignored via URL param, don't pass token
    const effectiveToken = searchParams.ignore_invite ? undefined : inviteToken

    // If we have a token, show CreateTeamForm (which renders Join UI)
    // BYPASS role check to avoid "Welcome, please sign out" trap
    if (effectiveToken) {
        return <CreateTeamForm inviteToken={effectiveToken} />
    }

    // 2. Role Check (Only if no invite)
    const role = user.user_metadata?.role

    if (role === 'member') {
        return <MemberWaitingRoom />
    }

    // 3. Default Onboarding
    return <CreateTeamForm />
}
