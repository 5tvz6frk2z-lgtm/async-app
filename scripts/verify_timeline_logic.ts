
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
    console.log("--- Verifying Timeline Logic ---")

    // 1. Login as Manager
    console.log("1. Logging in as Manager...")
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email: process.env.TEST_MANAGER_EMAIL || 'manager@test.com',
        password: process.env.TEST_MANAGER_PASSWORD || 'password'
    })

    if (loginError) {
        console.error("Login failed:", loginError.message)
        process.exit(1)
    }
    const mgrId = sessionData.session!.user.id
    console.log("   Success. Manager ID:", mgrId)

    // 2. Get Team
    const { data: membership, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', mgrId)
        .eq('role', 'manager')
        .single()

    if (teamError || !membership) {
        console.error("   Failed to find team:", teamError?.message)
        process.exit(1)
    }
    const teamId = membership.team_id
    console.log("   Team ID:", teamId)

    // 3. Test Timeline Query (Join Reports + Profiles + Plan Items)
    console.log("\n2. Testing Timeline Query...")
    const { data: reports, error: queryError } = await supabase
        .from("reports")
        .select(`
            id,
            date,
            sentiment,
            blockers,
            created_at,
            profiles ( name, email ),
            plan_items ( id, content, type, status )
        `)
        .eq("team_id", teamId)
        .order("date", { ascending: false })
        .limit(5)

    if (queryError) {
        console.error("   Query Failed:", queryError.message)
        process.exit(1)
    }

    console.log(`   Fetched ${reports.length} reports.`)
    if (reports.length > 0) {
        const r = reports[0]
        // @ts-ignore
        console.log(`   Sample Report by [${r.profiles?.email}]: Sentiment=${r.sentiment}, PlanItems=${r.plan_items.length}`)

        // 4. Test Edit Logic (Update Report)
        console.log("\n3. Testing Edit Logic (Update Report)...")
        const newSentiment = r.sentiment === 'green' ? 'yellow' : 'green'

        // 4a. Update Sentiment
        const { error: updateError } = await supabase
            .from("reports")
            .update({ sentiment: newSentiment })
            .eq("id", r.id)

        if (updateError) {
            console.error("   Update Sentiment Failed:", updateError.message)
        } else {
            console.log(`   Sentiment updated to ${newSentiment}.`)
        }

        // 4b. Update Plan Items (Delete & Insert strategy match)
        const { error: deleteError } = await supabase
            .from("plan_items")
            .delete()
            .eq("report_id", r.id)
            .eq("type", "plan_for_tomorrow")

        if (deleteError) {
            console.error("   Delete Plan Items Failed:", deleteError.message)
        } else {
            const { error: insertError } = await supabase.from("plan_items").insert({
                report_id: r.id,
                content: "Verified by Script " + new Date().toISOString(),
                type: "plan_for_tomorrow",
                status: "todo"
            })
            if (insertError) console.error("   Insert New Item Failed:", insertError.message)
            else console.log("   Plan Items updated successfully.")
        }

    } else {
        console.log("   No reports found to test edit logic. (Please submit a report as a worker first)")
    }

    console.log("\n--- Verification Complete ---")
}

main()
