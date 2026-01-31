/**
 * Authentication Test Fixtures
 * 
 * Provides authentication helpers for E2E tests.
 * Handles login, logout, token management, and role-based access.
 */

import { test as base, expect, type Page } from '@playwright/test';
import type { Role } from '../../../domain/enums/Role';

// Re-export expect for use in test files
export { expect };

/**
 * Test user credentials for each role
 */
export const TEST_USERS = {
  PATIENT: {
    email: 'patient.test@nairobisculpt.com',
    password: 'TestPassword123!',
    role: 'PATIENT' as Role,
  },
  DOCTOR: {
    email: 'ken.aluora@nairobisculpt.com',
    password: 'DoctorPassword123!',
    role: 'DOCTOR' as Role,
  },
  FRONTDESK: {
    email: 'frontdesk.test@nairobisculpt.com',
    password: 'FrontdeskPassword123!',
    role: 'FRONTDESK' as Role,
  },
  NURSE: {
    email: 'nurse.test@nairobisculpt.com',
    password: 'NursePassword123!',
    role: 'NURSE' as Role,
  },
  ADMIN: {
    email: 'admin@nairobisculpt.com',
    password: 'admin123',
    role: 'ADMIN' as Role,
  },
};

/**
 * Extended test context with authentication helpers
 */
type AuthFixtures = {
  authenticatedPage: Page;
  loginAsPatient: () => Promise<Page>;
  loginAsDoctor: () => Promise<Page>;
  loginAsFrontdesk: () => Promise<Page>;
  loginAsNurse: () => Promise<Page>;
  loginAsAdmin: () => Promise<Page>;
  logout: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  /**
   * Default authenticated page (Patient role)
   */
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USERS.PATIENT.email, TEST_USERS.PATIENT.password);
    await use(page);
    await logout(page);
  },

  /**
   * Login as Patient helper
   */
  loginAsPatient: async ({ page }, use) => {
    const loginFn = async () => {
      await login(page, TEST_USERS.PATIENT.email, TEST_USERS.PATIENT.password);
      return page;
    };
    await use(loginFn);
  },

  /**
   * Login as Doctor helper
   */
  loginAsDoctor: async ({ page }, use) => {
    const loginFn = async () => {
      await login(page, TEST_USERS.DOCTOR.email, TEST_USERS.DOCTOR.password);
      return page;
    };
    await use(loginFn);
  },

  /**
   * Login as Frontdesk helper
   */
  loginAsFrontdesk: async ({ page }, use) => {
    const loginFn = async () => {
      await login(page, TEST_USERS.FRONTDESK.email, TEST_USERS.FRONTDESK.password);
      return page;
    };
    await use(loginFn);
  },

  /**
   * Login as Nurse helper
   */
  loginAsNurse: async ({ page }, use) => {
    const loginFn = async () => {
      await login(page, TEST_USERS.NURSE.email, TEST_USERS.NURSE.password);
      return page;
    };
    await use(loginFn);
  },

  /**
   * Login as Admin helper
   */
  loginAsAdmin: async ({ page }, use) => {
    const loginFn = async () => {
      await login(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
      return page;
    };
    await use(loginFn);
  },

  /**
   * Logout helper
   */
  logout: async ({ page }, use) => {
    await use(async () => {
      await logout(page);
    });
  },
});

/**
 * Perform login via UI
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  // Wait for login form
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
  await submitButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/\/patient\/dashboard|\/doctor\/dashboard|\/frontdesk\/dashboard|\/nurse\/dashboard|\/admin\/dashboard/, {
    timeout: 30000,
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Perform logout via UI
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout-button"]').first();

  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login|\/patient\/login/, { timeout: 5000 });
  }

  // Clear any stored tokens
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated (has access token)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  });
  return !!token;
}

/**
 * Navigate to a protected route and verify access
 */
export async function navigateToProtectedRoute(page: Page, route: string): Promise<void> {
  await page.goto(route);

  // If redirected to login, user is not authenticated
  const isLoginPage = page.url().includes('/login');
  if (isLoginPage) {
    throw new Error(`Access denied: User is not authenticated for route ${route}`);
  }

  await page.waitForLoadState('networkidle');
}
