import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Daily cron to keep demo account report dates current.
 * Signs in as each demo user, then shifts their report dates so
 * the most recent report appears as yesterday. Preserves relative spacing.
 * 
 * Schedule: Run once daily at midnight UTC via Vercel Cron.
 * Only affects: member@test.com, manager@test.com
 */

const DEMO_ACCOUNTS = [
    { email: 'member@test.com', password: 'password' },
    { email: 'manager@test.com', password: 'password' },
];

export async function GET(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[refresh-demo] CRON_SECRET not set');
        return new NextResponse('Server configuration error', { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let totalUpdated = 0;

    try {
        for (const account of DEMO_ACCOUNTS) {
            // Create a fresh client and sign in as this demo user
            // This gives us an authenticated session that passes RLS
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: account.email,
                password: account.password,
            });

            if (authError || !authData.user) {
                console.log(`[refresh-demo] Login failed for ${account.email}: ${authError?.message}`);
                continue;
            }

            const userId = authData.user.id;

            // Get all reports for this user, ordered by date descending
            const { data: reports } = await supabase
                .from('reports')
                .select('id, date')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (!reports || reports.length === 0) {
                console.log(`[refresh-demo] ${account.email}: no reports found`);
                await supabase.auth.signOut();
                continue;
            }

            // Set dates consecutively backwards from yesterday:
            // most recent = yesterday, next = 2 days ago, next = 3 days ago, etc.
            // Two-pass approach to avoid unique constraint violations on (team_id, user_id, date)
            console.log(`[refresh-demo] ${account.email}: setting ${reports.length} reports to consecutive days from yesterday`);

            // Pass 1: Move all to temporary far-future dates to avoid collisions
            for (let i = 0; i < reports.length; i++) {
                const tempDate = new Date('2099-01-01');
                tempDate.setDate(tempDate.getDate() + i);
                const tempDateStr = tempDate.toISOString().split('T')[0];

                await supabase
                    .from('reports')
                    .update({ date: tempDateStr })
                    .eq('id', reports[i].id);
            }

            // Pass 2: Set to correct consecutive dates
            for (let i = 0; i < reports.length; i++) {
                const targetDate = new Date(yesterday);
                targetDate.setDate(yesterday.getDate() - i);
                const newDateStr = targetDate.toISOString().split('T')[0];

                await supabase
                    .from('reports')
                    .update({ date: newDateStr })
                    .eq('id', reports[i].id);

                totalUpdated++;
            }

            await supabase.auth.signOut();
        }

        return NextResponse.json({
            success: true,
            message: `Refreshed ${totalUpdated} demo report dates (yesterday: ${yesterdayStr})`,
        });

    } catch (e) {
        console.error('[refresh-demo] Error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
