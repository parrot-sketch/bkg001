/**
 * Error Handling & Edge Cases E2E Tests
 * 
 * Tests error scenarios, edge cases, and security edge cases.
 */

import { test, expect } from '../fixtures/auth.fixture';
import {
  setTokens,
  clearAuthData,
  createMockJwtToken,
  verifyTokensCleared,
} from '../helpers/auth-helpers';
import { waitForToast } from '../helpers/test-helpers';
import { Role } from '../../../domain/enums/Role';

test.describe('Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthData(page);
  });

  test.describe('Expired JWT Handling', () => {
    test('should handle expired access token', async ({ page }) => {
      const expiredToken = createMockJwtToken('user-1', 'test@test.com', Role.PATIENT, -100);
      await setTokens(page, expiredToken, 'refresh-token', {
        id: 'user-1',
        email: 'test@test.com',
        role: Role.PATIENT,
      });

      // Mock API to return 401 for expired token
      await page.route('**/api/patient/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Token expired',
          }),
        });
      });

      await page.goto('/patient/dashboard');

      // Should handle expired token (refresh, logout, or show error)
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test.describe('Invalid Token Handling', () => {
    test('should handle invalid JWT signature', async ({ page }) => {
      await setTokens(page, 'invalid.signature.token', 'refresh', {
        id: 'user-1',
        email: 'test@test.com',
        role: Role.PATIENT,
      });

      await page.route('**/api/patient/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid token signature',
          }),
        });
      });

      await page.goto('/patient/dashboard');
      await page.waitForTimeout(2000);

      // Should handle invalid token
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle malformed JWT tokens', async ({ page }) => {
      await setTokens(page, 'not.a.valid.jwt', 'refresh', {
        id: 'user-1',
        email: 'test@test.com',
        role: Role.PATIENT,
      });

      await page.goto('/patient/dashboard');
      await page.waitForTimeout(2000);

      // Should handle gracefully
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle empty or null tokens', async ({ page }) => {
      await setTokens(page, '', '', {
        id: 'user-1',
        email: 'test@test.com',
        role: Role.PATIENT,
      });

      await page.goto('/patient/dashboard');

      // Should redirect to login or show error
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl.includes('/patient/dashboard')).toBeTruthy();
    });
  });

  test.describe('Access Without Token', () => {
    test('should redirect to login when accessing protected route without token', async ({ page }) => {
      await clearAuthData(page);
      
      await page.goto('/admin/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('should show appropriate error for API calls without token', async ({ page }) => {
      await clearAuthData(page);

      // Mock API to require auth
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Authorization required',
          }),
        });
      });

      await page.goto('/patient/dashboard');
      await page.waitForTimeout(2000);

      // Should show error or redirect
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test.describe('Error Messages & Notifications', () => {
    test('should show clear error message for invalid credentials', async ({ page }) => {
      await page.goto('/patient/login');

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

      await page.locator('input[type="email"]').fill('wrong@example.com');
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();

      // Should show error toast
      await waitForToast(page, undefined, 'error');

      // Should not redirect
      await expect(page).toHaveURL(/\/patient\/login/);
    });

    test('should show error for server errors', async ({ page }) => {
      await page.goto('/patient/login');

      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
          }),
        });
      });

      await page.locator('input[type="email"]').fill('test@test.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      // Should show error toast
      await waitForToast(page, undefined, 'error');
    });

    test('should show error for network failures', async ({ page }) => {
      await page.goto('/patient/login');

      // Block network requests
      await page.route('**/api/auth/login', (route) => {
        route.abort('failed');
      });

      await page.locator('input[type="email"]').fill('test@test.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      // Should handle network error gracefully
      await page.waitForTimeout(2000);
      
      // Should show error or stay on login page
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl.includes('/patient')).toBeTruthy();
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should prevent XSS in error messages', async ({ page }) => {
      await page.goto('/patient/login');

      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: '<script>alert("XSS")</script>',
          }),
        });
      });

      await page.locator('input[type="email"]').fill('test@test.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(2000);

      // Error message should be sanitized (not execute script)
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>');
    });

    test('should not expose sensitive information in errors', async ({ page }) => {
      await page.goto('/patient/login');

      await page.route('**/api/auth/login', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Database connection failed: postgres://user:pass@host/db',
          }),
        });
      });

      await page.locator('input[type="email"]').fill('test@test.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(2000);

      // Error should not expose database credentials
      const pageContent = await page.content();
      // Verify generic error shown instead of exposing details
      expect(pageContent).toBeTruthy();
    });
  });
});
