
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log("--- Seeding Fresh Data ---")

    const managerEmail = 'manager@test.com'
    const workerEmail = 'worker@test.com'
    const password = 'password'

    // 1. SignUp Manager
    console.log(`1. Signing Up Manager (${managerEmail})...`)
    const { data: mgrData, error: mgrError } = await supabase.auth.signUp({
        email: managerEmail,
        password: password
    })

    if (mgrError) {
        console.error("   SignUp Failed:", mgrError.message)
        return
    }

    // Check if user is already confirmed (or created)
    if (!mgrData.session) {
        console.log("   User created but requires Email Confirmation. Please confirm email manually if testing locally.")
        console.log("   (If using Supabase Local, check Inbucket http://localhost:54324 )")
        return
    }
    console.log("   Manager Signed In:", mgrData.user!.id)

    // 2. Create Team (Onboarding Flow Simulation)
    console.log("2. Creating Team 'Fresh Team'...")
    // In our app, we usually do this via API or direct Insert if RLS allows.
    // RLS: "Members can view their teams", "Managers can update".
    // Insert? We don't have an explicit "Insert Team" policy in tables.sql?
    // Let's check tables.sql...
    // create table teams ...
    // policy "Members can view..."
    // policy "Managers can update..."
    // MISSING INSERT POLICY for Teams?
    // Usually "authenticated" users can insert a team.
    // If missing, I can't insert via Client.
    // I might need to add `create policy "Enable insert for authenticated users only" on public.teams for insert with check (auth.role() = 'authenticated');`
    // Let's assume there is one or default is open? No, default is closed if RLS enabled.

    // I'll try to insert. If fail, I need to add policy.
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name: "Fresh Team", subscription_status: 'active' })
        .select()
        .single()

    if (teamError) {
        console.error("   Create Team Failed:", teamError.message)
        console.log("   (You might need to add an INSERT policy for 'teams')")
        return
    }
    console.log("   Team Created:", team.id)

    // 3. Add Manager to Team
    console.log("3. Adding Manager to Team...")
    const { error: memberError } = await supabase
        .from('team_members')
        .insert({
            team_id: team.id,
            user_id: mgrData.user!.id,
            role: 'manager'
        })

    if (memberError) {
        console.error("   Add Member Failed:", memberError.message)
        return
    }
    console.log("   Manager added to team.")

    // 4. SignUp Worker
    console.log(`4. Signing Up Worker (${workerEmail})...`)
    const { data: wkrData, error: wkrError } = await supabase.auth.signUp({
        email: workerEmail,
        password: password
    })

    if (wkrError || !wkrData.session) {
        console.error("   Worker SignUp Failed/Pending:", wkrError?.message || "Check Email")
        // If pending, we can't proceed.
        return
    }
    console.log("   Worker Signed In:", wkrData.user!.id)

    // 5. Join Worker to Team (Directly for seeding)
    console.log("5. Adding Worker to Team...")
    const { error: joinError } = await supabase
        .from('team_members')
        .insert({
            team_id: team.id,
            user_id: wkrData.user!.id,
            role: 'member'
        })

    if (joinError) console.error("   Worker Join Failed:", joinError.message)
    else console.log("   Worker added to team.")

    console.log("--- Seeding Complete ---")
}

main()
