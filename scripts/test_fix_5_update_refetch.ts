#!/usr/bin/env tsx
/**
 * Test 5: Verify profile update has consistency refetch
 */

import fs from 'fs';
import path from 'path';

const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
const content = fs.readFileSync(dashboardPath, 'utf-8');

console.log('🔍 Testing Profile Update Consistency Fix...\n');

const checks = [
    {
        name: 'Has refetch comment',
        pattern: 'Refetch to ensure consistency',
        found: false
    },
    {
        name: 'Creates Supabase client in handleSubmit',
        pattern: 'createClient()',
        found: false
    },
    {
        name: 'Calls getUser after update',
        pattern: 'getUser()',
        found: false
    },
    {
        name: 'Checks user_metadata.full_name',
        pattern: 'user_metadata?.full_name',
        found: false
    },
    {
        name: 'Updates UI with refetched data',
        pattern: 'onUpdate',
        found: false
    }
];

// Find the handleSubmit function
const handleSubmitMatch = content.match(/const handleSubmit[\s\S]*?(?=\n    })/);
if (handleSubmitMatch) {
    const handleSubmitContent = handleSubmitMatch[0];

    for (const check of checks) {
        check.found = handleSubmitContent.includes(check.pattern);
        console.log(`${check.found ? '✓' : '✗'} ${check.name}: ${check.found}`);
    }

    const allPassed = checks.every(c => c.found);

    if (allPassed) {
        console.log('\n✅ TEST PASSED: Profile update includes consistency refetch');
        process.exit(0);
    } else {
        console.log('\n❌ TEST FAILED: Missing refetch logic');
        const missing = checks.filter(c => !c.found).map(c => c.name);
        console.log(`   Missing: ${missing.join(', ')}`);
    }
} else {
    console.log('❌ TEST FAILED: Could not find handleSubmit function');
}

process.exit(1);
