const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Wednesday Feb 18 - Project Phoenix Day 3
const users = [
    {
        email: 'member@test.com',
        dates: {
            '2026-02-18': {
                sent: 'green',
                block: null,
                done: ['Completed Settings page with dark mode toggle', 'Added haptic feedback to all buttons'],
                plan: ['Implement push notification handling', 'Code review for Android PR']
            }
        }
    },
    {
        email: 'member1@test.com',
        dates: {
            '2026-02-18': {
                sent: 'green',
                block: null,
                done: ['OAuth integration complete after receiving credentials', 'Built profile screen with edit functionality'],
                plan: ['Start notification screen', 'Add offline data caching']
            }
        }
    },
    {
        email: 'member2@test.com',
        dates: {
            '2026-02-18': {
                sent: 'green',
                block: null,
                done: ['Implemented Redis caching layer - 40% faster feed loads', 'Started /api/notifications endpoints'],
                plan: ['Complete notification endpoints', 'Set up WebSocket server for real-time updates']
            }
        }
    },
    {
        email: 'member3@test.com',
        dates: {
            '2026-02-18': {
                sent: 'green',
                block: null,
                done: ['Iterated on notification grouping - improved clarity by 60%', 'Created dev handoff specs with Zeplin annotations'],
                plan: ['Design empty states for all screens', 'Start dark mode color system']
            }
        }
    },
    {
        email: 'member5@test.com',
        dates: {
            '2026-02-18': {
                sent: 'yellow',
                block: 'Android crash fix deployed but need to verify on physical device - waiting for test device from IT',
                done: ['Verified Android crash fix on emulator - passing', 'Wrote 6 E2E tests for feed screen'],
                plan: ['Test on physical Android device', 'Start performance testing suite']
            }
        }
    }
];

async function main() {
    console.log('Seeding Wednesday (Feb 18) data...');

    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    });

    const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', authData.session.user.id)
        .eq('role', 'manager')
        .single();

    const teamId = membership.team_id;
    console.log('Team:', teamId);

    for (const u of users) {
        console.log('User:', u.email);
        const { data: loginData } = await supabase.auth.signInWithPassword({
            email: u.email,
            password: 'password'
        });

        if (!loginData.session) {
            console.error('  Login failed');
            continue;
        }

        const userId = loginData.session.user.id;

        for (const [date, info] of Object.entries(u.dates)) {
            const { data: existing } = await supabase
                .from('reports')
                .select('id')
                .match({ user_id: userId, team_id: teamId, date })
                .maybeSingle();

            let reportId;
            if (existing) {
                await supabase.from('reports').update({ sentiment: info.sent, blockers: info.block }).eq('id', existing.id);
                reportId = existing.id;
                await supabase.from('plan_items').delete().eq('report_id', reportId);
            } else {
                const { data: newRep, error } = await supabase.from('reports').insert({
                    user_id: userId, team_id: teamId, date, sentiment: info.sent, blockers: info.block
                }).select().single();
                if (error) { console.error('  Error:', error.message); continue; }
                reportId = newRep.id;
            }

            const items = [
                ...info.done.map(c => ({ report_id: reportId, content: c, type: 'actual_done_today', status: 'done' })),
                ...info.plan.map(c => ({ report_id: reportId, content: c, type: 'plan_for_tomorrow', status: 'todo' }))
            ];
            await supabase.from('plan_items').insert(items);
            console.log('  Saved:', date);
        }
    }
    console.log('Done!');
}

main().catch(console.error);
