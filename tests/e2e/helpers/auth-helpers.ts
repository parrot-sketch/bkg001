/**
 * Authentication Test Helpers
 * 
 * Utilities for testing JWT authentication, tokens, and user context.
 */

import { type Page, expect } from '@playwright/test';
import type { Role } from '../../../domain/enums/Role';

/**
 * Verify JWT tokens are stored in localStorage
 */
export async function verifyTokensStored(page: Page): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('hims_access_token');
  });
  
  const refreshToken = await page.evaluate(() => {
    return localStorage.getItem('hims_refresh_token');
  });

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();

  return { accessToken, refreshToken };
}

/**
 * Verify user data is stored correctly
 */
export async function verifyUserDataStored(page: Page, expectedRole: string, expectedEmail?: string): Promise<void> {
  const userData = await page.evaluate(() => {
    const userStr = localStorage.getItem('hims_user');
    return userStr ? JSON.parse(userStr) : null;
  });

  expect(userData).toBeTruthy();
  expect(userData.role).toBe(expectedRole);
  
  if (expectedEmail) {
    expect(userData.email).toBe(expectedEmail);
  }
}

/**
 * Verify tokens are cleared
 */
export async function verifyTokensCleared(page: Page): Promise<void> {
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('hims_access_token');
  });
  
  const refreshToken = await page.evaluate(() => {
    return localStorage.getItem('hims_refresh_token');
  });

  const userData = await page.evaluate(() => {
    return localStorage.getItem('hims_user');
  });

  expect(accessToken).toBeNull();
  expect(refreshToken).toBeNull();
  expect(userData).toBeNull();
}

/**
 * Extract JWT token payload (decoded)
 */
export function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Verify JWT token contains expected role
 */
export async function verifyTokenRole(page: Page, expectedRole: string): Promise<void> {
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('hims_access_token');
  });

  expect(accessToken).toBeTruthy();
  
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    expect(payload).toBeTruthy();
    expect(payload.role).toBe(expectedRole);
  }
}

/**
 * Set tokens in localStorage (for testing)
 */
export async function setTokens(page: Page, accessToken: string, refreshToken: string, user: any): Promise<void> {
  await page.evaluate(
    ({ accessToken, refreshToken, user }) => {
      localStorage.setItem('hims_access_token', accessToken);
      localStorage.setItem('hims_refresh_token', refreshToken);
      localStorage.setItem('hims_user', JSON.stringify(user));
    },
    { accessToken, refreshToken, user }
  );
}

/**
 * Clear all authentication data
 */
export async function clearAuthData(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('hims_access_token');
    localStorage.removeItem('hims_refresh_token');
    localStorage.removeItem('hims_user');
    sessionStorage.clear();
  });
  
  await page.context().clearCookies();
}

/**
 * Mock JWT token for testing
 */
export function createMockJwtToken(userId: string, email: string, role: string, expiresIn: number = 900): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    })
  );
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify API request includes Authorization header
 */
export async function verifyApiAuthHeader(page: Page, apiUrl: string): Promise<void> {
  let authHeaderFound = false;

  page.on('request', (request) => {
    if (request.url().includes(apiUrl)) {
      const authHeader = request.headers()['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authHeaderFound = true;
      }
    }
  });

  // Wait a bit for request to fire
  await page.waitForTimeout(1000);
  
  expect(authHeaderFound).toBeTruthy();
}

/**
 * Wait for redirect to role-specific dashboard
 */
export async function waitForDashboardRedirect(page: Page, role: Role): Promise<void> {
  const rolePaths: Record<string, string> = {
    ADMIN: '/admin/dashboard',
    DOCTOR: '/doctor/dashboard',
    NURSE: '/nurse/dashboard',
    FRONTDESK: '/frontdesk/dashboard',
    PATIENT: '/patient/dashboard',
  };

  const expectedPath = rolePaths[role] || '/patient/dashboard';
  await page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
  expect(page.url()).toContain(expectedPath);
}
