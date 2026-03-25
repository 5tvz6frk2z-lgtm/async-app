import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Updates demo accounts to have polished, coherent data:
 * 1. Renames member profile to "Demo Member"
 * 2. Renames manager profile to "Demo Manager"  
 * 3. Renames team to "Demo Team"
 * 4. Updates all member report plan_items with realistic, coherent content
 * 5. Updates all manager report plan_items with realistic, coherent content
 */

// Coherent story arc for the demo member (frontend developer working on a dashboard project)
const memberDayContent: Record<string, {
    sentiment: string;
    blockers: string | null;
    done: string[];
    plan: string[];
}> = {
    // Day 1: Starting the sprint
    '0': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Set up project scaffolding for the analytics dashboard',
            'Created component library with Button, Card, and Input primitives',
            'Reviewed sprint backlog and estimated story points',
        ],
        plan: [
            'Build the main dashboard layout with sidebar navigation',
            'Integrate chart library for data visualization',
            'Set up API client for backend endpoints',
        ],
    },
    // Day 2: Building core features
    '1': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Built the main dashboard layout with responsive sidebar',
            'Integrated Recharts for line and bar chart components',
            'Connected API client to the team activity endpoint',
        ],
        plan: [
            'Implement the real-time activity feed component',
            'Add filtering and date range picker to dashboard',
            'Write unit tests for the API client layer',
        ],
    },
    // Day 3: Hitting a blocker
    '2': {
        sentiment: 'yellow',
        blockers: 'Waiting on backend team to finalize the reporting API schema — currently returning inconsistent field names',
        done: [
            'Implemented the activity feed with infinite scroll',
            'Added skeleton loading states for all dashboard cards',
            'Started date range picker but blocked on API schema',
        ],
        plan: [
            'Follow up with backend on API schema finalization',
            'Build the user profile settings page',
            'Add error boundary components for graceful failures',
        ],
    },
    // Day 4: Resolving blocker, good progress
    '3': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Backend confirmed API schema — updated all type definitions',
            'Completed the date range picker with preset options',
            'Built user profile settings page with avatar upload',
        ],
        plan: [
            'Implement notification preferences panel',
            'Add dark mode toggle and theme persistence',
            'Performance audit on dashboard rendering',
        ],
    },
    // Day 5: Productive mid-sprint
    '4': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Implemented notification preferences with toggle switches',
            'Added dark mode with system preference detection',
            'Optimized dashboard re-renders — reduced from 12ms to 3ms',
        ],
        plan: [
            'Build the team management page with invite flow',
            'Add export functionality for reports (CSV/PDF)',
            'Code review for PR #87 and PR #91',
        ],
    },
    // Day 6: Another small blocker
    '5': {
        sentiment: 'yellow',
        blockers: 'CI pipeline is flaky — 3 out of 5 runs fail on Playwright tests due to timeout issues',
        done: [
            'Built team management page with role-based permissions',
            'Implemented invite flow with email validation',
            'Reviewed and approved PR #87 (auth refactor)',
        ],
        plan: [
            'Debug and fix flaky CI tests',
            'Add CSV export for weekly report data',
            'Start building the onboarding wizard for new users',
        ],
    },
    // Day 7: Strong finish
    '6': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Fixed flaky CI — increased timeouts and added retry logic',
            'Implemented CSV export with proper date formatting',
            'Started onboarding wizard — completed 2 of 4 steps',
        ],
        plan: [
            'Complete remaining onboarding wizard steps',
            'Add input validation and error messages throughout',
            'Prepare sprint demo slides',
        ],
    },
    // Day 8: Demo prep
    '7': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Completed all 4 onboarding wizard steps with animations',
            'Added form validation across settings and profile pages',
            'Created sprint demo deck with screenshots',
        ],
        plan: [
            'Run final QA pass on all new features',
            'Fix any remaining responsive layout issues',
            'Deploy to staging for stakeholder review',
        ],
    },
    // Day 9: Wrapping up
    '8': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Completed QA pass — found and fixed 3 minor UI bugs',
            'Fixed mobile layout issues on the dashboard and settings pages',
            'Deployed to staging — all tests passing',
        ],
        plan: [
            'Address stakeholder feedback from staging review',
            'Write documentation for new components',
            'Plan next sprint priorities',
        ],
    },
    // Day 10: Sprint retrospective day
    '9': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Incorporated stakeholder feedback — adjusted chart colors and spacing',
            'Wrote component documentation for the design system',
            'Sprint retro: identified 2 process improvements for next sprint',
        ],
        plan: [
            'Start next sprint planning',
            'Research WebSocket integration for real-time updates',
            'Mentor new team member on codebase architecture',
        ],
    },
};

