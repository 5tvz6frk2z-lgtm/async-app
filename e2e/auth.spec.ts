import { test, expect } from '@playwright/test';

test.describe('Authentication & Routing', () => {

    test.describe('Public Routes', () => {
        test('home page is accessible without authentication', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Should NOT redirect to login
            expect(page.url()).not.toContain('/login');

            // Page should have content
            const body = page.locator('body');
            await expect(body).toBeVisible();
        });

        test('login page is accessible', async ({ page }) => {
            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Should have email and password inputs
            const emailInput = page.locator('input[type="email"]');
            await expect(emailInput).toBeVisible();

            const passwordInput = page.locator('input[type="password"]');
            await expect(passwordInput).toBeVisible();
        });

        test('signup page is accessible', async ({ page }) => {
            await page.goto('/signup');
            await page.waitForLoadState('networkidle');

            // Should have form elements
            const emailInput = page.locator('input[type="email"]');
            await expect(emailInput).toBeVisible();
        });
    });

    test.describe('Protected Routes', () => {
        test('dashboard redirects unauthenticated users to login', async ({ page }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');

            // Should redirect to login
            await page.waitForURL('**/login**', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });

        test('daily page redirects unauthenticated users to login', async ({ page }) => {
            await page.goto('/daily');
            await page.waitForLoadState('networkidle');

            await page.waitForURL('**/login**', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });

        test('settings page redirects unauthenticated users to login', async ({ page }) => {
            await page.goto('/dashboard/settings');
            await page.waitForLoadState('networkidle');

            await page.waitForURL('**/login**', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });

        test('profile page redirects unauthenticated users to login', async ({ page }) => {
            await page.goto('/profile');
            await page.waitForLoadState('networkidle');

            await page.waitForURL('**/login**', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });
    });
});
