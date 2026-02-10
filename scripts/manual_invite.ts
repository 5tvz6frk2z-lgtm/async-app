
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateInvite() {
    const managerEmail = "manager@test.com";

    console.log("Logging in...");
    // 1. Log in as Manager
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: managerEmail,
        password: "password"
    });

    if (authError || !authData.user) {
        console.error("Failed to login as manager:", authError);
        return;
    }

    const userId = authData.user.id;
    console.log("Logged in as:", userId);

    // 2. Get Manager's Team
    const { data: memberships, error: memError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('role', 'manager');

    if (memError || !memberships || memberships.length === 0) {
        console.error("Manager has no team!", memError);
        return;
    }

    const teamId = memberships[0].team_id;
    console.log("Team ID:", teamId);

    // Clean up previous invite for this email if any
    const inviteEmail = "manual_invite_03@test.com";
    // await supabase.from('invitations').delete().eq('email', inviteEmail); // Requires permissions, might fail if RLS prevents delete by email query, but worth a try or just ignore.

    console.log(`Generating invite for ${inviteEmail} to team ${teamId}...`);

    // 3. Create Invitation
    const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .insert({
            team_id: teamId,
            email: inviteEmail,
            role: 'member'
        })
        .select()
        .single();

    if (inviteError) {
        console.error("Failed to create invite:", inviteError);
        return;
    }

    console.log("INVITE GENERATED SUCCESSFULLY!");
    console.log("Token:", invite.token);
    console.log("Link:", `http://localhost:3001/invite/${invite.token}`);
}

generateInvite().catch(e => console.error("Script Error:", e));
