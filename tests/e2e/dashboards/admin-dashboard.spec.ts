/**
 * Admin Dashboard E2E Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { waitForToast, clickButtonByText, waitForModal } from '../helpers/test-helpers';

test.describe('Admin Dashboard', () => {
  test('should allow admin to login', async ({ loginAsAdmin }) => {
    const page = await loginAsAdmin();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should display dashboard stats', async ({ loginAsAdmin }) => {
    const page = await loginAsAdmin();
    
    const statsCards = page.locator('[class*="card"]');
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should view all appointments', async ({ loginAsAdmin }) => {
    const page = await loginAsAdmin();
    await page.goto('/admin/appointments');
    
    await expect(page).toHaveURL(/\/admin\/appointments/);
    const appointmentsList = page.locator('[class*="appointment"]').first();
    await expect(appointmentsList).toBeVisible({ timeout: 5000 });
  });

  test('should manage staff', async ({ loginAsAdmin }) => {
    const page = await loginAsAdmin();
    await page.goto('/admin/staff');
    
    const staffList = page.locator('[class*="card"], [class*="staff"]').first();
    await expect(staffList).toBeVisible({ timeout: 5000 });
  });

  test('should view appointments with doctor info', async ({ loginAsAdmin }) => {
    const page = await loginAsAdmin();
    await page.goto('/admin/appointments');
    
    // Check for doctor information in appointments
    const doctorInfo = page.locator('text=/Dr\./i').first();
    await expect(doctorInfo).toBeVisible({ timeout: 5000 });
  });
});
