#!/usr/bin/env tsx
/**
 * Test 1: Verify Profile Type includes avatar_url
 */

import fs from 'fs';
import path from 'path';

const typesPath = path.join(process.cwd(), 'lib/types.ts');
const content = fs.readFileSync(typesPath, 'utf-8');

console.log('🔍 Testing Profile Type Fix...\n');

// Check if avatar_url exists
const hasAvatarUrl = content.includes('avatar_url');
console.log(`✓ avatar_url field present: ${hasAvatarUrl}`);

// Check if it's in the Profile interface
const profileMatch = content.match(/export interface Profile\s*{([^}]*)}/s);
if (profileMatch) {
    const profileContent = profileMatch[1];
    const hasAvatarUrlInProfile = profileContent.includes('avatar_url');
    console.log(`✓ avatar_url in Profile interface: ${hasAvatarUrlInProfile}`);

    // Show the type definition
    console.log('\nProfile Interface:');
    console.log('------------------');
    console.log(profileMatch[0]);

    if (hasAvatarUrl && hasAvatarUrlInProfile) {
        console.log('\n✅ TEST PASSED: avatar_url field properly added to Profile type');
        process.exit(0);
    }
}

console.log('\n❌ TEST FAILED: avatar_url field missing or incorrectly placed');
process.exit(1);
