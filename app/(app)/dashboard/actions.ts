
"use server";

import { createClient } from "@/lib/supabase/server";
import { getWeeklyTeamData, getDailyTeamData } from "@/lib/reporting/aggregator";
import { toZonedTime, format } from 'date-fns-tz';

export async function getLatestWeeklyReport(teamId: string, userTimezone?: string) {
    const supabase = await createClient();

    // Default to UTC if no timezone provided
    const timezone = userTimezone || 'UTC';

    // 1. Fetch Team Settings
    const { data: team, error } = await supabase
        .from("teams")
        .select("settings")
        .eq("id", teamId)
        .single();

    if (error || !team) throw new Error("Team not found");

    // @ts-ignore
    const settings = team.settings || {};
    const reportConfig = settings.weeklyReport || {};
    const scheduledDay = reportConfig.day || "Fri";
    const scheduledTimeStr = reportConfig.time || "18:00";
    const scheduledHour = parseInt(scheduledTimeStr.split(":")[0], 10);

    // 2. Determine Report Range using timezone-aware dates
    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const currentDayStr = format(zonedNow, 'EEE', { timeZone: timezone });
    const currentHour = zonedNow.getHours();

    // Helper to get date of day in current week
    // Sunday is 0, Monday is 1...
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const scheduledDayIdx = days.indexOf(scheduledDay); // e.g. Fri = 5
    // Current Day Index (use zoned date)
    const currentDayIdx = zonedNow.getDay();

    // We want to find the "Report Date" (the day the report is generated).
    // If we are AFTER the scheduled time on scheduled day, OR AFTER the scheduled day:
    // Then the "Current Week's Report" is valid/generated.
    // Else, "Last Week's Report" is the latest one.

    // SIMULATION: Always show current week's progress
    let showCurrentWeek = true;

    // if (currentDayIdx > scheduledDayIdx) {
    //     showCurrentWeek = true;
    // } else if (currentDayIdx === scheduledDayIdx) {
    //     if (currentHour >= scheduledHour) {
    //         showCurrentWeek = true;
    //     }
    // }

    // Calculate the End Date of the report
    // If showCurrentWeek, End Date = This Week's Scheduled Day
    // If !showCurrentWeek, End Date = Last Week's Scheduled Day

    const targetEndDate = new Date(now);

    // Adjust to the scheduled day of *this* week first
    const dayDiff = scheduledDayIdx - currentDayIdx;
    targetEndDate.setDate(now.getDate() + dayDiff);

    // If not showing current week, subtract 7 days
    if (!showCurrentWeek) {
        targetEndDate.setDate(targetEndDate.getDate() - 7);
    }

    // Set time to end of day? Or scheduled time?
    // Report usually covers the full day or up to generation time.
    // aggregator uses YYYY-MM-DD string comp, so it covers the whole day inclusive.

    const startDate = new Date(targetEndDate);
    startDate.setDate(targetEndDate.getDate() - 6); // 7 day window including end date (e,g, Sat -> Fri)

    // 3. Fetch Data
    const data = await getWeeklyTeamData(teamId, startDate, targetEndDate);

    return { data, teamName: settings.teamName || "Team" };
}

export async function getLatestDailyReport(teamId: string) {
    const supabase = await createClient();

    // Fetch Team Settings for team name
    const { data: team, error } = await supabase
        .from("teams")
        .select("settings")
        .eq("id", teamId)
        .single();

    if (error || !team) throw new Error("Team not found");

    // @ts-ignore
    const settings = team.settings || {};

    // Use today's date
    const today = new Date();

    // Fetch daily data
    const data = await getDailyTeamData(teamId, today);

    return { data, teamName: settings.teamName || "Team" };
}

