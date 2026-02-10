import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testMembershipVisibility() {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Login as the new member
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'verification_test@test.com',
        password: 'password123'
    })

    if (loginError) {
        console.error('Login failed:', loginError.message)
        return
    }

    console.log('✓ Logged in as verification_test@test.com')
    console.log('User ID:', session?.user.id)

    // Try to fetch team_members
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', session?.user.id!)

    console.log('\n--- Team Members Query ---')
    console.log('Error:', membersError)
    console.log('Data:', members)

    // Try to fetch with team join
    const { data: membersWithTeam, error: joinError } = await supabase
        .from('team_members')
        .select('*, team:teams(*)')
        .eq('user_id', session?.user.id!)

    console.log('\n--- Team Members with Team Join ---')
    console.log('Error:', joinError)
    console.log('Data:', JSON.stringify(membersWithTeam, null, 2))

    // Check if team is null
    if (membersWithTeam && membersWithTeam.length > 0) {
        membersWithTeam.forEach((m, i) => {
            console.log(`\nMembership ${i}:`)
            console.log('  team_id:', m.team_id)
            console.log('  team object:', m.team ? 'EXISTS' : 'NULL')
            if (m.team) {
                console.log('  team.name:', m.team.name)
            }
        })
    }
}

testMembershipVisibility().catch(console.error)
