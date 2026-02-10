
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mock the cron logic locally since we can't easily import the route handler which uses 'next/server'
// We will basically replicate the logic from route.ts here to test data fetching + settings parsing.
// AND we will try to invoke the API route if the server was running, but here we are in a script.

// NOTE: We cannot easily import 'internalGenerateMorningBriefing' here because it might use 'next/cache' or other server-only things
// in dependencies. But let's try to verify the DATA via Supabase first, similar to verify_summary_v2.ts

async function testCronLogic() {
    console.log("Testing Cron Logic via Supabase Query...");

    let supabase: any;
    if (supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
        console.warn("No Service Key, using Anon (might fail on RLS if not careful)");
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    // 1. Fetch Teams
    const { data: teams, error } = await supabase
        .from("teams")
        .select("id, name, settings");

    if (error) {
        console.error("Failed to fetch teams:", error);
        return;
    }

    console.log(`Found ${teams.length} teams.`);

    const now = new Date();
    const currentHour = now.getHours();
    console.log(`Current Hour: ${currentHour}:00`);

    for (const team of teams) {
        // @ts-ignore
        const settings = team.settings || {};
        const briefingConfig = settings.morningBriefing || {};

        const enabled = briefingConfig.enabled !== false;
        const scheduledTimeStr = briefingConfig.time || "07:00";
        const scheduledHour = parseInt(scheduledTimeStr.split(":")[0], 10);

        console.log(`\nTeam: ${team.name} (${team.id})`);
        console.log(`   - Enabled: ${enabled}`);
        console.log(`   - Schedule: ${scheduledTimeStr} (Hour: ${scheduledHour})`);

        if (enabled && currentHour === scheduledHour) {
            console.log("   ✅ MATCH! Briefing would be sent now.");
        } else {
            console.log("   Output: Skipped (Not due or disabled).");
        }
    }
}

testCronLogic();
