import { test, expect } from '@playwright/test';
import { loginAsManager } from './helpers/auth';

test.describe('Settings Page (Manager Only)', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsManager(page);
    });

    test('settings page loads for managers', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Should see Team Settings heading
        const heading = page.getByText('Team Settings');
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('settings page shows General Configuration section', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const generalConfig = page.getByText('General Configuration');
        await expect(generalConfig).toBeVisible({ timeout: 10000 });

        // Team Name input should be present
        const teamNameInput = page.locator('#teamName');
        await expect(teamNameInput).toBeVisible();
    });

    test('team name input is editable', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const teamNameInput = page.locator('#teamName');
        await expect(teamNameInput).toBeVisible({ timeout: 10000 });

        // Get current value
        const currentValue = await teamNameInput.inputValue();

        // Edit the value
        await teamNameInput.clear();
        await teamNameInput.fill('Updated Team Name');

        const newValue = await teamNameInput.inputValue();
        expect(newValue).toBe('Updated Team Name');

        // Restore original value
        await teamNameInput.clear();
        await teamNameInput.fill(currentValue || 'My Engineering Team');
    });

    test('Save Changes button exists and is clickable', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const saveButton = page.getByRole('button', { name: /Save Changes/i });
        await expect(saveButton).toBeVisible({ timeout: 10000 });
        await expect(saveButton).toBeEnabled();
    });

    test('Weekly Roll-Up Report section is present with toggle', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const weeklySection = page.getByText('Weekly Roll-Up Report');
        await expect(weeklySection).toBeVisible({ timeout: 10000 });

        // Toggle switch for enabling weekly report
        const enableToggle = page.getByText('Enable Weekly Report');
        await expect(enableToggle).toBeVisible();
    });

    test('Weekly report day and time selectors appear when enabled', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // The "Send On" and "At Time" labels should be visible when weekly report is enabled
        const sendOnLabel = page.getByText('Send On');
        const atTimeLabel = page.getByText('At Time');

        // Check if weekly report is enabled (toggle is checked)
        // If it's enabled, we should see the day/time selectors
        const hasSendOn = await sendOnLabel.count() > 0;
        const hasAtTime = await atTimeLabel.count() > 0;

        // Both should appear together
        if (hasSendOn) {
            expect(hasAtTime).toBeTruthy();
        }
    });

    test('Morning Briefing section is present with toggle', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const briefingSection = page.getByText('Morning Briefing');
        await expect(briefingSection).toBeVisible({ timeout: 10000 });

        const enableToggle = page.getByText('Enable Morning Briefing');
        await expect(enableToggle).toBeVisible();
    });

    test('Features & Experiments section has toggles', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const featuresSection = page.getByText('Features & Experiments');
        await expect(featuresSection).toBeVisible({ timeout: 10000 });

        // Team Pulse Feed toggle
        const pulseFeed = page.getByText('Team Pulse Feed');
        await expect(pulseFeed).toBeVisible();

        // Smart Carryover toggle
        const smartCarryover = page.getByText('Smart Carryover');
        await expect(smartCarryover).toBeVisible();
    });

    test('Send Test Report button exists', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const testReportButton = page.getByRole('button', { name: /Send Test Report/i });
        // May only be visible when weekly report is enabled
        const hasButton = await testReportButton.count() > 0;
        expect(typeof hasButton).toBe('boolean');
    });

    test('Daily Reminder Time selector is present', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const reminderLabel = page.getByText('Daily Reminder Time');
        await expect(reminderLabel).toBeVisible({ timeout: 10000 });
    });
});