// Manager content (engineering manager overseeing the team)
const managerDayContent: Record<string, {
    sentiment: string;
    blockers: string | null;
    done: string[];
    plan: string[];
}> = {
    '0': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Kicked off Q2 sprint planning with the team',
            'Reviewed and approved resource allocation for analytics project',
            'Had 1:1s with 3 team members — all aligned on priorities',
        ],
        plan: [
            'Finalize sprint backlog and assign story points',
            'Meet with product to clarify reporting requirements',
            'Review infrastructure budget for staging environment',
        ],
    },
    '1': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Finalized sprint backlog — 34 story points committed',
            'Aligned with product on reporting API requirements',
            'Approved staging environment provisioning',
        ],
        plan: [
            'Check in on frontend progress for dashboard scaffolding',
            'Review backend API design doc',
            'Prepare stakeholder update for Friday',
        ],
    },
    '2': {
        sentiment: 'yellow',
        blockers: 'Backend API schema delays are blocking frontend work — need to escalate',
        done: [
            'Identified API schema blocker affecting frontend team',
            'Escalated to backend lead — targeting resolution by EOD tomorrow',
            'Drafted stakeholder update email',
        ],
        plan: [
            'Follow up on API schema resolution',
            'Run mid-sprint health check with the team',
            'Review hiring pipeline for senior frontend role',
        ],
    },
    '3': {
        sentiment: 'green',
        blockers: null,
        done: [
            'API schema blocker resolved — frontend unblocked',
            'Ran mid-sprint check: team is on track (18/34 points done)',
            'Shortlisted 3 candidates for senior frontend position',
        ],
        plan: [
            'Schedule technical interviews for shortlisted candidates',
            'Review team velocity trends for quarterly report',
            'Plan team lunch for sprint celebration',
        ],
    },
    '4': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Conducted 2 technical interviews — 1 strong candidate moving forward',
            'Compiled velocity report: 15% improvement over last quarter',
            'Booked team lunch for Friday',
        ],
        plan: [
            'Review PRs from the team',
            'Prepare sprint demo agenda',
            'Draft Q2 OKR progress update',
        ],
    },
    '5': {
        sentiment: 'yellow',
        blockers: 'CI pipeline instability flagged by team — investigating root cause',
        done: [
            'Reviewed 4 PRs and provided feedback',
            'Created sprint demo agenda with team',
            'Investigated CI flakiness — likely Playwright timeout config',
        ],
        plan: [
            'Coordinate CI fix with DevOps',
            'Finalize Q2 OKR progress update',
            'Run sprint demo rehearsal',
        ],
    },
    '6': {
        sentiment: 'green',
        blockers: null,
        done: [
            'CI pipeline fixed — coordinated with DevOps on config update',
            'Submitted Q2 OKR progress update to leadership',
            'Sprint demo rehearsal went smoothly',
        ],
        plan: [
            'Run sprint demo for stakeholders',
            'Collect feedback and plan next sprint',
            'Send offer letter to frontend candidate',
        ],
    },
    '7': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Sprint demo delivered — positive feedback from stakeholders',
            'Collected 5 enhancement requests for next sprint backlog',
            'Sent offer letter to senior frontend candidate',
        ],
        plan: [
            'Review staging deployment with team',
            'Begin next sprint planning based on demo feedback',
            'Schedule onboarding prep for new hire',
        ],
    },
    '8': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Staging review completed — 2 minor items flagged for polish',
            'Started next sprint planning — drafted initial backlog',
            'Candidate accepted offer — starting in 2 weeks',
        ],
        plan: [
            'Finalize next sprint scope',
            'Run sprint retrospective',
            'Prepare onboarding materials for new team member',
        ],
    },
    '9': {
        sentiment: 'green',
        blockers: null,
        done: [
            'Sprint retrospective: team morale high, identified 2 process improvements',
            'Finalized next sprint scope — 30 story points',
            'Created onboarding checklist for new team member',
        ],
        plan: [
            'Kick off next sprint on Monday',
            'Schedule intro meetings for new hire',
            'Review quarterly budget with finance',
        ],
    },
};

