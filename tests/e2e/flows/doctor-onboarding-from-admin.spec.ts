/**
 * Doctor onboarding via Admin-created account
 *
 * Flow:
 * - Admin creates a doctor from /admin/staff
 * - Doctor logs in with the temporary password
 * - Doctor is redirected into schedule setup onboarding
 */

import { test, expect, login, logout } from '../fixtures/auth.fixture';
import { waitForToast, clickButtonByText } from '../helpers/test-helpers';

test.describe('Doctor Onboarding (Admin-created)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should redirect newly created doctor to schedule setup', async ({ page, loginAsAdmin }) => {
    const unique = Date.now();
    const email = `e2e.doctor.${unique}@nairobisculpt.com`;
    const password = `TempPass${unique}!`;

    await loginAsAdmin();
    await page.goto('/admin/staff');

    await clickButtonByText(page, 'Onboard Staff');

    await page.locator('input[placeholder="e.g. James"]').fill('E2E');
    await page.locator('input[placeholder="e.g. Muthomi"]').fill('Doctor');
    await page.locator('input[type="email"][placeholder="staff@nairobisculpt.com"]').fill(email);
    await page.locator('input[type="password"][required]').fill(password);

    await clickButtonByText(page, 'Onboard Staff');
    await waitForToast(page, 'Staff member onboarded successfully', 'success');

    await logout(page);

    await login(page, email, password);

    await expect(page).toHaveURL(/\/doctor\/schedule/);
    await expect(page).toHaveURL(/setup=true/);
    await expect(page.locator('text=Configure Availability & Slot Rules')).toBeVisible({ timeout: 10000 });
  });
});

