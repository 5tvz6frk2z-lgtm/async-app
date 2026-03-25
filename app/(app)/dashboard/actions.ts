
"use server";

import { createClient } from "@/lib/supabase/server";
import { getWeeklyTeamData, getDailyTeamData } from "@/lib/reporting/aggregator";
import { toZonedTime, format } from 'date-fns-tz';

export async function getLatestWeeklyReport(teamId: string, userTimezone?: string) {
    const supabase = await createClient();

    // F2: Auth guard — verify user is a member of this team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", teamId)
        .single();

    if (!membership) throw new Error("Unauthorized: Not a member of this team");

    // Default to UTC if no timezone provided
    const timezone = userTimezone || 'UTC';

    // 1. Fetch Team Settings
    const { data: team, error } = await supabase
        .from("teams")
        .select("settings")
        .eq("id", teamId)
        .single();

    if (error || !team) throw new Error("Team not found");

    // F13: Proper type assertion instead of @ts-ignore
    const settings = (team.settings || {}) as Record<string, any>;
    const reportConfig = settings.weeklyReport || {};
    const scheduledDay = reportConfig.day || "Fri";
    const scheduledTimeStr = reportConfig.time || "18:00";
    const scheduledHour = parseInt(scheduledTimeStr.split(":")[0], 10);

    // 2. Determine Report Range using timezone-aware dates
    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const currentDayStr = format(zonedNow, 'EEE', { timeZone: timezone });
    const currentHour = zonedNow.getHours();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const scheduledDayIdx = days.indexOf(scheduledDay);
    const currentDayIdx = zonedNow.getDay();

    let showCurrentWeek = true;

    const targetEndDate = new Date(now);
    const dayDiff = scheduledDayIdx - currentDayIdx;
    targetEndDate.setDate(now.getDate() + dayDiff);

    if (!showCurrentWeek) {
        targetEndDate.setDate(targetEndDate.getDate() - 7);
    }

    const startDate = new Date(targetEndDate);
    startDate.setDate(targetEndDate.getDate() - 6);

    // 3. Fetch Data
    const data = await getWeeklyTeamData(teamId, startDate, targetEndDate);

    return { data, teamName: settings.teamName || "Team" };
}

export async function getLatestDailyReport(teamId: string) {
    const supabase = await createClient();

    // F2: Auth guard — verify user is a member of this team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", teamId)
        .single();

    if (!membership) throw new Error("Unauthorized: Not a member of this team");

    // Fetch Team Settings for team name
    const { data: team, error } = await supabase
        .from("teams")
        .select("settings")
        .eq("id", teamId)
        .single();

    if (error || !team) throw new Error("Team not found");

    const settings = (team.settings || {}) as Record<string, any>;

    const today = new Date();
    const data = await getDailyTeamData(teamId, today);

    return { data, teamName: settings.teamName || "Team" };
}
