import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Mobile App Product Team member personas
const memberReports = [
    {
        email: "member@test.com",
        name: "Test Member",
        role: "iOS Developer",
        sentiment: "green",
        blockers: null,
        done_today: [
            "Completed push notification integration for iOS",
            "Fixed memory leak in the image caching module",
            "Code review for pull request #342"
        ],
        plan_tomorrow: [
            "Start implementing biometric authentication",
            "Update CocoaPods dependencies",
            "Write unit tests for notification handler"
        ]
    },
    {
        email: "member1@test.com",
        name: "member1",
        role: "Android Developer",
        sentiment: "green",
        blockers: null,
        done_today: [
            "Implemented deep linking for Android app",
            "Optimized RecyclerView performance in feed screen",
            "Updated Kotlin version to 1.9.22"
        ],
        plan_tomorrow: [
            "Add offline mode support for user profiles",
            "Fix crash on Android 14 devices",
            "Implement background sync service"
        ]
    },
    {
        email: "member2@test.com",
        name: "member2",
        role: "Backend Developer",
        sentiment: "yellow",
        blockers: "Database migration is taking longer than expected due to large dataset",
        done_today: [
            "Deployed API v2.3 to staging environment",
            "Added rate limiting to authentication endpoints",
            "Fixed N+1 query in user feed endpoint"
        ],
        plan_tomorrow: [
            "Complete database migration script",
            "Implement WebSocket support for real-time updates",
            "Set up monitoring alerts for API latency"
        ]
    },
    {
        email: "member3@test.com",
        name: "Member 3",
        role: "UI/UX Designer",
        sentiment: "green",
        blockers: null,
        done_today: [
            "Finalized onboarding flow mockups in Figma",
            "Created dark mode color tokens for design system",
            "Conducted usability testing session with 5 users"
        ],
        plan_tomorrow: [
            "Design settings page refresh",
            "Create icon set for new features",
            "Present onboarding findings to stakeholders"
        ]
    },
    {
        email: "member5@test.com",
        name: "Member Five",
        role: "QA Engineer",
        sentiment: "red",
        blockers: "Found critical bug in payment flow that needs immediate attention before release",
        done_today: [
            "Completed regression testing for v2.5 release",
            "Documented 12 bug reports from testing cycle",
            "Set up automated E2E tests for checkout flow"
        ],
        plan_tomorrow: [
            "Verify payment bug fix once deployed",
            "Execute smoke tests on staging",
            "Update test cases for new biometric auth feature"
        ]
    }
];

async function submitReports() {
    const today = new Date().toISOString().split("T")[0];

    // Get team ID (assuming single team for now)
    const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .limit(1);

    if (!teams || teams.length === 0) {
        console.error("No teams found");
        return;
    }

    const teamId = teams[0].id;
    console.log(`Using team: ${teams[0].name} (${teamId})`);

    for (const member of memberReports) {
        console.log(`\nProcessing ${member.name} (${member.email})...`);

        // Get user ID from profiles table
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", member.email)
            .single();

        if (!profile) {
            console.log(`  ⚠️ Profile not found for ${member.email}, skipping...`);
            continue;
        }

        const userId = profile.id;

        // Check if report already exists for today
        const { data: existing } = await supabase
            .from("reports")
            .select("id")
            .eq("user_id", userId)
            .eq("team_id", teamId)
            .eq("date", today)
            .single();

        if (existing) {
            console.log(`  ⏭️ Report already exists for today, updating...`);

            // Update existing report
            await supabase
                .from("reports")
                .update({
                    sentiment: member.sentiment,
                    blockers: member.blockers
                })
                .eq("id", existing.id);

            // Delete old plan items
            await supabase
                .from("plan_items")
                .delete()
                .eq("report_id", existing.id);

            // Insert new plan items
            const planItems = [
                ...member.done_today.map(content => ({
                    report_id: existing.id,
                    content,
                    type: "actual_done_today",
                    status: "done"
                })),
                ...member.plan_tomorrow.map(content => ({
                    report_id: existing.id,
                    content,
                    type: "plan_for_tomorrow",
                    status: "todo"
                }))
            ];

            await supabase.from("plan_items").insert(planItems);
            console.log(`  ✅ Updated report with ${planItems.length} items`);

        } else {
            // Create new report
            const { data: report, error } = await supabase
                .from("reports")
                .insert({
                    user_id: userId,
                    team_id: teamId,
                    date: today,
                    sentiment: member.sentiment,
                    blockers: member.blockers
                })
                .select()
                .single();

            if (error) {
                console.error(`  ❌ Error creating report: ${error.message}`);
                continue;
            }

            // Insert plan items
            const planItems = [
                ...member.done_today.map(content => ({
                    report_id: report.id,
                    content,
                    type: "actual_done_today",
                    status: "done"
                })),
                ...member.plan_tomorrow.map(content => ({
                    report_id: report.id,
                    content,
                    type: "plan_for_tomorrow",
                    status: "todo"
                }))
            ];

            await supabase.from("plan_items").insert(planItems);
            console.log(`  ✅ Created report with ${planItems.length} items`);
        }
    }

    console.log("\n🎉 All reports submitted!");
}

submitReports().catch(console.error);
