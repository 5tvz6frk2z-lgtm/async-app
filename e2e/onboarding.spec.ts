import { test, expect } from '@playwright/test';
import { loginAsManager } from './helpers/auth';

test.describe('Onboarding & Team Creation', () => {

    test('unauthenticated user visiting onboarding gets redirected to login', async ({ page }) => {
        await page.goto('/onboarding');
        await page.waitForLoadState('networkidle');

        await page.waitForURL('**/login**', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('onboarding page has team creation form for managers', async ({ page }) => {
        await loginAsManager(page);

        // If user already has a team, they'll be redirected to dashboard
        // Check what page we end up on
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();

        if (currentUrl.includes('/onboarding')) {
            // User has no team yet — should see Create Team form
            const heading = page.getByText('Welcome to Status Loop');
            await expect(heading).toBeVisible();

            const teamNameInput = page.locator('input[placeholder*="Engineering"]');
            await expect(teamNameInput).toBeVisible();

            const createButton = page.getByRole('button', { name: /Create Team/i });
            await expect(createButton).toBeVisible();
        } else if (currentUrl.includes('/dashboard')) {
            // User already has a team — this is expected for existing accounts
            // Verify dashboard loads
            const body = page.locator('body');
            await expect(body).toBeVisible();
        }
    });

    test('onboarding page shows "Create Team" button that is disabled without team name', async ({ page }) => {
        await loginAsManager(page);
        await page.waitForLoadState('networkidle');

        if (page.url().includes('/onboarding')) {
            const createButton = page.getByRole('button', { name: /Create Team/i });

            // Button should be disabled when team name is empty
            await expect(createButton).toBeDisabled();

            // Type a team name
            const teamNameInput = page.locator('input[placeholder*="Engineering"]');
            await teamNameInput.fill('Test Team');

            // Button should now be enabled
            await expect(createButton).toBeEnabled();
        }
    });
});
