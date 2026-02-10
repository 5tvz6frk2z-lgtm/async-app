'use server';

import { createClient } from '@/lib/supabase/server';
import { model } from '@/lib/gemini';

export type BurnoutRiskLevel = 'low' | 'medium' | 'high';

export interface BurnoutRiskResult {
    riskLevel: BurnoutRiskLevel;
    reasons: string[];
}

export async function checkBurnoutRisk(userId: string, teamId: string): Promise<BurnoutRiskResult> {
    const supabase = await createClient();

    // 0. Security/Permission Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is manager of this team
    const { data: membership, error: memError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (memError || !membership || membership.role !== 'manager') {
        // Allow users to check their OWN burnout risk?
        if (user.id !== userId) {
            throw new Error("Unauthorized: Only managers can view burnout risk for others");
        }
    }

    // 1. Fetch Last 7 Days of Reports for User
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            created_at, 
            sentiment, 
            blockers,
            plan_items (
                type,
                status
            )
        `)
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

    if (error || !reports || reports.length === 0) {
        return { riskLevel: 'low', reasons: [] };
    }

    return calculateBurnoutScore(reports);
}

// Batch function to solve N+1 issue
export async function getTeamBurnoutRisks(teamId: string): Promise<Record<string, BurnoutRiskResult>> {
    const supabase = await createClient();

    // 0. Security Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is manager
    const { data: membership, error: memError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (memError || !membership || membership.role !== 'manager') {
        throw new Error("Unauthorized: Only managers can view team burnout risks");
    }

    // 1. Fetch 7 days of reports for ENTIRE team
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            user_id,
            created_at, 
            sentiment, 
            blockers,
            plan_items (
                type,
                status
            )
        `)
        .eq('team_id', teamId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

    if (error || !reports) return {};

    // 2. Group by User
    const userReports: Record<string, any[]> = {};
    reports.forEach(r => {
        if (!userReports[r.user_id]) userReports[r.user_id] = [];
        userReports[r.user_id].push(r);
    });

    // 3. Calculate Risk for each user
    const results: Record<string, BurnoutRiskResult> = {};

    // OPTIMIZATION: Process in parallel with rate limiting
    // For large teams (50+ members), sequential AI calls would timeout
    // Use Promise.allSettled to handle failures gracefully
    const userIds = Object.keys(userReports);

    // Process in batches of 10 to avoid overwhelming Gemini API
    const BATCH_SIZE = 10;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (userId) => {
            try {
                const result = await calculateBurnoutScore(userReports[userId]);
                return { userId, result };
            } catch (error) {
                console.error(`Burnout check failed for user ${userId}:`, error);
                // Return low risk on error to avoid blocking dashboard
                return { userId, result: { riskLevel: 'low' as BurnoutRiskLevel, reasons: [] } };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((outcome) => {
            if (outcome.status === 'fulfilled') {
                results[outcome.value.userId] = outcome.value.result;
            }
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < userIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

// Logic extracted for reuse
async function calculateBurnoutScore(reports: any[]): Promise<BurnoutRiskResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // 1. Check for Late Submissions
    let lateCount = 0;
    reports.forEach(r => {
        const date = new Date(r.created_at);
        const hour = date.getUTCHours();
        if (hour >= 21 || hour < 4) {
            lateCount++;
        }
    });

    if (lateCount >= 3) {
        riskScore += 2;
        reasons.push(`Submitted ${lateCount} reports late at night (>9 PM) this week.`);
    }

    // 2. Lack of "Wins"
    let totalWins = 0;
    reports.forEach(r => {
        // @ts-ignore
        const wins = r.plan_items?.filter((i: any) => i.type === 'actual_done_today' && i.status === 'done').length || 0;
        totalWins += wins;
    });

    const avgWins = totalWins / reports.length;
    if (reports.length >= 3 && avgWins < 1) {
        riskScore += 2;
        reasons.push("Few 'wins' recorded: averages less than 1 completed task per day.");
    }

    // 3. Sentiment Analysis
    let negativeCount = 0;
    reports.forEach(r => {
        if (r.sentiment === 'red') negativeCount++;
    });

    if (negativeCount >= 2) {
        riskScore += 2;
        reasons.push("Multiple 'Red' (struggling) sentiment reports in the last week.");
    }

    // 4. AI Analysis - ONLY if blockers exist (optimization)
    const recentBlockers = reports.slice(0, 3).map(r => r.blockers).filter(Boolean).join('\n');

    if (recentBlockers.length > 20) {
        try {
            const prompt = `
            Analyze these recent blocker notes from an employee for signs of burnout.
            Notes: "${recentBlockers}"
            
            Look for: hopelessness, exhaustion, repetitive stuckness, or overwhelmed language.
            Reply with ONLY "YES" if signs are strong, or "NO" if normal work challenges.
          `;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().toUpperCase();

            if (text.includes("YES")) {
                riskScore += 2;
                reasons.push("AI detected language indicating exhaustion or being overwhelmed.");
            }
        } catch (e: any) {
            // Log but don't fail - AI is enhancement, not critical
            console.error("Burnout AI check failed:", e.message);
            // If rate limited, skip silently to avoid blocking dashboard
            if (e.message?.includes('429') || e.message?.includes('rate limit')) {
                console.warn('Gemini API rate limit hit, skipping AI analysis');
            }
        }
    }

    let riskLevel: BurnoutRiskLevel = 'low';
    if (riskScore >= 4) riskLevel = 'high';
    else if (riskScore >= 2) riskLevel = 'medium';

    return { riskLevel, reasons };
}
