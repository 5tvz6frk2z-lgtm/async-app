import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testServerAction() {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Login as member3
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'member3@test.com',
        password: 'password'
    })

    if (loginError) {
        console.error('Login failed:', loginError.message)
        return
    }

    console.log('✓ Logged in as member3@test.com')
    console.log('User ID:', session?.user.id)

    // Try to INSERT into team_members directly (simulating what server action does)
    const { data: invite } = await supabase
        .from('invitations')
        .select('*, team:teams(name)')
        .eq('token', 'ffb00b8d-6315-4b1e-b363-062d2c08d428')
        .single()

    console.log('\nInvite:', invite)

    if (!invite) {
        console.error('No invite found!')
        return
    }

    // Try INSERT
    console.log('\nAttempting INSERT into team_members...')
    const { data: insertData, error: insertError } = await supabase
        .from('team_members')
        .insert({
            team_id: invite.team_id,
            user_id: session?.user.id!,
            role: 'member'
        })
        .select()

    console.log('Insert result:', insertData)
    console.log('Insert error:', insertError)

    if (insertError) {
        console.error('INSERT FAILED:', insertError.message)
        console.error('Error code:', insertError.code)
        console.error('Error details:', insertError.details)
        console.error('Error hint:', insertError.hint)
    } else {
        console.log('✓ INSERT succeeded!')
    }
}

testServerAction().catch(console.error)
