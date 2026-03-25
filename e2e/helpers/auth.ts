import { Page, expect } from '@playwright/test';

/**
 * Auth helper for E2E tests.
 * Uses Supabase email/password auth via the app's login page.
 * 
 * Since we don't have dedicated test accounts, these helpers sign up
 * fresh test users or log in with existing ones via the app UI.
 */

const TEST_MANAGER = {
    email: process.env.TEST_MANAGER_EMAIL || 'test-manager@statusloop.test',
    password: process.env.TEST_MANAGER_PASSWORD || 'TestManager2026!',
};

const TEST_MEMBER = {
    email: process.env.TEST_MEMBER_EMAIL || 'test-member@statusloop.test',
    password: process.env.TEST_MEMBER_PASSWORD || 'TestMember2026!',
};

/**
 * Log in via the app's login page.
 * Waits for redirect after successful auth.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in login form
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.count() === 0) {
        // Already logged in, skip
        return;
    }

    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

export async function loginAsManager(page: Page) {
    await loginViaUI(page, TEST_MANAGER.email, TEST_MANAGER.password);
}

export async function loginAsMember(page: Page) {
    await loginViaUI(page, TEST_MEMBER.email, TEST_MEMBER.password);
}

export async function logout(page: Page) {
    // Use Supabase client-side signout
    await page.evaluate(async () => {
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
            (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_SUPABASE_URL || '',
            (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        await supabase.auth.signOut();
    });
    // Navigate to login as fallback
    await page.goto('/login');
}

export { TEST_MANAGER, TEST_MEMBER };
