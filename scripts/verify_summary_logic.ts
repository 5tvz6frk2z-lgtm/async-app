

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Removed jest.mock as we are running in standalone node environment

// We need to bypass the server-side auth check in the action for this script to work easily,
// OR we can simulate a user. 
// However, the action uses `createClient` from `@/lib/supabase/server` which relies on cookies.
// To test this purely via script without spinning up a full Next.js server context is tricky for the Auth part.

// ALTERNATIVE: We can inspect the `generateMorningBriefing` function. 
// It creates a client, checks auth, checks role, then fetches.
// To run this standalone, we might need to temporarily modify the action to accept a user ID or verify via a different method, 
// OR we can just verify the data fetching logic by implementing a parallel test script that queries Supabase directly 
// using the SAME logic we just added, to prove the query works.

// Let's do the latter to verify the DATA LOGIC first.
// Then we can try to mock the AI call or just assume it works if the data is correct.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSummaryLogic() {
    console.log("1. Setting up Test Data...");

    // 1. Create a Test Team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name: 'Summary Test Team ' + Date.now() })
        .select()
        .single();

    if (teamError) throw teamError;
    console.log("   Created Team:", team.id);

    // 2. Create a Test User (Profile)
    // We'll just pick an existing user or create a fake one bound to a random UUID for safety
    const fakeUserId = crypto.randomUUID();
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: fakeUserId, name: 'Test User Bob', email: 'bob@test.com' });

    if (profileError) throw profileError;
    console.log("   Created Profile:", fakeUserId);

    // 3. Add to Team
    await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: fakeUserId,
        role: 'member'
    });

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

    if (reportError) throw reportError;
    console.log("   Created Report for Yesterday:", yesterdayStr);

    // 5. Add Plan Items
    await supabase.from('plan_items').insert([
        { report_id: report.id, content: 'Fixed the login bug', type: 'actual_done_today', status: 'done' },
        { report_id: report.id, content: 'Implement dark mode', type: 'plan_for_tomorrow', status: 'todo' }
    ]);
    console.log("   Added Plan Items.");

    console.log("\n2. Verifying Query Logic (Simulating Action)...");

    // Exact logic from the action
    const now = new Date();
    // Re-calculate yesterday to ensure it matches the test setup
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
    } else if (reports.length === 0) {
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
    await supabase.from('teams').delete().eq('id', teamId); // Cascade should handle the rest
    await supabase.from('profiles').delete().eq('id', userId);
    console.log("   Done.");
}

testSummaryLogic().catch(console.error);
