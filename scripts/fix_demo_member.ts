import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDemoMember() {
    const managerEmail = "manager@test.com";
    const memberEmail = "member@test.com";
    const password = "password";

    console.log("1. getting Manager Team ID...");
    const { data: managerAuth } = await supabase.auth.signInWithPassword({
        email: managerEmail,
        password: password
    });
    if (!managerAuth.user) throw new Error("Manager login failed");

    const { data: managerTeams } = await supabase.from("team_members").select("team_id").eq("user_id", managerAuth.user.id).eq("role", "manager");
    const targetTeamId = managerTeams?.[0]?.team_id;
    if (!targetTeamId) throw new Error("Manager has no team");
    console.log("Target Team:", targetTeamId);

    console.log("2. Cleaning Member Account...");
    const { data: memberAuth } = await supabase.auth.signInWithPassword({
        email: memberEmail,
        password: password
    });
    if (!memberAuth.user) throw new Error("Member login failed");

    const memberId = memberAuth.user.id;

    // Delete existing memberships
    const { error: delError } = await supabase.from("team_members").delete().eq("user_id", memberId);
    if (delError) console.error("Delete Error:", delError);
    else console.log("Cleared member's old teams.");

    // 3. Add to Manager's Team
    // Need to do this as active member (Manager) because of RLS? 
    // Wait, 'Join team' policy is 'true', so Member can join themselves.
    console.log("3. Joining Target Team...");
    const { error: joinError } = await supabase.from("team_members").insert({
        team_id: targetTeamId,
        user_id: memberId,
        role: "member"
    });

    if (joinError) console.error("Join Error:", joinError);
    else console.log("Member joined Manager's team!");

    // 4. Update Metadata to 'member'
    const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'member' }
    });

    if (updateError) console.error("Metadata Update Error:", updateError);
    else console.log("User Metadata updated to 'member'.");
}

fixDemoMember();
