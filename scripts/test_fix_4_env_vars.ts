#!/usr/bin/env tsx
/**
 * Test 4: Verify test credentials use environment variables
 */

import fs from 'fs';
import path from 'path';

const scriptPath = path.join(process.cwd(), 'scripts/verify_timeline_logic.ts');
const content = fs.readFileSync(scriptPath, 'utf-8');

console.log('🔍 Testing Test Credentials Fix...\n');

const checks = [
    {
        name: 'Uses TEST_MANAGER_EMAIL env var',
        pattern: 'process.env.TEST_MANAGER_EMAIL',
        found: false
    },
    {
        name: 'Uses TEST_MANAGER_PASSWORD env var',
        pattern: 'process.env.TEST_MANAGER_PASSWORD',
        found: false
    },
    {
        name: 'Has fallback for email',
        pattern: "|| 'manager@test.com'",
        found: false
    },
    {
        name: 'Has fallback for password',
        pattern: "|| 'password'",
        found: false
    }
];

for (const check of checks) {
    check.found = content.includes(check.pattern);
    console.log(`${check.found ? '✓' : '✗'} ${check.name}: ${check.found}`);
}

// Check that credentials are NOT hardcoded (important!)
const hasHardcodedEmail = content.includes("email: 'manager@test.com'") &&
    !content.includes("process.env.TEST_MANAGER_EMAIL");
const hasHardcodedPassword = content.includes("password: 'password'") &&
    !content.includes("process.env.TEST_MANAGER_PASSWORD");

console.log(`✓ Email not hardcoded: ${!hasHardcodedEmail}`);
console.log(`✓ Password not hardcoded: ${!hasHardcodedPassword}`);

const allPassed = checks.every(c => c.found) && !hasHardcodedEmail && !hasHardcodedPassword;

if (allPassed) {
    console.log('\n✅ TEST PASSED: Test credentials properly use environment variables');
    process.exit(0);
} else {
    console.log('\n❌ TEST FAILED: Credentials security issue');
    process.exit(1);
}
