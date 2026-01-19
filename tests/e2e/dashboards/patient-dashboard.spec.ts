/**
 * Patient Dashboard E2E Tests
 * 
 * Tests for Patient Dashboard functionality:
 * - Authentication
 * - Navigation
 * - Appointment scheduling
 * - Viewing appointments
 * - Doctor profile viewing
 * - Profile management
 */

import { test, expect } from '../fixtures/auth.fixture';
import {
  waitForToast,
  clickButtonByText,
  waitForModal,
  closeModal,
  formatDateForInput,
  formatTimeForInput,
  getFutureDate,
  verifyBranding,
  checkMobileLayout,
  verifyLoadingState,
} from '../helpers/test-helpers';

test.describe('Patient Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Authentication', () => {
    test('should allow patient to login', async ({ page, loginAsPatient }) => {
      const patientPage = await loginAsPatient();
      
      // Verify redirect to dashboard
      await expect(patientPage).toHaveURL(/\/patient\/dashboard/);
      
      // Verify dashboard elements are visible
      await expect(patientPage.locator('h1, h2').first()).toBeVisible();
    });

    test('should redirect unauthenticated user to login', async ({ page }) => {
      await page.goto('/patient/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow patient to logout', async ({ page, loginAsPatient, logout }) => {
      await loginAsPatient();
      
      // Perform logout
      await logout();
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between dashboard sections', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Navigate to Appointments
      await clickButtonByText(page, 'Appointments');
      await expect(page).toHaveURL(/\/patient\/appointments/);
      
      // Navigate back to Dashboard
      await clickButtonByText(page, 'Dashboard');
      await expect(page).toHaveURL(/\/patient\/dashboard/);
    });

    test('should highlight active route in sidebar', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Check dashboard is active
      const dashboardLink = page.locator('nav a[href*="/dashboard"]').first();
      const isActive = await dashboardLink.getAttribute('class');
      expect(isActive).toContain('active');
    });
  });

  test.describe('Dashboard Overview', () => {
    test('should display welcome message', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await expect(page.locator('text=/Welcome/i')).toBeVisible();
    });

    test('should display quick stats', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Check for stats cards
      const statsCards = page.locator('[class*="card"], [class*="Card"]');
      await expect(statsCards.first()).toBeVisible();
    });

    test('should display upcoming appointments', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Look for appointments section
      const appointmentsSection = page.locator('text=/upcoming/i, text=/appointments/i').first();
      await expect(appointmentsSection).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Appointment Scheduling', () => {
    test('should open schedule appointment dialog', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Navigate to appointments page
      await page.goto('/patient/appointments');
      
      // Click schedule appointment button
      await clickButtonByText(page, 'Schedule Appointment');
      
      // Wait for modal
      const modal = await waitForModal(page, 'Schedule');
      await expect(modal).toBeVisible();
    });

    test('should schedule appointment with doctor selection', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await page.goto('/patient/appointments');
      await clickButtonByText(page, 'Schedule Appointment');
      
      const modal = await waitForModal(page);
      
      // Select doctor from dropdown
      const doctorSelect = modal.locator('select, [role="combobox"]').first();
      if (await doctorSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Wait for doctors to load
        await page.waitForTimeout(2000);
        
        // Select first available doctor
        const options = await doctorSelect.locator('option').all();
        if (options.length > 1) {
          await doctorSelect.selectOption({ index: 1 }); // Skip "Select..." option
        }
      }
      
      // Fill date
      const futureDate = getFutureDate(7);
      const dateInput = modal.locator('input[type="date"]').first();
      await dateInput.fill(formatDateForInput(futureDate));
      
      // Fill time
      const timeInput = modal.locator('input[type="time"]').first();
      await timeInput.fill(formatTimeForInput(14, 0)); // 2:00 PM
      
      // Fill appointment type
      const typeInput = modal.locator('input[name*="type"], input[placeholder*="type" i]').first();
      if (await typeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeInput.fill('Consultation');
      }
      
      // Submit
      await clickButtonByText(modal, 'Schedule', true);
      
      // Wait for success toast
      await waitForToast(page, 'success', 'success');
    });

    test('should display doctor profiles in dropdown', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await page.goto('/patient/appointments');
      await clickButtonByText(page, 'Schedule Appointment');
      
      const modal = await waitForModal(page);
      
      // Check for doctor selection dropdown
      const doctorSelect = modal.locator('select, [role="combobox"]').first();
      await expect(doctorSelect).toBeVisible({ timeout: 5000 });
      
      // Verify doctor names are visible in dropdown
      const doctorOptions = await doctorSelect.locator('option').allTextContents();
      expect(doctorOptions.length).toBeGreaterThan(0);
    });

    test('should view doctor profile from selection', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await page.goto('/patient/appointments');
      await clickButtonByText(page, 'Schedule Appointment');
      
      const modal = await waitForModal(page);
      
      // Look for "View" button next to doctor selection
      const viewProfileButton = modal.locator('button:has-text("View")').first();
      
      if (await viewProfileButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewProfileButton.click();
        
        // Wait for profile modal
        const profileModal = await waitForModal(page, 'Profile');
        await expect(profileModal).toBeVisible();
        
        // Verify profile content
        await expect(profileModal.locator('text=/Dr\./i, text=/Education/i, text=/Bio/i')).toBeVisible();
      }
    });
  });

  test.describe('Appointment Display', () => {
    test('should display appointments with doctor info', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await page.goto('/patient/appointments');
      
      // Check for appointment cards
      const appointmentCards = page.locator('[class*="appointment"], [class*="card"]');
      const cardCount = await appointmentCards.count();
      
      if (cardCount > 0) {
        const firstCard = appointmentCards.first();
        
        // Verify doctor name is displayed
        await expect(firstCard.locator('text=/Dr\./i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should view doctor profile from appointment card', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      await page.goto('/patient/appointments');
      
      // Find appointment card with doctor info
      const doctorNameLink = page.locator('button:has-text("Dr."), a:has-text("Dr.")').first();
      
      if (await doctorNameLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await doctorNameLink.click();
        
        // Wait for profile modal
        const profileModal = await waitForModal(page, 'Profile');
        await expect(profileModal).toBeVisible();
      }
    });
  });

  test.describe('UI/UX Validation', () => {
    test('should use Nairobi Sculpt branding', async ({ authenticatedPage }) => {
      await verifyBranding(authenticatedPage);
    });

    test('should be responsive on mobile', async ({ authenticatedPage }) => {
      await checkMobileLayout(authenticatedPage);
    });

    test('should show loading states', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Trigger data reload
      await page.reload();
      
      // Check for loading indicators
      const loadingIndicator = page.locator('.animate-spin, [data-testid="loading"]').first();
      const isLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Loading should disappear
      if (isLoading) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Simulate API error by navigating to invalid endpoint
      await page.route('**/api/appointments**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Server error' }),
        });
      });
      
      await page.goto('/patient/appointments');
      await page.reload();
      
      // Should show error toast
      await waitForToast(page, undefined, 'error');
    });

    test('should show empty state when no appointments', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock empty response
      await page.route('**/api/appointments**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      });
      
      await page.goto('/patient/appointments');
      
      // Should show empty state message
      await expect(page.locator('text=/no appointments/i, text=/empty/i')).toBeVisible({ timeout: 5000 });
    });
  });
});
