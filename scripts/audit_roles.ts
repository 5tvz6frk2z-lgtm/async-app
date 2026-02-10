
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

async function auditRoles() {
    console.log("--- AUDIT START ---");

    // 1. Check Invitations
    const { data: invites, error: inviteError } = await supabase
        .from('invitations')
        .select('*');

    if (inviteError) console.error("Invite Error:", inviteError.message);
    else {
        console.log(`Found ${invites?.length} invitations.`);
        invites?.forEach(i => {
            console.log(`INVITE: to=${i.email}, role=${i.role}, status=${i.status}`);
        });
    }

    // 2. Check Team Members
    const { data: members, error: memberError } = await supabase
        .from('team_members')
        .select('*, profiles(email)')
        .limit(20);

    if (memberError) console.error("Member Error:", memberError.message);
    else {
        console.log(`Found ${members?.length} recent members.`);
        members?.forEach(m => {
            console.log(`MEMBER: email=${m.profiles?.email}, role=${m.role}, team_id=${m.team_id}`);
        });
    }

    // Login as manager to get full visibility if RLS blocks anon?
    // The previous script logged in. But anon key with public RLS on invites (which I fixed) might work?
    // Actually, RLS on invitations restricts listing to managers.
    // So I need to sign in.
}

async function auditWithLogin() {
    const managerEmail = "manager@test.com";
    await supabase.auth.signInWithPassword({
        email: managerEmail,
        password: "password"
    });

    await auditRoles();
}

auditWithLogin().catch(console.error);
