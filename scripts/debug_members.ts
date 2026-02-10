
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Using SERVICE_ROLE if available would be better, but we only have ANON. 
    // Wait, ANON key respects RLS. I need SERVICE_ROLE to bypass RLS for the "Truth" check.
    // If user hasn't provided SERVICE_KEY, I can't do the admin check properly unless I use a backend function or direct sql.
    // I will try to use the ANON key but rely on the fact that I can seemingly write SQL via 'run_command' if I had psql.
    // Actually, I can't bypass RLS with Anon Key. 
    // I will try to just log in as Manager and see what I get. 
)

// Re-creating client with user auth
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log("--- Debugging Team Members ---")

    // 1. Sign in as Manager
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    })

    if (loginError) {
        console.error("Login failed:", loginError.message)
        return
    }
    console.log("Logged in as Manager.")

    // 2. Get Manager's Team
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
    console.log(`Team ID: ${teamId}`)

    // 3. Fetch All Members (As Manager)
    const { data: members, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)

    if (fetchError) {
        console.error("Error fetching members:", fetchError.message)
    } else {
        console.log(`Found ${members.length} members (visible to Manager):`)
        members.forEach(m => console.log(`- Role: ${m.role}, UserID: ${m.user_id}, Email: ${m.email || 'NULL'}`))
    }

    // 4. Check Invitations Status
    const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('team_id', teamId)

    if (inviteError) {
        console.error("Error fetching invitations:", inviteError.message)
    } else {
        console.log(`\nFound ${invitations.length} invitations for this team:`)
        invitations.forEach(inv => console.log(`- Email: ${inv.email}, Status: ${inv.status}, Token: ${inv.token}`))
    }

    // 4. Test RLS 'is_manager_of' manually
    // We can't call the function directly easily via JS client unless rpc.
    const { data: rpcData, error: rpcError } = await supabase.rpc('is_manager_of', { searched_team_id: teamId })
    console.log(`is_manager_of(${teamId}) returned:`, rpcData)
    if (rpcError) console.error("RPC Error:", rpcError)

    console.log("------------------------------")
}

main()
