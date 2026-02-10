
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase Variables")
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
    console.log("--- Submitting Test Report ---")

    // 1. Login as Worker
    console.log("1. Logging in as Worker...")
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    })

    if (loginError) {
        console.error("Login failed:", loginError.message)
        process.exit(1)
    }
    const userId = sessionData.session!.user.id

    // 2. Get Team via Membership
    const { data: membership, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single()

    // Note: If worker is in multiple teams, this might need refinement, but fine for test.
    if (teamError || !membership) {
        console.error("   Failed to find team:", teamError?.message)
        process.exit(1)
    }
    const teamId = membership.team_id
    console.log("   Found Team:", teamId)

    // Debug RLS visibility
    const { data: teamIds, error: rpcError } = await supabase.rpc('get_my_team_ids')
    console.log("   get_my_team_ids() returns:", teamIds, rpcError ? rpcError.message : "")


    // 3. Create Report (Red Sentiment)
    // Check Profile
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single()
    console.log("   Profile Check:", profile ? "Found" : "Missing", profileError ? profileError.message : "")

    // 3. Create Report (Red Sentiment)
    console.log("2. Helper: Creating Report...")
    const dateStr = new Date().toISOString().split('T')[0]
    console.log(`   Insert Data: Team=${teamId}, User=${userId}, Date=${dateStr}`)

    const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
            team_id: teamId,
            user_id: userId,
            date: dateStr,
            sentiment: 'red',
            blockers: "Test Blocker from Script"
        })
        .select()
        .single()


    if (reportError) {
        if (reportError.code === '23505') { // Duplicate unique key
            console.log("   Report already exists for today. Deleting and re-creating...")
            await supabase.from('reports').delete().match({ team_id: teamId, user_id: userId, date: new Date().toISOString().split('T')[0] })
            // Retry
            return main()
        }
        console.error("   Create Report Failed:", reportError.message)
        process.exit(1)
    }
    console.log("   Report Created:", report.id)

    // 4. Create Plan Items
    console.log("3. Helper: Adding Plan Items...")
    const { error: itemsError } = await supabase
        .from('plan_items')
        .insert([
            { report_id: report.id, content: "Fix Bugs", type: "plan_for_tomorrow" },
            { report_id: report.id, content: "Write Tests", type: "actual_done_today", status: "done" }
        ])

    if (itemsError) console.error("   Items Failed:", itemsError.message)
    else console.log("   Items Added.")

    console.log("--- Submission Complete ---")
}

main()
