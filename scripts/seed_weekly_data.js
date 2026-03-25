const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test Team members with known passwords
// Project story: "Project Phoenix" - a mobile app redesign
const users = [
    {
        email: 'member@test.com',
        name: 'Sarah Jenkins',
        role: 'iOS Developer',
        dates: {
            '2026-02-16': {
                sent: 'green',
                block: null,
                done: ['Set up Swift UI project structure for Phoenix redesign', 'Created reusable component library skeleton'],
                plan: ['Build the new Home feed screen', 'Integrate REST API client']
            },
            '2026-02-17': {
                sent: 'green',
                block: null,
                done: ['Built Home feed screen with pull-to-refresh', 'Integrated API client for user profiles'],
                plan: ['Start building the Settings page', 'Add dark mode support']
            }
        }
    },
    {
        email: 'member1@test.com',
        name: 'Alex Chen',
        role: 'Android Developer',
        dates: {
            '2026-02-16': {
                sent: 'green',
                block: null,
                done: ['Initialized Kotlin project with Jetpack Compose', 'Set up Hilt dependency injection'],
                plan: ['Implement login flow with OAuth', 'Create navigation graph']
            },
            '2026-02-17': {
                sent: 'yellow',
                block: 'Waiting on OAuth client ID from DevOps - blocking login flow',
                done: ['Built login UI with Jetpack Compose', 'Created navigation graph for main screens'],
                plan: ['Complete OAuth integration once credentials arrive', 'Start profile screen']
            }
        }
    },
    {
        email: 'member2@test.com',
        name: 'Sam Taylor',
        role: 'Backend Engineer',
        dates: {
            '2026-02-16': {
                sent: 'green',
                block: null,
                done: ['Designed REST API schema for Phoenix v2', 'Created database migration for new user_preferences table'],
                plan: ['Implement GET and POST endpoints for /api/feed', 'Write integration tests']
            },
            '2026-02-17': {
                sent: 'green',
                block: null,
                done: ['Implemented /api/feed endpoints with pagination', 'All 14 integration tests passing'],
                plan: ['Add caching layer with Redis', 'Start /api/notifications endpoints']
            }
        }
    },
    {
        email: 'member3@test.com',
        name: 'Morgan Rivera',
        role: 'UI/UX Designer',
        dates: {
            '2026-02-16': {
                sent: 'green',
                block: null,
                done: ['Completed high-fidelity mockups for Home and Settings screens', 'Created design tokens for spacing and typography'],
                plan: ['Design notification center UI', 'Run usability test with 5 beta testers']
            },
            '2026-02-17': {
                sent: 'green',
                block: null,
                done: ['Designed notification center with grouped alerts', 'Ran usability test - 4/5 users completed tasks without help'],
                plan: ['Iterate on notification grouping based on feedback', 'Create handoff specs for devs']
            }
        }
    },
    {
        email: 'member5@test.com',
        name: 'Casey Kim',
        role: 'QA Engineer',
        dates: {
            '2026-02-16': {
                sent: 'green',
                block: null,
                done: ['Created test plan for Phoenix v2 sprint 1', 'Set up Detox E2E testing framework for React Native'],
                plan: ['Write E2E tests for login flow', 'Set up CI pipeline for automated tests']
            },
            '2026-02-17': {
                sent: 'red',
                block: 'Found critical crash on Android API 33 when opening feed - blocks release',
                done: ['Wrote 8 E2E test cases for login flow', 'Found and documented critical Android crash bug'],
                plan: ['Verify Android crash fix once deployed', 'Write E2E tests for feed screen']
            }
        }
    }
];

async function main() {
    console.log('Seeding weekly data for Test Team (Project Phoenix)...');

    // Login as manager first to get team ID
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password'
    });

    if (authErr || !authData.session) {
        console.error('Manager login failed:', authErr?.message);
        return;
    }
    console.log('Logged in as manager');

    // Get first team
    const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', authData.session.user.id)
        .eq('role', 'manager')
        .single();

    if (!membership) {
        console.error('No managed team found');
        return;
    }

    const teamId = membership.team_id;
    console.log('Team ID:', teamId);

    // Now loop through each member
    for (const u of users) {
        console.log('\nUser:', u.email, '(' + u.name + ')');

        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: u.email,
            password: 'password'
        });

        if (loginErr || !loginData.session) {
            console.error('  Login failed:', loginErr?.message);
            continue;
        }

        const userId = loginData.session.user.id;

        for (const [date, info] of Object.entries(u.dates)) {
            // Check if report exists
            const { data: existing } = await supabase
                .from('reports')
                .select('id')
                .match({ user_id: userId, team_id: teamId, date })
                .maybeSingle();

            let reportId;

            if (existing) {
                console.log('  Updating existing report for', date);
                await supabase
                    .from('reports')
                    .update({ sentiment: info.sent, blockers: info.block })
                    .eq('id', existing.id);
                reportId = existing.id;
                await supabase.from('plan_items').delete().eq('report_id', reportId);
            } else {
                console.log('  Creating report for', date);
                const { data: newRep, error: insertErr } = await supabase
                    .from('reports')
                    .insert({
                        user_id: userId,
                        team_id: teamId,
                        date: date,
                        sentiment: info.sent,
                        blockers: info.block
                    })
                    .select()
                    .single();

                if (insertErr) {
                    console.error('  Insert error:', insertErr.message);
                    continue;
                }
                reportId = newRep.id;
            }

            // Insert plan items
            const items = [
                ...info.done.map(c => ({
                    report_id: reportId,
                    content: c,
                    type: 'actual_done_today',
                    status: 'done'
                })),
                ...info.plan.map(c => ({
                    report_id: reportId,
                    content: c,
                    type: 'plan_for_tomorrow',
                    status: 'todo'
                }))
            ];

            const { error: itemErr } = await supabase.from('plan_items').insert(items);
            if (itemErr) {
                console.error('  Plan items error:', itemErr.message);
            } else {
                console.log('  Saved', date, '-', items.length, 'items');
            }
        }
    }

    console.log('\nDone! All reports seeded.');
}

main().catch(console.error);
