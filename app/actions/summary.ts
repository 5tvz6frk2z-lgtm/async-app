'use server';

import { createClient } from '@/lib/supabase/server';
import { model } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

// Internal function for re-use in Cron vs Action
export async function internalGenerateMorningBriefing(supabase: any, teamId: string) {
    // Fetch Reports (Yesterday Only)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

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
        .eq('date', yesterdayStr);

    if (error) {
        console.error('Error fetching reports:', error);
        throw new Error('Failed to fetch team reports.');
    }

    if (!reports || reports.length === 0) {
        return "No reports found for yesterday.";
    }

    // Format Data for AI
    const reportData = reports.map((r: any) => ({
        name: r.profiles?.name || 'Unknown',
        sentiment: r.sentiment,
        blockers: r.blockers,
        completed_yesterday: r.plan_items
            .filter((i: any) => i.type === 'actual_done_today')
            .map((i: any) => i.content),
        plan_for_today: r.plan_items
            .filter((i: any) => i.type === 'plan_for_tomorrow')
            .map((i: any) => i.content),
    }));

    const prompt = `
    You are an executive assistant for an engineering manager. 
    Here are the status updates from the team for YESTERDAY (${yesterdayStr}):
    ${JSON.stringify(reportData, null, 2)}

    Please generate a concise "Morning Briefing" for TODAY (${todayStr}).
    The goal is to catch up the manager on what happened yesterday and what is planned for today.

    Structure:
    1. 🚨 Critical Blockers (If any, highlight heavily. If none, say "No critical blockers".)
    2. 🏆 Yesterday's Achievements (Summarize the most important completed items from 'completed_yesterday'.)
    3. 🎯 Focus for Today (Summarize the key items from 'plan_for_today'.)
    4. 📉 Team Sentiment (Overall vibe based on sentiments reported.)
    5. 📋 Action Items (Who needs help?)

    Keep it professional, action-oriented, and under 250 words.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();
        return summary;
    } catch (error: any) {
        console.error('AI summary generation failed:', error);

        // Handle rate limiting gracefully
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            console.warn('Gemini API rate limit hit, returning fallback summary');
            return `⚠️ AI summary temporarily unavailable due to high demand.\n\n${reports.length} team members reported yesterday. Please check individual reports for details.`;
        }

        // Return a basic summary on other errors
        return `❌ Unable to generate AI summary. ${reports.length} reports submitted for ${yesterdayStr}.`;
    }
}


export async function generateMorningBriefing(teamId: string) {
    const supabase = await createClient();

    // 1. Auth Check
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // 2. Verify Management Role
    const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (!membership || membership.role !== 'manager') {
        return { error: 'Only managers can generate briefings.' };
    }

    try {
        const summary = await internalGenerateMorningBriefing(supabase, teamId);
        return { success: true, summary };
    } catch (err) {
        console.error('AI Generation Error:', err);
        return { error: 'Failed to generate AI summary.' };
    }
}
