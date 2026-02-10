#!/usr/bin/env tsx
/**
 * Test 3: Verify auth error handling is comprehensive
 */

import fs from 'fs';
import path from 'path';

const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
const content = fs.readFileSync(dashboardPath, 'utf-8');

console.log('🔍 Testing Auth Error Handling Fix...\n');

const checks = [
    { name: 'Extracts authError', pattern: 'error: authError', found: false },
    { name: 'Shows toast error', pattern: 'toast.error', found: false },
    { name: 'Includes error message', pattern: 'Failed to load profile', found: false },
    { name: 'Redirects to login', pattern: 'router.push("/login")', found: false },
    { name: 'Logs to console', pattern: 'console.error("Auth error:"', found: false },
    { name: 'Stops loading spinner', pattern: 'setLoading(false)', found: false }
];

for (const check of checks) {
    check.found = content.includes(check.pattern);
    console.log(`${check.found ? '✓' : '✗'} ${check.name}: ${check.found}`);
}

const allPassed = checks.every(c => c.found);

if (allPassed) {
    console.log('\n✅ TEST PASSED: All error handling components present');
    process.exit(0);
} else {
    console.log('\n❌ TEST FAILED: Missing error handling components');
    const missing = checks.filter(c => !c.found).map(c => c.name);
    console.log(`   Missing: ${missing.join(', ')}`);
    process.exit(1);
}
