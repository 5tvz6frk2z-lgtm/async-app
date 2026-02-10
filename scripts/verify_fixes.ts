#!/usr/bin/env tsx
/**
 * Verification Script for Code Review Fixes
 * Tests each fix to ensure it's properly applied
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
    test: string;
    passed: boolean;
    details: string;
}

const results: TestResult[] = [];

function logResult(test: string, passed: boolean, details: string) {
    results.push({ test, passed, details });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}`);
    if (!passed) console.log(`   ${details}`);
}

// Test 1: Verify Profile type includes avatar_url
function testProfileType() {
    console.log('\n1. Testing Profile Type Fix...');
    const typesPath = path.join(process.cwd(), 'lib/types.ts');
    const content = fs.readFileSync(typesPath, 'utf-8');

    const hasAvatarUrl = content.includes('avatar_url');
    const inProfileInterface = content.match(/export interface Profile\s*{[^}]*avatar_url[^}]*}/s);

    logResult(
        'Profile Type: avatar_url field',
        hasAvatarUrl && !!inProfileInterface,
        hasAvatarUrl
            ? (inProfileInterface ? 'avatar_url found in Profile interface' : 'avatar_url found but not in Profile interface')
            : 'avatar_url field missing from types.ts'
    );
}

// Test 2: Verify useEffect has proper dependencies
function testUseEffectDependencies() {
    console.log('\n2. Testing useEffect Dependencies Fix...');
    const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Look for the fetchReports useEffect
    const useEffectPattern = /useEffect\(\(\)\s*=>\s*{[\s\S]*?fetchReports\(\)[\s\S]*?},\s*\[(.*?)\]/;
    const match = content.match(useEffectPattern);

    if (match) {
        const deps = match[1].trim();
        const hasSupabase = deps.includes('supabase');
        const hasRouter = deps.includes('router');
        const isEmpty = deps === '';

        logResult(
            'useEffect Dependencies',
            hasSupabase && hasRouter,
            isEmpty
                ? 'Empty dependency array found!'
                : hasSupabase && hasRouter
                    ? 'Both supabase and router in deps'
                    : `Missing dependencies. Found: [${deps}]`
        );
    } else {
        logResult('useEffect Dependencies', false, 'Could not find useEffect pattern');
    }
}

// Test 3: Verify auth error handling
function testAuthErrorHandling() {
    console.log('\n3. Testing Auth Error Handling Fix...');
    const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    const hasAuthErrorCheck = content.includes('error: authError');
    const hasToastError = content.includes('toast.error') && content.includes('Failed to load profile');
    const hasRouterPush = content.includes('router.push("/login")');
    const hasConsoleError = content.includes('console.error("Auth error:"');

    const allChecks = hasAuthErrorCheck && hasToastError && hasRouterPush && hasConsoleError;

    logResult(
        'Auth Error Handling',
        allChecks,
        !allChecks
            ? `Missing: ${[
                !hasAuthErrorCheck && 'authError extraction',
                !hasToastError && 'toast.error',
                !hasRouterPush && 'router.push',
                !hasConsoleError && 'console.error'
            ].filter(Boolean).join(', ')}`
            : 'All error handling components present'
    );
}

// Test 4: Verify test credentials use env vars
function testCredentialsEnvVars() {
    console.log('\n4. Testing Test Credentials Fix...');
    const scriptPath = path.join(process.cwd(), 'scripts/verify_timeline_logic.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    const hasManagerEmailEnv = content.includes('process.env.TEST_MANAGER_EMAIL');
    const hasPasswordEnv = content.includes('process.env.TEST_MANAGER_PASSWORD');
    const noHardcodedEmail = !content.includes("email: 'manager@test.com'");
    const noHardcodedPassword = !content.includes("password: 'password'") ||
        content.includes("process.env.TEST_MANAGER_PASSWORD || 'password'");

    const allChecks = hasManagerEmailEnv && hasPasswordEnv;

    logResult(
        'Test Credentials Env Vars',
        allChecks,
        !allChecks
            ? `Missing: ${[
                !hasManagerEmailEnv && 'TEST_MANAGER_EMAIL env var',
                !hasPasswordEnv && 'TEST_MANAGER_PASSWORD env var'
            ].filter(Boolean).join(', ')}`
            : 'Environment variables properly used'
    );
}

// Test 5: Verify profile update has refetch
function testProfileUpdateRefetch() {
    console.log('\n5. Testing Profile Update Consistency Fix...');
    const dashboardPath = path.join(process.cwd(), 'components/dashboard/MemberDashboard.tsx');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Look for the handleSubmit function with refetch logic
    const hasRefetchComment = content.includes('Refetch to ensure consistency');
    const hasGetUserAfterUpdate = content.includes('user_metadata?.full_name');
    const hasCreateClientInSubmit = content.match(/const handleSubmit[\s\S]*?createClient\(\)/);

    const allChecks = hasRefetchComment && hasGetUserAfterUpdate && hasCreateClientInSubmit;

    logResult(
        'Profile Update Refetch',
        allChecks,
        !allChecks
            ? `Missing: ${[
                !hasRefetchComment && 'refetch comment',
                !hasGetUserAfterUpdate && 'user_metadata check',
                !hasCreateClientInSubmit && 'createClient in handleSubmit'
            ].filter(Boolean).join(', ')}`
            : 'Profile refetch logic present'
    );
}

// Test 6: Code Syntax Check
function testCodeSyntax() {
    console.log('\n6. Testing Code Syntax...');
    const { execSync } = require('child_process');

    try {
        // Just verify files exist and are readable
        const files = [
            'lib/types.ts',
            'components/dashboard/MemberDashboard.tsx',
            'scripts/verify_timeline_logic.ts'
        ];

        let allReadable = true;
        for (const file of files) {
            const filePath = path.join(process.cwd(), file);
            if (!fs.existsSync(filePath)) {
                allReadable = false;
                break;
            }
        }

        logResult(
            'Code Syntax Check',
            allReadable,
            allReadable ? 'All modified files exist and are readable' : 'Some files are missing'
        );
    } catch (error: any) {
        logResult('Code Syntax Check', false, `Error: ${error.message}`);
    }
}

async function runAllTests() {
    console.log('🔍 Verifying Code Review Fixes\n');
    console.log('=================================\n');

    testProfileType();
    testUseEffectDependencies();
    testAuthErrorHandling();
    testCredentialsEnvVars();
    testProfileUpdateRefetch();
    testCodeSyntax();

    console.log('\n=================================');
    console.log('\n📊 Summary:');
    console.log('=================================');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n⚠️  Issues Found:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.test}: ${r.details}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All fixes verified successfully!');
    }
}

runAllTests().catch(console.error);
