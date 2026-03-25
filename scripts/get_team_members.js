
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Sign in as manager to get access
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password',
    });

    if (authError) {
        console.error('Auth Error:', authError.message);
        process.exit(1);
    }

    // 1. Get Team ID for 'Product Development'
    const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', 'Product Development')
        .single();

    if (teamError) {
        console.error('Team Error:', teamError.message);
        process.exit(1);
    }

    console.log(`Found Team: ${teams.name} (${teams.id})`);

    // 2. Get Members
    const { data: members, error: memberError } = await supabase
        .from('team_members')
        .select(`
      user_id,
      role,
      profiles (
        email,
        name
      )
    `)
        .eq('team_id', teams.id);

    if (memberError) {
        console.error('Member Error:', memberError.message);
        process.exit(1);
    }

    console.log('Members:', JSON.stringify(members, null, 2));
}

main();
