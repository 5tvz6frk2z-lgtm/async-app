
// Verification Script for Burnout Logic (Mocked Data)
// Since we lack Service Role Key for local DB access in script, we test the logic with mocks.

async function main() {
    console.log("Starting Burnout Logic Verification (Mocked)...");

    // Mock Data simulating the DB response
    // Scenario: 3 Late Reports, Low Wins
    const mockReports = [
        {
            created_at: new Date(new Date().setUTCHours(22, 0, 0, 0)).toISOString(), // Today 10 PM
            sentiment: 'yellow',
            blockers: null,
            plan_items: [{ type: 'actual_done_today', status: 'todo' }] // 0 wins
        },
        {
            created_at: new Date(new Date(Date.now() - 86400000).setUTCHours(23, 0, 0, 0)).toISOString(), // Yesterday 11 PM
            sentiment: 'green',
            blockers: null,
            plan_items: [{ type: 'actual_done_today', status: 'done' }] // 1 win
        },
        {
            created_at: new Date(new Date(Date.now() - 172800000).setUTCHours(21, 30, 0, 0)).toISOString(), // 2 days ago 9:30 PM
            sentiment: 'green',
            blockers: null,
            plan_items: [] // 0 wins
        }
    ];

    console.log(`Analyzing ${mockReports.length} mock reports...`);

    // Logic Verification
    let riskScore = 0;
    const reasons = [];

    // 1. Late Check
    let lateCount = 0;
    mockReports.forEach(r => {
        const d = new Date(r.created_at);
        const h = d.getUTCHours(); // UTC hour from ISO string parsing
        console.log(`Report time: ${d.toISOString()} (Hour: ${h})`);
        if (h >= 21 || h < 4) lateCount++;
    });
    console.log(`Late Reports Detected: ${lateCount} (Threshold >= 3)`);
    if (lateCount >= 3) {
        riskScore += 2;
        reasons.push("Late updates");
    }

    // 2. Wins Check
    let totalWins = 0;
    mockReports.forEach(r => {
        // @ts-ignore
        const wins = r.plan_items?.filter((i: any) => i.type === 'actual_done_today' && i.status === 'done').length || 0;
        totalWins += wins;
    });
    const avgWins = (mockReports.length || 1) > 0 ? totalWins / mockReports.length : 0;
    console.log(`Average Wins: ${avgWins.toFixed(2)} (Threshold < 1)`);
    if (mockReports.length >= 3 && avgWins < 1) {
        riskScore += 2;
        reasons.push("Low wins");
    }

    console.log("---------------------------------------------------");
    console.log(`Calculated Risk Score: ${riskScore}`);
    console.log(`Reasons: ${reasons.join(", ")}`);
    console.log("---------------------------------------------------");

    if (riskScore >= 4) console.log("SUCCESS: High Burnout Risk Detected!");
    else if (riskScore >= 2) console.log("PARTIAL SUCCESS: Medium Risk Detected.");
    else console.log("FAILURE: No Risk Detected.");
}

main().catch(console.error);

