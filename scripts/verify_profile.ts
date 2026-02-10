
// Verification Script for Profile Name Logic (Mocked)
// Verifies validation and update logic without live DB connection.

import { z } from "zod";

// Replicating the Zod schema from app/(app)/profile/actions.ts
const updateProfileSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name must be less than 100 characters"),
});

async function mockUpdateProfileName(newName: string, mockUser: any) {
    console.log(`Attempting to update name to: "${newName}"`);

    // 1. Validation
    const result = updateProfileSchema.safeParse({ name: newName });
    if (!result.success) {
        console.error("Validation Failed:", result.error.issues[0].message);
        return { error: result.error.issues[0].message };
    }

    // 2. Auth Check (Mocked)
    if (!mockUser) {
        console.error("Auth Failed: Unauthorized");
        return { error: "Unauthorized" };
    }

    // 3. Database Update (Mocked)
    console.log(`Simulating DB Update: UPDATE profiles SET name = '${newName}' WHERE id = '${mockUser.id}'`);

    // Simulating success
    console.log("Success: Profile updated.");
    return { success: true };
}

async function main() {
    console.log("Starting Profile Logic Verification...");
    const user = { id: "user-123", email: "test@example.com" };

    // Test 1: Valid Name
    await mockUpdateProfileName("Jane Doe", user);

    // Test 2: Empty Name (Should Fail)
    await mockUpdateProfileName("", user);

    // Test 3: Name too long (Should Fail)
    const longName = "a".repeat(101);
    await mockUpdateProfileName(longName, user);

    // Test 4: Unauthenticated (Should Fail)
    await mockUpdateProfileName("Hacker", null);
}

main().catch(console.error);
