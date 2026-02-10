
import { createClient } from "@/lib/supabase/server";

export type WeeklyReportData = {
    teamId: string;
    startDate: string;
    endDate: string;
    totalReports: number;
    sentimentBreakdown: {
        green: number;
        yellow: number;
        red: number;
    };
    blockers: {
        content: string;
        user: string;
        date: string;
    }[];
    highlights: {
        content: string;
        user: string;
        date: string;
    }[];
    participation: {
        user: string;
        count: number;
    }[];
};

export type DailyReportData = {
    teamId: string;
    date: string; // Today's date
    previousDate: string; // Yesterday's date
    sentimentBreakdown: {
        green: number;
        yellow: number;
        red: number;
    };
    completedYesterday: {
        content: string;
        user: string;
    }[];
    completedToday: {
        content: string;
        user: string;
    }[];
    workingOnToday: {
        content: string;
        user: string;
    }[];
    workingOnTomorrow: {
        content: string;
        user: string;
    }[];
    blockers: {
        content: string;
        user: string;
    }[];
    participation: {
        user: string;
        reportedToday: boolean;
    }[];
};

export async function getDailyTeamData(
    teamId: string,
    todayDate: Date
): Promise<DailyReportData> {
    const supabase = await createClient();

    // Format dates
    const todayStr = todayDate.toISOString().split("T")[0];
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Fetch Reports for today and yesterday
    const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select(`
            id,
            date,
            sentiment,
            blockers,
            user_id,
            profiles:user_id ( name )
        `)
        .eq("team_id", teamId)
        .gte("date", yesterdayStr)
        .lte("date", todayStr);

    if (reportsError) throw reportsError;

    const teamReports = reports || [];
    const todayReports = teamReports.filter(r => r.date === todayStr);
    const yesterdayReports = teamReports.filter(r => r.date === yesterdayStr);

    // Fetch Plan Items for these reports
    const reportIds = teamReports.map((r) => r.id);
    let planItems: any[] = [];

    if (reportIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
            .from("plan_items")
            .select("content, status, type, report_id")
            .in("report_id", reportIds);

        if (itemsError) throw itemsError;
        planItems = items || [];
    }

    // Build report map for lookups
    const reportMap = new Map(teamReports.map(r => [r.id, r]));
    const todayReportIds = new Set(todayReports.map(r => r.id));
    const yesterdayReportIds = new Set(yesterdayReports.map(r => r.id));

    // Aggregate sentiment from today's reports only
    const sentimentBreakdown = { green: 0, yellow: 0, red: 0 };
    todayReports.forEach((report) => {
        if (report.sentiment === "green") sentimentBreakdown.green++;
        else if (report.sentiment === "yellow") sentimentBreakdown.yellow++;
        else if (report.sentiment === "red") sentimentBreakdown.red++;
    });

    // Blockers from today's reports
    const blockers: DailyReportData["blockers"] = [];
    todayReports.forEach((report) => {
        if (report.blockers) {
            blockers.push({
                content: report.blockers,
                // @ts-ignore
                user: report.profiles?.name || "Unknown",
            });
        }
    });

    // Categorize plan items
    const completedYesterday: DailyReportData["completedYesterday"] = [];
    const completedToday: DailyReportData["completedToday"] = [];
    const workingOnToday: DailyReportData["workingOnToday"] = [];
    const workingOnTomorrow: DailyReportData["workingOnTomorrow"] = [];

    planItems.forEach(item => {
        const r = reportMap.get(item.report_id);
        if (!r) return;
        // @ts-ignore
        const userName = r.profiles?.name || "Unknown";
        const isToday = todayReportIds.has(item.report_id);
        const isYesterday = yesterdayReportIds.has(item.report_id);

        // Done items: actual_done_today type with done status
        if (item.type === "actual_done_today" && item.status === "done") {
            if (isToday) {
                completedToday.push({ content: item.content, user: userName });
            } else if (isYesterday) {
                completedYesterday.push({ content: item.content, user: userName });
            }
        }

        // Working on today: yesterday's "plan_for_tomorrow" becomes today's work
        if (item.type === "plan_for_tomorrow" && isYesterday) {
            workingOnToday.push({ content: item.content, user: userName });
        }

        // Working on tomorrow: today's "plan_for_tomorrow" items
        if (item.type === "plan_for_tomorrow" && isToday) {
            workingOnTomorrow.push({ content: item.content, user: userName });
        }
    });

    // Participation: who reported today
    // First, fetch team member user_ids
    const { data: memberRows, error: memberError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId)
        .neq("role", "manager");

    if (memberError) {
        console.error("Error fetching team members:", memberError);
    }

    const memberUserIds = (memberRows || [])
        .map((m: any) => m.user_id)
        .filter((id: any) => Boolean(id));

    // Then fetch profiles for those user_ids
    let profilesMap = new Map<string, string>();
    if (memberUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", memberUserIds);

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
        }

        (profilesData || []).forEach((p: any) => {
            profilesMap.set(p.id, p.name || p.email?.split('@')[0] || "Unknown");
        });
    }

    const todayUserIds = new Set(todayReports.map(r => r.user_id));
    const participation = memberUserIds.map((userId: string) => ({
        user: profilesMap.get(userId) || "Unknown",
        reportedToday: todayUserIds.has(userId),
    }));

    return {
        teamId,
        date: todayStr,
        previousDate: yesterdayStr,
        sentimentBreakdown,
        completedYesterday,
        completedToday,
        workingOnToday,
        workingOnTomorrow,
        blockers,
        participation,
    };
}

