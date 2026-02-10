
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabase: ReturnType<typeof createClient>;

if (supabaseServiceKey) {
    console.log("   Using Service Role Key");
    supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
    console.warn("   ⚠️  SUPABASE_SERVICE_ROLE_KEY not found. Attempting with Anon Key & SignUp...");
    if (!supabaseAnonKey) {
        console.error("   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing too!");
        process.exit(1);
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

async function testSummaryLogic() {
    console.log("1. Setting up Test Data...");

    let userId = '';
    let teamId = '';

    if (!supabaseServiceKey) {
        // Try to sign up a temp user
        const email = `test-${Date.now()}@example.com`;
        const password = `Password123!`;
        console.log(`   Attempting signup with ${email}...`);

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            console.error("   ❌ SignUp Failed:", authError.message);
            console.log("   Skipping automated verification due to missing Service Key and Auth restrictions.");
            return;
        }

        if (authData.user) {
            console.log("   ✅ Signed up temp user:", authData.user.id);
            userId = authData.user.id;

            if (!authData.session) {
                console.warn("   ⚠️  User created but no session (Email confirmation likely required).");
                console.warn("   Skipping automated verification.");
                return;
            }
        }
    } else {
        // Service Role doesn't need auth, just user ID for the record
        userId = crypto.randomUUID();
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: userId, name: 'Test User Bob', email: 'bob@test.com' });

        if (profileError) throw profileError;
        console.log("   Created Profile:", userId);
    }

    // 1. Create a Test Team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name: 'Summary Test Team ' + Date.now() })
        .select()
        .single();

    if (teamError) {
        console.error("   ❌ Team Creation Failed:", teamError.message);
        return;
    }
    console.log("   Created Team:", team.id);
    teamId = team.id;

    // 3. Add to Team
    const { error: memberError } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'member'
    });

    if (memberError) {
        console.error("   ❌ Member Add Failed:", memberError.message);
        return;
    }

    // 4. Create a Report for YESTERDAY
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
            team_id: teamId,
            user_id: userId,
            date: yesterdayStr,
            sentiment: 'green',
            blockers: 'Waiting on API keys'
        })
        .select()
        .single();

    if (reportError) {
        console.error("   ❌ Report Creation Failed:", reportError.message);
        return;
    }
    console.log("   Created Report for Yesterday:", yesterdayStr);

    // 5. Add Plan Items
    const { error: itemsError } = await supabase.from('plan_items').insert([
        { report_id: report.id, content: 'Fixed the login bug', type: 'actual_done_today', status: 'done' },
        { report_id: report.id, content: 'Implement dark mode', type: 'plan_for_tomorrow', status: 'todo' }
    ]);

    if (itemsError) {
        console.error("   ❌ Item Insert Failed:", itemsError.message);
        return;
    }
    console.log("   Added Plan Items.");

    console.log("\n2. Verifying Query Logic (Simulating Action)...");

    // Exact logic from the action
    const now = new Date();
    const yesterdayCheck = new Date(now);
    yesterdayCheck.setDate(yesterdayCheck.getDate() - 1);
    const yesterdayCheckStr = yesterdayCheck.toISOString().split('T')[0];

    console.log(`   Querying for date: ${yesterdayCheckStr}`);

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
          id,
          date,
          sentiment,
          blockers,
          created_at,
          profiles ( name ),
          plan_items ( content, type, status )
        `)
        .eq('team_id', teamId)
        .eq('date', yesterdayCheckStr);

    if (error) {
        console.error("   ❌ Query Failed:", error);
    } else if (!reports || reports.length === 0) {
        console.error("   ❌ No reports found! Logic is broken.");
    } else {
        console.log("   ✅ Reports Found:", reports.length);
        const r = reports[0];
        console.log("      - Date:", r.date);
        console.log("      - Sentiment:", r.sentiment);
        // @ts-ignore
        console.log("      - items:", r.plan_items.length);

        // Verify Content Mapping
        // @ts-ignore
        const completedYesterday = r.plan_items
            // @ts-ignore
            .filter((i: any) => i.type === 'actual_done_today')
            // @ts-ignore
            .map((i: any) => i.content);

        // @ts-ignore
        const planForToday = r.plan_items
            // @ts-ignore
            .filter((i: any) => i.type === 'plan_for_tomorrow')
            // @ts-ignore
            .map((i: any) => i.content);

        console.log("      - Completed Yesterday:", completedYesterday);
        console.log("      - Plan For Today:", planForToday);

        if (completedYesterday.includes('Fixed the login bug') && planForToday.includes('Implement dark mode')) {
            console.log("   ✅ Content verification PASSED");
        } else {
            console.error("   ❌ Content verification FAILED");
        }
    }

    console.log("\n3. Cleanup...");
    await supabase.from('teams').delete().eq('id', teamId);
    if (!supabaseServiceKey) {
        // Can't delete self easily without service key usually, but let's try
        // Or just leave the temp user, it's a dev env
    } else {
        await supabase.from('profiles').delete().eq('id', userId);
    }
    console.log("   Done.");
}

testSummaryLogic().catch(console.error);
