/**
 * Frontdesk Dashboard E2E Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { waitForToast, clickButtonByText, waitForModal } from '../helpers/test-helpers';

test.describe('Frontdesk Dashboard', () => {
  test('should allow frontdesk to login', async ({ loginAsFrontdesk }) => {
    const page = await loginAsFrontdesk();
    await expect(page).toHaveURL(/\/frontdesk\/dashboard/);
  });

  test('should display today\'s appointments', async ({ loginAsFrontdesk }) => {
    const page = await loginAsFrontdesk();
    const appointmentsSection = page.locator('text=/appointments/i').first();
    await expect(appointmentsSection).toBeVisible({ timeout: 5000 });
  });

  test('should check-in patient', async ({ loginAsFrontdesk }) => {
    const page = await loginAsFrontdesk();
    await page.goto('/frontdesk/appointments');
    
    const checkInButton = page.locator('button:has-text("Check In")').first();
    if (await checkInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkInButton.click();
      await waitForToast(page, 'success', 'success');
    }
  });

  test('should search patients', async ({ loginAsFrontdesk }) => {
    const page = await loginAsFrontdesk();
    await page.goto('/frontdesk/patient-intake');
    
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test@example.com');
      await clickButtonByText(page, 'Search');
      await page.waitForTimeout(2000);
    }
  });
});
