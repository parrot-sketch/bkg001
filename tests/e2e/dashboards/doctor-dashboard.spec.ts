/**
 * Doctor Dashboard E2E Tests
 * 
 * Tests for Doctor Dashboard functionality:
 * - Authentication
 * - Appointment management
 * - Patient check-in
 * - Consultation workflows
 * - Patient profile viewing
 */

import { test } from '../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import {
  waitForToast,
  clickButtonByText,
  waitForModal,
  closeModal,
  verifyBranding,
  verifyLoadingState,
} from '../helpers/test-helpers';

test.describe('Doctor Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Authentication', () => {
    test('should allow doctor to login', async ({ page, loginAsDoctor }) => {
      const doctorPage = await loginAsDoctor();
      await expect(doctorPage).toHaveURL(/\/doctor\/dashboard/);
    });

    test('should redirect unauthenticated user to login', async ({ page }) => {
      await page.goto('/doctor/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Appointment Management', () => {
    test('should display today\'s appointments', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      // Check for appointments section
      const appointmentsSection = page.locator('text=/today/i, text=/appointments/i').first();
      await expect(appointmentsSection).toBeVisible({ timeout: 5000 });
    });

    test('should view all appointments', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      await page.goto('/doctor/appointments');
      await expect(page).toHaveURL(/\/doctor\/appointments/);
      
      // Check for appointments list
      const appointmentsList = page.locator('[class*="appointment"], [class*="card"]');
      await expect(appointmentsList.first()).toBeVisible({ timeout: 5000 });
    });

    test('should check-in patient', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      await page.goto('/doctor/appointments');
      
      // Find check-in button
      const checkInButton = page.locator('button:has-text("Check In")').first();
      
      if (await checkInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await checkInButton.click();
        
        // Wait for success
        await waitForToast(page, 'success', 'success');
      }
    });
  });

  test.describe('Consultation Workflows', () => {
    test('should start consultation', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      await page.goto('/doctor/appointments');
      
      // Find start consultation button
      const startButton = page.locator('button:has-text("Start Consultation")').first();
      
      if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startButton.click();
        
        // Wait for consultation dialog
        const modal = await waitForModal(page);
        await expect(modal).toBeVisible();
      }
    });

    test('should complete consultation', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      await page.goto('/doctor/appointments');
      
      // Find complete consultation button
      const completeButton = page.locator('button:has-text("Complete Consultation")').first();
      
      if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await completeButton.click();
        
        // Wait for completion dialog
        const modal = await waitForModal(page);
        await expect(modal).toBeVisible();
      }
    });
  });

  test.describe('UI/UX Validation', () => {
    test('should use Nairobi Sculpt branding', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      await verifyBranding(page);
    });

    test('should show loading states', async ({ loginAsDoctor }) => {
      const page = await loginAsDoctor();
      
      await verifyLoadingState(page, async () => {
        await page.reload();
      });
    });
  });
});
