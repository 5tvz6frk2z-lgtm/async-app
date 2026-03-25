'use server';

import { createClient } from '@/lib/supabase/server';
import { model } from '@/lib/gemini';

export type BurnoutRiskLevel = 'low' | 'medium' | 'high';

export interface BurnoutRiskResult {
    riskLevel: BurnoutRiskLevel;
    reasons: string[];
    label: string; // Human-friendly label: "Support Opportunity", "Check-in Suggested", or ""
    latestReportDate: string; // ISO date string of the most recent report considered
}

interface ReportWithItems {
    user_id: string;
    date: string;
    created_at: string;
    sentiment: string;
    blockers: string | null;
    plan_items: { content: string; type: string; status: string }[];
}

export async function checkBurnoutRisk(userId: string, teamId: string): Promise<BurnoutRiskResult> {
    const supabase = await createClient();

    // 0. Security/Permission Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: membership, error: memError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (memError || !membership || membership.role !== 'manager') {
        if (user.id !== userId) {
            throw new Error("Unauthorized: Only managers can view burnout risk for others");
        }
    }

    // 1. Fetch 14 days of reports (need baseline for missed check-in detection)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            user_id,
            date,
            created_at, 
            sentiment, 
            blockers,
            plan_items (
                content,
                type,
                status
            )
        `)
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

    if (error || !reports || reports.length === 0) {
        return { riskLevel: 'low', reasons: [], label: '', latestReportDate: '' };
    }

    return calculateBurnoutScore(reports as ReportWithItems[]);
}

// Batch function to solve N+1 issue
export async function getTeamBurnoutRisks(teamId: string): Promise<Record<string, BurnoutRiskResult>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: membership, error: memError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (memError || !membership || membership.role !== 'manager') {
        throw new Error("Unauthorized: Only managers can view team burnout risks");
    }

    // Fetch 14 days of reports for the entire team (with plan_item content for stuckedness)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            user_id,
            date,
            created_at, 
            sentiment, 
            blockers,
            plan_items (
                content,
                type,
                status
            )
        `)
        .eq('team_id', teamId)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

    if (error || !reports) return {};

    // Group by user
    const userReports: Record<string, ReportWithItems[]> = {};
    reports.forEach(r => {
        const report = r as ReportWithItems;
        if (!userReports[report.user_id]) userReports[report.user_id] = [];
        userReports[report.user_id].push(report);
    });

    // Calculate risk for each user in parallel batches
    const results: Record<string, BurnoutRiskResult> = {};
    const userIds = Object.keys(userReports);
    const BATCH_SIZE = 10;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (userId) => {
            try {
                const result = await calculateBurnoutScore(userReports[userId]);
                return { userId, result };
            } catch (error) {
                console.error(`Burnout check failed for user ${userId}:`, error);
                return { userId, result: { riskLevel: 'low' as BurnoutRiskLevel, reasons: [], label: '', latestReportDate: '' } };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((outcome) => {
            if (outcome.status === 'fulfilled') {
                results[outcome.value.userId] = outcome.value.result;
            }
        });

        if (i + BATCH_SIZE < userIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

// ─── Core Algorithm ─────────────────────────────────────────────────────

async function calculateBurnoutScore(reports: ReportWithItems[]): Promise<BurnoutRiskResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // The most recent report date — used by the client to know if new data arrived
    const latestReportDate = reports.length > 0
        ? reports.reduce((latest, r) => r.date > latest ? r.date : latest, reports[0].date)
        : '';

    // Sort reports by date descending (most recent first)
    const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date));

    // Split into recent 7 days and prior 7 days (for baseline)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentReports = sorted.filter(r => r.date >= sevenDaysStr);
    const olderReports = sorted.filter(r => r.date < sevenDaysStr);

    // ── Signal 1: Consecutive Declining Sentiment ──────────────────────
    // Look at the most recent reports in order — if 3+ in a row are Red or Yellow
    let consecutiveNegative = 0;
    let maxConsecutiveNegative = 0;

    for (const report of sorted) {
        if (report.sentiment === 'red' || report.sentiment === 'yellow') {
            consecutiveNegative++;
            maxConsecutiveNegative = Math.max(maxConsecutiveNegative, consecutiveNegative);
        } else {
            break; // Only count from the most recent streak
        }
    }

    if (maxConsecutiveNegative >= 3) {
        riskScore += 3;
        const sentimentTypes = sorted.slice(0, maxConsecutiveNegative).map(r =>
            r.sentiment === 'red' ? 'Behind' : 'Caution'
        );
        reasons.push(
            `Reported feeling "${sentimentTypes[0]}" for ${maxConsecutiveNegative} consecutive check-ins.`
        );
    }

    // ── Signal 2: Compounding Carryovers (Stuckedness) ─────────────────
    // Find plan_for_tomorrow items that appear as content across 4+ different reports
    // This means the same task keeps getting re-planned without completion
    const planContentByDay: Map<string, Set<string>> = new Map();

    for (const report of sorted) {
        if (!report.plan_items) continue;
        for (const item of report.plan_items) {
            if (item.type === 'plan_for_tomorrow') {
                const normalized = item.content.trim().toLowerCase();
                if (!planContentByDay.has(normalized)) {
                    planContentByDay.set(normalized, new Set());
                }
                planContentByDay.get(normalized)!.add(report.date);
            }
        }
    }

    const stuckItems: string[] = [];
    planContentByDay.forEach((dates, content) => {
        if (dates.size >= 4) {
            stuckItems.push(content);
        }
    });

    if (stuckItems.length > 0) {
        riskScore += 3;
        const itemPreview = stuckItems[0].length > 60
            ? stuckItems[0].substring(0, 57) + '...'
            : stuckItems[0];
        const extra = stuckItems.length > 1 ? ` and ${stuckItems.length - 1} more` : '';
        reasons.push(
            `Task "${itemPreview}"${extra} has been carried over for 4+ days — they may be stuck or need support.`
        );
    }

    // ── Signal 3: Missed Check-ins ─────────────────────────────────────
    // Only flag if the user was previously active (≥3 reports in older 7-day window)
    const wasActiveEarlier = olderReports.length >= 3;

    if (wasActiveEarlier) {
        // Count expected workdays in the last 7 days (Mon-Fri)
        let expectedWorkdays = 0;
        for (let d = 0; d < 7; d++) {
            const checkDate = new Date();
            checkDate.setDate(today.getDate() - d);
            const dow = checkDate.getDay();
            if (dow >= 1 && dow <= 5) expectedWorkdays++;
        }

        const missedDays = expectedWorkdays - recentReports.length;

        if (missedDays >= 3) {
            riskScore += 2;
            reasons.push(
                `Missed ${missedDays} check-ins this week after being consistently active — may be disengaging.`
            );
        }
    }

    // ── Optional: AI Blocker Language Analysis ─────────────────────────
    // Only if blockers exist and other signals are already borderline
    const recentBlockers = sorted.slice(0, 3)
        .map(r => r.blockers)
        .filter(Boolean)
        .join('\n');

    if (recentBlockers.length > 20 && riskScore >= 2 && model) {
        try {
            const prompt = `
            Analyze these recent blocker notes from an employee for signs of burnout or overwhelm.
            Notes: "${recentBlockers}"
            
            Look for: hopelessness, exhaustion, repetitive stuckness, or overwhelmed language.
            Reply with ONLY "YES" if signs are strong, or "NO" if normal work challenges.
          `;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().toUpperCase();

            if (text.includes("YES")) {
                riskScore += 1;
                reasons.push("Language in recent blockers suggests feeling overwhelmed.");
            }
        } catch (e: any) {
            console.error("Burnout AI check failed:", e.message);
        }
    }

    // ── Determine Level ────────────────────────────────────────────────
    let riskLevel: BurnoutRiskLevel = 'low';
    let label = '';

    if (riskScore >= 4) {
        riskLevel = 'high';
        label = 'Support Opportunity';
    } else if (riskScore >= 2) {
        riskLevel = 'medium';
        label = 'Check-in Suggested';
    }

    return { riskLevel, reasons, label, latestReportDate };
}
