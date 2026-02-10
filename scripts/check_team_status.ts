import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent dir if needed, or current
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamMembers() {
    // 1. Get Manager
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    // Note: client-side auth doesn't have listUsers usually, need service_role for admin. 
    // But we are using ANON key? Admin requires SERVICE_ROLE key.
    // Let's rely on querying the public tables which RLS might block if we aren't careful.
    // Actually, I can just query `team_members` if RLS allows or if I use service role.

    // I will try to sign at least one known user to check *their* view.
    // Or better, I'll use the Service Role Key if available in .env.local, but I can't see it easily.
    // I will try to just Login as manager@test.com and query.
}

// Actually, easier to just use `psql` or `supabase` CLI if available?
// I'll stick to a script that mimics the app using the simple client, or tries to read via a known user.

// Let's try to just sign in as manager@test.com
async function run() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    });

    if (authError) {
        console.error("Manager Login Failed:", authError.message);
        return;
    }

    console.log("Logged in as Manager.");
    const user = authData.user;

    // Get Teams
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
            *,
            team:teams(*),
            profile:profiles(*)
        `)
        .eq('user_id', user!.id);

    if (membersError) {
        console.error("Error fetching my memberships:", membersError);
        return;
    }

    if (!members || members.length === 0) {
        console.log("Manager has no teams.");
        return;
    }

    const teamId = members[0].team_id;
    console.log(`Manager is in team: ${members[0].team.name} (${teamId})`);

    // Now fetch ALL members of this team
    const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
            role,
            user_id,
            profile:profiles(email)
        `)
        .eq('team_id', teamId);

    if (teamError) {
        console.error("Error fetching team members:", teamError);
        return;
    }

    console.log("\n--- Team Members ---");
    teamMembers.forEach(m => {
        // @ts-ignore
        console.log(`- Role: ${m.role}, Email: ${m.profile?.email || m.user_id}`);
    });
    console.log("--------------------");
}

run();
