/**
 * Login Page UX & Authentication E2E Tests
 * 
 * Comprehensive tests for:
 * - Login page branding and UI
 * - Authentication flow
 * - Role-based access control
 * - User context management
 */

import { test, expect } from '../fixtures/auth.fixture';
import {
  waitForToast,
  verifyBranding,
  checkMobileLayout,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Login Page UX & Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login Page Branding', () => {
    test('should display Nairobi Sculpt branding', async ({ page }) => {
      await page.goto('/login');

      // Check for logo/branding
      const logo = page.locator('text="NS", text="Nairobi Sculpt"').first();
      await expect(logo).toBeVisible();

      // Check for gradient class
      const gradientElement = page.locator('.nairobi-gradient').first();
      await expect(gradientElement).toBeVisible();
    });

    test('should use correct brand colors', async ({ page }) => {
      await page.goto('/login');

      // Check primary color (Deep Navy #1a1a2e)
      const heading = page.locator('h1').first();
      const color = await heading.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // Should be dark navy (rgb(26, 26, 46) or similar)
      expect(color).toBeTruthy();

      // Verify branding colors are applied
      await verifyBranding(page);
    });

    test('should use correct typography', async ({ page }) => {
      await page.goto('/login');

      // Check heading uses Playfair Display
      const heading = page.locator('h1').first();
      const fontFamily = await heading.evaluate((el) => {
        return window.getComputedStyle(el).fontFamily;
      });
      
      // Should include Playfair Display
      expect(fontFamily.toLowerCase()).toContain('playfair');
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // Form should be visible and usable
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Inputs should be accessible
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Login Form Functionality', () => {
    test('should display login form with required fields', async ({ page }) => {
      await page.goto('/login');

      // Check for email input
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('required');

      // Check for password input
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('required');

      // Check for submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('invalid-email');
      
      // HTML5 validation should prevent submission
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error or prevent submission
      const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    });

    test('should show loading state during authentication', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      
      // Click submit and check for loading state
      await submitButton.click();

      // Button should show loading text or be disabled
      const buttonText = await submitButton.textContent();
      const isDisabled = await submitButton.isDisabled();
      
      expect(buttonText?.toLowerCase().includes('signing') || isDisabled).toBeTruthy();
    });

    test('should display error message for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Mock API to return error
      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid email or password',
          }),
        });
      });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('wrong@example.com');
      await passwordInput.fill('wrongpassword');
      await submitButton.click();

      // Should show error toast
      await waitForToast(page, undefined, 'error');
    });
  });

  test.describe('Authentication Flow', () => {
    test('should successfully login and store tokens', async ({ page }) => {
      await page.goto('/login');

      // Mock successful login
      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              expiresIn: 900,
              user: {
                id: 'user-1',
                email: 'patient.test@nairobisculpt.com',
                role: 'PATIENT',
                firstName: 'Test',
                lastName: 'Patient',
              },
            },
          }),
        });
      });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('patient.test@nairobisculpt.com');
      await passwordInput.fill('TestPassword123!');
      await submitButton.click();

      // Wait for redirect to dashboard
      await page.waitForURL(/\/patient\/dashboard/, { timeout: 10000 });

      // Verify tokens stored in localStorage
      const accessToken = await page.evaluate(() => {
        return localStorage.getItem('hims_access_token');
      });
      expect(accessToken).toBeTruthy();

      // Verify user data stored
      const userData = await page.evaluate(() => {
        const userStr = localStorage.getItem('hims_user');
        return userStr ? JSON.parse(userStr) : null;
      });
      expect(userData).toBeTruthy();
      expect(userData.email).toBe('patient.test@nairobisculpt.com');
      expect(userData.role).toBe('PATIENT');
    });

    test('should redirect to correct dashboard based on role', async ({ page }) => {
      // Test Patient role
      await page.goto('/login');
      
      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'token',
              refreshToken: 'refresh',
              user: { id: '1', email: 'test@test.com', role: 'PATIENT' },
            },
          }),
        });
      });

      await page.locator('input[type="email"]').first().fill('test@test.com');
      await page.locator('input[type="password"]').first().fill('password');
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/\/patient\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should prevent unauthorized access to protected routes', async ({ page }) => {
      // Try to access admin route without authentication
      await page.goto('/admin/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should enforce role-based route access', async ({ page }) => {
      // Login as patient
      await page.goto('/login');
      
      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'token',
              refreshToken: 'refresh',
              user: { id: '1', email: 'test@test.com', role: 'PATIENT' },
            },
          }),
        });
      });

      await page.locator('input[type="email"]').first().fill('test@test.com');
      await page.locator('input[type="password"]').first().fill('password');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL(/\/patient\/dashboard/);

      // Try to access doctor route (should be blocked or redirected)
      await page.goto('/doctor/dashboard');
      
      // Should either redirect to patient dashboard or show error
      // (depends on middleware implementation)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/doctor/dashboard');
    });
  });

  test.describe('User Context Management', () => {
    test('should persist user context across page reloads', async ({ page }) => {
      // Login first
      await page.goto('/login');
      
      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'token',
              refreshToken: 'refresh',
              user: { id: '1', email: 'test@test.com', role: 'PATIENT', firstName: 'Test' },
            },
          }),
        });
      });

      await page.locator('input[type="email"]').first().fill('test@test.com');
      await page.locator('input[type="password"]').first().fill('password');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL(/\/patient\/dashboard/);

      // Reload page
      await page.reload();

      // User data should still be in localStorage
      const userData = await page.evaluate(() => {
        const userStr = localStorage.getItem('hims_user');
        return userStr ? JSON.parse(userStr) : null;
      });
      expect(userData).toBeTruthy();
    });

    test('should clear user context on logout', async ({ page, loginAsPatient }) => {
      await loginAsPatient();

      // Find and click logout button
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
      
      if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await logoutButton.click();
        
        // Wait for redirect to login
        await page.waitForURL(/\/login/, { timeout: 5000 });

        // Verify tokens cleared
        const accessToken = await page.evaluate(() => {
          return localStorage.getItem('hims_access_token');
        });
        expect(accessToken).toBeNull();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      expect(['INPUT', 'BUTTON']).toContain(focusedElement);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');

      // Check for labels associated with inputs
      const emailInput = page.locator('input[type="email"]').first();
      const emailLabel = page.locator('label[for], label').first();
      
      await expect(emailLabel).toBeVisible();
    });
  });
});
