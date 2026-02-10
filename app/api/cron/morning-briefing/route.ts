
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { internalGenerateMorningBriefing } from "@/app/actions/summary";

export async function GET(req: NextRequest) {
    const supabase = await createClient();


    // Security: Verify Secret if not in dev
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse URL params for manual triggering/testing
    const textMode = req.nextUrl.searchParams.get("test") === "true";
    const forceTeamId = req.nextUrl.searchParams.get("teamId");

    try {
        // Fetch all teams with settings
        const { data: teams, error } = await supabase
            .from("teams")
            .select("id, name, settings");

        if (error) throw error;
        if (!teams) return NextResponse.json({ message: "No teams found" });

        const results = [];
        const now = new Date();
        const currentHour = now.getHours();

        for (const team of teams) {
            // @ts-ignore
            const settings = team.settings || {};
            const briefingConfig = settings.morningBriefing || {};

            // Defaults: Enabled by default (as per user request "sent out by default")
            // BUT we should respect the toggle if explicitly set to false? 
            // The user said: "get sent out by default... update managers settings so that they can change".
            // So if settings is empty, it should be enabled.
            // My SettingsProvider defaults to TRUE.
            // But here, 'settings' comes from DB. If empty, we need consistency.
            // Let's assume if config is missing, it's enabled 07:00, OR we rely on the fact that SettingsProvider
            // defaults are only client-side? No, we should mirror defaults here.

            const enabled = briefingConfig.enabled !== false;
            if (!enabled && !forceTeamId) continue;

            const scheduledTimeStr = briefingConfig.time || "07:00";
            const scheduledHour = parseInt(scheduledTimeStr.split(":")[0], 10);

            // Check Schedule (unless forced)
            const isDue = (currentHour === scheduledHour);

            if (forceTeamId) {
                if (team.id !== forceTeamId) continue;
            } else {
                if (!isDue) continue; // Only check hour for daily briefing
            }

            // Generate Briefing
            results.push({ team: team.name, status: "Generating" });

            console.log(`\n--- MORNING BRIEFING FOR ${team.name} ---\n`);

            // Call the action
            // Note: generateMorningBriefing is a server action. calling it here is fine.
            // It expects 'teamId'.
            // However, the action returns a STRING (markdown).
            const briefing = await internalGenerateMorningBriefing(supabase, team.id);

            console.log(`Subject: Morning Briefing: ${team.name}`);
            console.log(briefing);

            if (forceTeamId && textMode) {
                // Return text for preview
                return new NextResponse(briefing, { headers: { 'content-type': 'text/markdown' } });
            }
        }

        return NextResponse.json({ success: true, verified_count: results.length, details: results });

    } catch (e) {
        console.error("Cron failed", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