async function updateDemoData() {
    console.log('=== Updating Demo Account Data ===\n');

    // --- 1. Sign in as manager to get team info ---
    console.log('1. Signing in as manager...');
    const { data: managerAuth, error: managerLoginErr } = await supabase.auth.signInWithPassword({
        email: 'manager@test.com',
        password: 'password',
    });
    if (managerLoginErr || !managerAuth.user) {
        console.error('Manager login failed:', managerLoginErr?.message);
        return;
    }
    const managerId = managerAuth.user.id;
    console.log('   Manager ID:', managerId);

    // Get team
    const { data: managerTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', managerId)
        .eq('role', 'manager');

    const teamId = managerTeams?.[0]?.team_id;
    if (!teamId) {
        console.error('No team found for manager');
        return;
    }
    console.log('   Team ID:', teamId);

    // --- 2. Update team name ---
    console.log('\n2. Updating team name to "Demo Team"...');
    const { data: team } = await supabase
        .from('teams')
        .select('settings')
        .eq('id', teamId)
        .single();

    const currentSettings = (team?.settings || {}) as Record<string, any>;
    currentSettings.teamName = 'Demo Team';

    const { error: teamUpdateErr } = await supabase
        .from('teams')
        .update({ name: 'Demo Team', settings: currentSettings })
        .eq('id', teamId);

    if (teamUpdateErr) console.error('   Team update failed:', teamUpdateErr.message);
    else console.log('   ✅ Team renamed to "Demo Team"');

    // --- 3. Update manager profile name ---
    console.log('\n3. Updating manager profile to "Demo Manager"...');
    const { error: managerProfileErr } = await supabase
        .from('profiles')
        .update({ name: 'Demo Manager' })
        .eq('id', managerId);

    if (managerProfileErr) console.error('   Manager profile update failed:', managerProfileErr.message);
    else console.log('   ✅ Manager profile renamed');

    // Also update auth metadata
    await supabase.auth.updateUser({ data: { full_name: 'Demo Manager' } });

    // --- 4. Get member ID ---
    console.log('\n4. Signing in as member...');
    // Sign out manager first
    await supabase.auth.signOut();

    const { data: memberAuth, error: memberLoginErr } = await supabase.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password',
    });
    if (memberLoginErr || !memberAuth.user) {
        console.error('Member login failed:', memberLoginErr?.message);
        return;
    }
    const memberId = memberAuth.user.id;
    console.log('   Member ID:', memberId);

    // --- 5. Update member profile name ---
    console.log('\n5. Updating member profile to "Demo Member"...');
    const { error: memberProfileErr } = await supabase
        .from('profiles')
        .update({ name: 'Demo Member' })
        .eq('id', memberId);

    if (memberProfileErr) console.error('   Member profile update failed:', memberProfileErr.message);
    else console.log('   ✅ Member profile renamed');

    await supabase.auth.updateUser({ data: { full_name: 'Demo Member' } });

    // --- 6. Update member reports ---
    console.log('\n6. Updating member report content...');
    const { data: memberReports, error: memberReportsErr } = await supabase
        .from('reports')
        .select('id, date')
        .eq('user_id', memberId)
        .eq('team_id', teamId)
        .order('date', { ascending: true });

    if (memberReportsErr || !memberReports) {
        console.error('Failed to fetch member reports:', memberReportsErr?.message);
        return;
    }

    console.log(`   Found ${memberReports.length} member reports`);

    for (let i = 0; i < memberReports.length; i++) {
        const report = memberReports[i];
        const dayKey = String(i);
        const content = memberDayContent[dayKey];

        if (!content) {
            console.log(`   ⏭️  No content defined for day ${i} (${report.date}), skipping`);
            continue;
        }

        // Update report sentiment/blockers
        await supabase
            .from('reports')
            .update({ sentiment: content.sentiment, blockers: content.blockers })
            .eq('id', report.id);

        // Delete old plan items
        await supabase.from('plan_items').delete().eq('report_id', report.id);

        // Insert new plan items
        const planItems = [
            ...content.done.map(c => ({
                report_id: report.id,
                content: c,
                type: 'actual_done_today',
                status: 'done',
            })),
            ...content.plan.map(c => ({
                report_id: report.id,
                content: c,
                type: 'plan_for_tomorrow',
                status: 'todo',
            })),
        ];

        await supabase.from('plan_items').insert(planItems);
        console.log(`   ✅ Day ${i} (${report.date}): ${content.done.length} done + ${content.plan.length} plan items — ${content.sentiment}`);
    }

    // --- 7. Update manager reports ---
    console.log('\n7. Updating manager report content...');
    // Sign back in as manager
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: 'manager@test.com', password: 'password' });

    const { data: managerReports, error: managerReportsErr } = await supabase
        .from('reports')
        .select('id, date')
        .eq('user_id', managerId)
        .eq('team_id', teamId)
        .order('date', { ascending: true });

    if (managerReportsErr || !managerReports) {
        console.error('Failed to fetch manager reports:', managerReportsErr?.message);
        return;
    }

    console.log(`   Found ${managerReports.length} manager reports`);

    for (let i = 0; i < managerReports.length; i++) {
        const report = managerReports[i];
        const dayKey = String(i);
        const content = managerDayContent[dayKey];

        if (!content) {
            console.log(`   ⏭️  No content defined for day ${i} (${report.date}), skipping`);
            continue;
        }

        await supabase
            .from('reports')
            .update({ sentiment: content.sentiment, blockers: content.blockers })
            .eq('id', report.id);

        await supabase.from('plan_items').delete().eq('report_id', report.id);

        const planItems = [
            ...content.done.map(c => ({
                report_id: report.id,
                content: c,
                type: 'actual_done_today',
                status: 'done',
            })),
            ...content.plan.map(c => ({
                report_id: report.id,
                content: c,
                type: 'plan_for_tomorrow',
                status: 'todo',
            })),
        ];

        await supabase.from('plan_items').insert(planItems);
        console.log(`   ✅ Day ${i} (${report.date}): ${content.done.length} done + ${content.plan.length} plan items — ${content.sentiment}`);
    }

    console.log('\n🎉 Demo data update complete!');
    console.log('   Team: "Demo Team"');
    console.log('   Manager: "Demo Manager"');
    console.log('   Member: "Demo Member"');
}

updateDemoData().catch(console.error);
