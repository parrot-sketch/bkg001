import { test, expect } from '../fixtures/auth.fixture';

test.describe('Admin Redirect Debug', () => {
    test('should redirect /admin to /admin/dashboard (authenticated)', async ({ loginAsAdmin }) => {
        const page = await loginAsAdmin();
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/dashboard/);
    });

    test('should redirect /admin to /login (unauthenticated)', async ({ page }) => {
        await page.goto('/admin');
        // Expect redirect to dashboard -> which redirects to login
        await expect(page).toHaveURL(/\/login/);
    });
});
