
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyTeamData } from "@/lib/reporting/aggregator";
import { generateWeeklyReportHtml } from "@/lib/reporting/generator";

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
        // We cast the settings to our known structure
        const { data: teams, error } = await supabase
            .from("teams")
            .select("id, name, settings");

        if (error) throw error;
        if (!teams) return NextResponse.json({ message: "No teams found" });

        const results = [];
        const now = new Date();
        const currentDay = now.toLocaleDateString("en-US", { weekday: "short" }); // "Fri"
        const currentHour = now.getHours(); // 18 

        for (const team of teams) {
            try {
                // @ts-ignore
                const settings = team.settings || {};
                const reportConfig = settings.weeklyReport || {};

                // Defaults
                const enabled = reportConfig.enabled !== false; // Default true if not set? No, safer to default false if missing, but plan said default enabled in UI.
                // Let's assume safely:
                if (!enabled && !forceTeamId) continue;

                const scheduledDay = reportConfig.day || "Fri";
                const scheduledTimeStr = reportConfig.time || "18:00";
                const scheduledHour = parseInt(scheduledTimeStr.split(":")[0], 10);

                // Check Schedule (unless forced)
                const isDue = (currentDay === scheduledDay && currentHour === scheduledHour);

                if (forceTeamId) {
                    if (team.id !== forceTeamId) continue;
                } else {
                    if (!enabled || !isDue) continue;
                }

                // Generate Report
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 7); // Last 7 days

                console.log(`[CRON] Processing weekly report for team: ${team.name} (${team.id})`);

                const data = await getWeeklyTeamData(team.id, startDate, endDate);
                const html = generateWeeklyReportHtml(data, team.name);

                // "Send" Email (Log to console)
                console.log(`\n--- WEEKLY REPORT FOR ${team.name} ---\n`);
                console.log(`Subject: Weekly Roll-Up: ${team.name}`);
                console.log(`Date Range: ${data.startDate} to ${data.endDate}`);
                console.log(`Total Reports: ${data.totalReports}`);
                // console.log(html); // Too verbose to log full HTML always, maybe just a snippet or toggle?
                // If test mode (manual browser hit), we might want to return the HTML to see it.

                if (forceTeamId && textMode) {
                    // Return the HTML directly for preview
                    return new NextResponse(html, { headers: { 'content-type': 'text/html' } });
                }

                results.push({ team: team.name, status: "Success" });
            } catch (teamError: any) {
                // CRITICAL: Isolate errors per team so one failure doesn't block others
                console.error(`[CRON ERROR] Failed to process team ${team.name}:`, teamError);
                results.push({ team: team.name, status: "Failed", error: teamError.message });
                // Continue processing other teams
            }
        }

        return NextResponse.json({ success: true, processed: results });

    } catch (e) {
        console.error("Cron failed", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
