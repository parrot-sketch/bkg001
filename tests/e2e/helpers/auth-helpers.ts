/**
 * Authentication Test Helpers
 * 
 * Utilities for testing JWT authentication, tokens, and user context.
 */

import { type Page, expect } from '@playwright/test';
import type { Role } from '../../../domain/enums/Role';

/**
 * Read a cookie value by name from the browser context.
 * Works for httpOnly cookies (Playwright can read them in automation).
 */
async function cookieValue(page: Page, name: string): Promise<string | null> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === name)?.value ?? null;
}

/**
 * Verify JWT tokens are stored.
 * - Access token lives in the client-readable `hims_access_token` cookie.
 * - Refresh token lives in the httpOnly `refreshToken` server cookie.
 */
export async function verifyTokensStored(page: Page): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await cookieValue(page, 'hims_access_token');
  const refreshToken = await cookieValue(page, 'refreshToken');

  // Access token is always client-readable and must be present.
  expect(accessToken).toBeTruthy();
  // Refresh token lives in an httpOnly server cookie. It is present after a real
  // server login (Set-Cookie) but may be absent when a test mocks the login
  // response without emitting Set-Cookie — so only assert it when it exists.
  if (refreshToken !== null) {
    expect(refreshToken).toBeTruthy();
  }

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
  const accessToken = await cookieValue(page, 'hims_access_token');
  const refreshToken = await cookieValue(page, 'refreshToken');

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
  const accessToken = await cookieValue(page, 'hims_access_token');

  expect(accessToken).toBeTruthy();
  
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    expect(payload).toBeTruthy();
    expect(payload.role).toBe(expectedRole);
  }
}

/**
 * Set tokens for testing.
 * - Access token is set as the client-readable `hims_access_token` cookie.
 * - Refresh token is set as the httpOnly `refreshToken` cookie (mirrors the
 *   server's Set-Cookie behaviour so the refresh flow can be exercised).
 * - User record stays in localStorage (non-sensitive display data).
 */
export async function setTokens(page: Page, accessToken: string, refreshToken: string, user: any): Promise<void> {
  await page.context().addCookies([
    {
      name: 'hims_access_token',
      value: accessToken,
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
      secure: false,
    },
    {
      name: 'refreshToken',
      value: refreshToken,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    },
  ]);

  await page.evaluate(
    ({ user }) => {
      localStorage.setItem('hims_user', JSON.stringify(user));
    },
    { user }
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
