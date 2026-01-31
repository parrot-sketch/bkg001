import { test, expect, login } from '../fixtures/auth.fixture';

test.describe('Doctor Onboarding Flow', () => {
    // Increased timeout for this specific test suite due to multiple navigations
    test.setTimeout(60000);

    test('New doctor can login, set schedule, and update profile', async ({
        page,
        logout
    }) => {
        // 1. Login as Doctor
        // Using the standard seed doctor for reliability.
        // Ideally we would use a newly created doctor, but for E2E flow validation this suffices.
        await login(page, 'doctor@nairobisculpt.com', 'doctor123');

        // 2. Verify Dashboard and Onboarding Prompt
        await expect(page.getByText('Surgeon Control Center')).toBeVisible();
        await expect(page.getByText('Complete Setup')).toBeVisible({ timeout: 10000 });

        // 3. Click Setup to go to Profile
        await page.getByText('Complete Setup').click();
        await page.waitForURL(/\/doctor\/profile/);

        await expect(page.getByText('Doctor Profile')).toBeVisible();

        // 4. Open Schedule Manager
        // On Profile Page, look for "Manage Schedule" button
        await page.getByRole('button', { name: 'Manage Schedule' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Working Days & Sessions')).toBeVisible();

        // 4. Modify Schedule (Toggle Monday)
        // Find the Monday checkbox and ensure it is checked
        // Note: The structure in EnhancedScheduleManager is Checkbox + Label inside a div.
        // We can target the checkbox by its ID "day-Monday".
        const mondayCheckbox = page.locator('#day-Monday');

        // If not checked, check it. If checked, uncheck and check again to trigger change event logic if needed?
        // Let's just ensure it IS checked.
        if (!(await mondayCheckbox.isChecked())) {
            await mondayCheckbox.click();
        }

        // Save
        await page.getByRole('button', { name: 'Save Weekly Schedule' }).click();

        // Wait for success toast
        // Depending on sonner/toast implementation, we look for the text.
        await expect(page.getByText('Weekly schedule updated successfully')).toBeVisible();

        // Wait for dialog to close (optional, but good practice)
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // 5. Navigate to Profile
        await page.goto('/doctor/profile');
        await expect(page.getByText('Doctor Profile')).toBeVisible();

        // 6. Edit Profile
        // There is an "Edit Profile" button on the profile page.
        await page.getByRole('button', { name: 'Edit Profile' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Update Bio
        const bioInput = page.getByLabel('Biography');
        await bioInput.fill('Updated bio via E2E test ' + Date.now());

        // Save
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await expect(page.getByText('Profile updated successfully')).toBeVisible();

        // Verify Bio on page (Snapshot requires reloading or state update. The dialog success callback should reload)
        // We look for partial text "Updated bio via E2E test"
        await expect(page.getByText('Updated bio via E2E test')).toBeVisible();

        // Logout
        await logout();
    });
});