export async function getWeeklyTeamData(
    teamId: string,
    startDate: Date,
    endDate: Date
): Promise<WeeklyReportData> {
    const supabase = await createClient();

    // Format dates for query
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    // Fetch Reports - Filter directly by team_id (N+1 fix)
    const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select(`
      id,
      date,
      sentiment,
      blockers,
      user_id,
      profiles:user_id ( name )
    `)
        .eq("team_id", teamId)
        .gte("date", startStr)
        .lte("date", endStr);

    if (reportsError) throw reportsError;

    // Reports are now already filtered by team_id
    const teamReports = reports || [];

    // Fetch Plan Items (Highlights)
    // We want `actual_done_today` items for these reports.
    const reportIds = teamReports.map((r) => r.id);
    let planItems: any[] = [];

    if (reportIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
            .from("plan_items")
            .select("content, status, type, report_id")
            .in("report_id", reportIds)
            .eq("type", "actual_done_today")
            .eq("status", "done");

        if (itemsError) throw itemsError;
        planItems = items || [];
    }

    // Aggregate Data
    const sentimentBreakdown = {
        green: 0,
        yellow: 0,
        red: 0,
    };

    const blockers: WeeklyReportData["blockers"] = [];
    const participationMap = new Map<string, number>();

    teamReports.forEach((report) => {
        // Sentiment
        if (report.sentiment === "green") sentimentBreakdown.green++;
        else if (report.sentiment === "yellow") sentimentBreakdown.yellow++;
        else if (report.sentiment === "red") sentimentBreakdown.red++;

        // Blockers
        if (report.blockers) {
            blockers.push({
                content: report.blockers,
                // @ts-ignore
                user: report.profiles?.name || "Unknown",
                date: report.date,
            });
        }

        // Participation
        // @ts-ignore
        const userName = report.profiles?.name || "Unknown";
        participationMap.set(userName, (participationMap.get(userName) || 0) + 1);
    });

    // Highlights
    // Map plan items back to users
    const reportMap = new Map(teamReports.map(r => [r.id, r]));
    const highlights = planItems.map(item => {
        const r = reportMap.get(item.report_id);
        return {
            content: item.content,
            // @ts-ignore
            user: r?.profiles?.name || "Unknown",
            // @ts-ignore
            date: r?.date || "",
        };
    });

    return {
        teamId,
        startDate: startStr,
        endDate: endStr,
        totalReports: teamReports.length,
        sentimentBreakdown,
        blockers,
        highlights,
        participation: Array.from(participationMap.entries()).map(([user, count]) => ({ user, count })),
    };
}
