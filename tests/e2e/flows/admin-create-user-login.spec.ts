import { test, expect } from '../fixtures/auth.fixture';
import { waitForToast, clickButtonByText, waitForModal } from '../helpers/test-helpers';

test.describe('Admin User Creation & Login Flow', () => {
    test.setTimeout(60000); // Increase timeout for slow environment

    const newUser = {
        firstName: 'Verified',
        lastName: 'Doctor',
        email: `verified.doctor.${Date.now()}@nairobisculpt.com`,
        password: 'SecurePassword123!',
        role: 'DOCTOR',
        phone: '254700000000'
    };

    test('should allow admin to create a user and that user to login', async ({ loginAsAdmin, page, logout }) => {
        // 1. Login as Admin
        await loginAsAdmin();
        await page.goto('/admin/staff');

        // 2. Create New Staff
        await clickButtonByText(page, 'Add Staff');
        const modal = await waitForModal(page);

        await modal.getByLabel('First Name').fill(newUser.firstName);
        await modal.getByLabel('Last Name').fill(newUser.lastName);
        await modal.getByLabel('Email').fill(newUser.email);
        await modal.locator('input[type="password"]').fill(newUser.password);
        await modal.getByLabel('Phone').fill(newUser.phone);

        // Select Role
        await modal.locator('select#role').selectOption(newUser.role);

        // await clickButtonByText(modal, 'Create Staff'); // Error: modal is Locator
        await modal.getByText('Create Staff').click();

        // Wait for success toast
        await waitForToast(page, 'success');

        // 3. Logout
        await logout();
        await page.waitForURL(/\/login/);

        // 4. Login as New User
        await page.getByLabel('Email').fill(newUser.email);
        await page.getByLabel('Password', { exact: true }).fill(newUser.password);
        await page.getByRole('button', { name: /login/i }).click();

        // 5. Verify Redirect to Doctor Dashboard
        await expect(page).toHaveURL(/\/doctor\/dashboard/, { timeout: 15000 });
        await expect(page.locator('text=Welcome, Dr.')).toBeVisible({ timeout: 10000 });
    });
});
