#!/usr/bin/env tsx
/**
 * Test 2: Verify useEffect has proper dependencies
 */

import fs from 'fs';
import path from 'path';

const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
const content = fs.readFileSync(dashboardPath, 'utf-8');

console.log('🔍 Testing useEffect Dependencies Fix...\n');

// Look for the fetchReports useEffect
const useEffectPattern = /useEffect\(\(\)\s*=>\s*{[\s\S]*?fetchReports\(\)[\s\S]*?},\s*\[(.*?)\]/;
const match = content.match(useEffectPattern);

if (match) {
    const deps = match[1].trim();
    console.log(`Found useEffect dependency array: [${deps}]`);

    const hasSupabase = deps.includes('supabase');
    const hasRouter = deps.includes('router');

    console.log(`✓ Contains 'supabase': ${hasSupabase}`);
    console.log(`✓ Contains 'router': ${hasRouter}`);

    if (hasSupabase && hasRouter) {
        console.log('\n✅ TEST PASSED: useEffect has all required dependencies');
        process.exit(0);
    } else {
        console.log('\n❌ TEST FAILED: Missing dependencies');
        console.log(`   Expected: [supabase, router]`);
        console.log(`   Found: [${deps}]`);
    }
} else {
    console.log('❌ TEST FAILED: Could not find useEffect pattern');
}

process.exit(1);
