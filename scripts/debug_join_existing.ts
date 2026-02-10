
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testJoinAccess() {
    console.log("Testing Join Existing Team Access...")

    // 1. Login as Manager (or create new one)
    const managerEmail = `manager_${Date.now()}@test.com`
    const { data: managerAuth, error: managerError } = await supabase.auth.signUp({
        email: managerEmail,
        password: "password123",
        options: { data: { role: "manager" } }
    })

    if (managerError) {
        console.error("Manager Signup Error:", managerError.message)
        return
    }
    const manager = managerAuth.user!
    console.log("Manager Created:", manager.id)

    // 2. Manager Creates Team
    const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: "Manager's Team", billing_email: managerEmail })
        .select()
        .single()

    if (teamError) {
        console.error("Team Create Error:", teamError.message)
        return
    }
    console.log("Team Created:", team.id)

    // 3. Manager inserts themselves (usually happens automatically via UI, but we do manually here if RLS allows)
    await supabase.from("team_members").insert({ team_id: team.id, user_id: manager.id, role: 'manager' })

    // 4. Create New Member
    const memberEmail = `member_${Date.now()}@test.com`
    const { data: memberAuth, error: memberError } = await supabase.auth.signUp({
        email: memberEmail,
        password: "password123",
        options: { data: { role: "member" } }
    })

    if (memberError) {
        console.error("Member Signup Error:", memberError.message)
        return
    }
    const member = memberAuth.user!
    console.log("Member Created:", member.id)

    // 5. Member Joins Team (Insert into team_members)
    // We must use a client logged in as MEMBER to test permissions
    // But `supabase` const is using ANON key.
    // To simluate RLS as user, we need to sign in? 
    // supabase.auth.signInWithPassword updates the client session.

    console.log("Signing in as Member...")
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: memberEmail,
        password: "password123"
    })

    if (signInError) {
        console.error("Sign In Error:", signInError.message)
        return
    }

    console.log("Inserting Member into Manager's Team...")
    const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: member.id, role: 'member' })

    if (joinError) {
        console.error("Join Error (RLS Block?):", joinError.message)
        // If this fails, then Member CANNOT join (Insert blocked).
    } else {
        console.log("Member Joined Successfully.")

        // 6. Check Visibility of Team
        console.log("Checking visibility of Team Details...")
        const { data: members, error: readError } = await supabase
            .from("team_members")
            .select("*, team:teams(*)") // This is what AuthProvider does
            .eq("user_id", member.id)

        if (readError) {
            console.error("Read Error:", readError.message)
        } else {
            console.log(`Found ${members?.length} memberships.`)
            if (members && members.length > 0) {
                const first = members[0]
                console.log("Member Row:", first)
                if (first.team) {
                    console.log("Team Details Visible:", first.team.name)
                } else {
                    console.error("CRITICAL: Team Details are NULL! (Teams RLS Block)")
                }
            }
        }
    }
}

testJoinAccess()
