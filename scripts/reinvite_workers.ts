
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
    console.log("Logging in as Manager...")
    // 1. Sign in as Manager
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    })

    if (loginError) {
        console.error("Login failed:", loginError.message)
        return
    }
    console.log("Logged in.")

    // 2. Get Team
    const { data: membership, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session!.user.id)
        .eq('role', 'manager')
        .single()

    if (teamError || !membership) {
        console.error("Could not find managed team:", teamError?.message)
        return
    }

    const teamId = membership.team_id
    console.log(`Found Team: ${teamId}`)

    // 3. Invite Workers
    const workers = ['worker@test.com', 'worker1@test.com', 'worker3@test.com']

    console.log("\n--- Generated Invite Links ---")
    for (const email of workers) {
        // Create Invite
        const { data, error } = await supabase
            .from('invitations')
            .insert({
                team_id: teamId,
                email,
                role: 'member'
            })
            .select('token')
            .single()

        if (error) {
            console.error(`Error inviting ${email}: ${error.message}`)
        } else {
            console.log(`${email}: http://localhost:3001/invite/${data.token}`)
        }
    }
    console.log("------------------------------\n")
}

main()
