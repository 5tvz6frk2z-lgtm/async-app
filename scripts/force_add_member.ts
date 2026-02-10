import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using Anon, but might need Service Role for admin actions if invited user doesn't exist.
// Ideally usage of SERVICE_ROLE key if available would be better to bypass "confirm email" etc.
// But I don't have it in plain text. I'll try standard signup.

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceAddMember() {
    const managerEmail = "manager@test.com";
    const memberEmail = `forced_member_${Date.now()}@test.com`;
    const password = "password";

    console.log(`1. Finding Manager Team: ${managerEmail}`);

    // Login Manager to find team (RLS)
    const { data: managerAuth, error: managerLoginError } = await supabase.auth.signInWithPassword({
        email: managerEmail,
        password: password
    });

    if (managerLoginError) {
        console.error("Manager login failed:", managerLoginError.message);
        return;
    }

    const managerId = managerAuth.user.id;

    const { data: teams, error: teamError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", managerId)
        .eq("role", "manager");

    if (teamError || !teams || teams.length === 0) {
        console.error("No managed team found for manager.");
        return;
    }

    const teamId = teams[0].team_id;
    console.log(`Found Team ID: ${teamId}`);

    // Logout Manager
    await supabase.auth.signOut();

    console.log(`2. Creating Member: ${memberEmail}`);
    const { data: memberAuth, error: memberSignupError } = await supabase.auth.signUp({
        email: memberEmail,
        password: password,
        options: {
            data: {
                role: 'member' // Metadata
            }
        }
    });

    if (memberSignupError) {
        console.error("Member signup failed:", memberSignupError.message);
        return;
    }

    const memberId = memberAuth.user?.id;
    if (!memberId) {
        console.error("Member created but no ID returned (Encryption/Confirmation issue?)");
        return;
    }
    console.log(`Member Created: ${memberId}`);

    // 3. Insert Member into Team
    // We need to insert this AS SOMEONE who can add members.
    // The "Join Team" policy allows "true" (anyone can join), so the new member can insert THEMSELVES.
    // Or we login as Manager and insert them.
    // Let's login as Manager again.

    const { error: reLoginError } = await supabase.auth.signInWithPassword({
        email: managerEmail,
        password: password
    });
    if (reLoginError) throw reLoginError;

    console.log("3. Adding Member to Team (as Manager)...");
    const { error: insertError } = await supabase
        .from("team_members")
        .insert({
            team_id: teamId,
            user_id: memberId,
            role: 'member'
        });

    if (insertError) {
        console.error("Failed to add member to team:", insertError.message);
    } else {
        console.log("SUCCESS! Member added to team.");
        console.log(`Login as:\nEmail: ${memberEmail}\nPassword: ${password}`);
    }
}

forceAddMember();
