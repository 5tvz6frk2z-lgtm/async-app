
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAccess() {
    console.log("Testing access...")

    // 1. Sign up/Sign in a temp user
    const email = `debug_${Date.now()}@test.com`
    const password = "password123"

    console.log(`Creating test user: ${email}`)
    const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: "Debug User", role: "member" } }
    })

    if (authError) {
        console.error("Auth error:", authError.message)
        // Try sign in
    }

    const user = auth.user
    if (!user) {
        console.error("No user created")
        return
    }

    console.log("User ID:", user.id)

    // 2. Insert a team (simulate join) - Wait, member cannot create team? 
    // Wait, CreateTeamForm inserts team! 
    // And inserts team_members!

    // Let's try to insert ourselves into a team (if RLS allows)
    // Actually, create team first
    const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: "Debug Team", billing_email: email })
        .select()
        .single()

    if (teamError) {
        console.error("Team Create Error:", teamError.message)
        // If we can't create team, maybe we can't do anything?
    } else {
        console.log("Team Created:", team.id)

        // 3. Insert Member
        const { error: memberError } = await supabase
            .from("team_members")
            .insert({ team_id: team.id, user_id: user.id, role: 'manager' })

        if (memberError) {
            console.error("Member Insert Error:", memberError.message)
        } else {
            console.log("Member Inserted.")
        }
    }

    // 4. CHECK VISIBILITY
    console.log("Checking visibility of team_members...")
    const { data: members, error: readError } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", user.id)

    if (readError) {
        console.error("Read Error:", readError.message)
    } else {
        console.log(`Found ${members?.length} memberships.`)
        if (members?.length === 0) {
            console.error("CRITICAL: RLS is hiding the membership!")
        } else {
            console.log("RLS seems OK.")
        }
    }
}

testAccess()
