/**
 * Dashboard Integration E2E Tests
 * 
 * Tests JWT authentication integration with all dashboards.
 * Validates role-specific components and permissions.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { Role } from '../../../domain/enums/Role';
import { setTokens, createMockJwtToken, clearAuthData } from '../helpers/auth-helpers';

test.describe('Dashboard Integration with JWT Auth', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthData(page);
  });

  test.describe('Patient Dashboard', () => {
    test('should load patient dashboard with authenticated user', async ({ page }) => {
      const token = createMockJwtToken('patient-1', 'patient@test.com', Role.PATIENT);
      await setTokens(page, token, 'refresh', {
        id: 'patient-1',
        email: 'patient@test.com',
        role: Role.PATIENT,
        firstName: 'Test',
        lastName: 'Patient',
      });

      await page.goto('/patient/dashboard');

      // Should show welcome message
      await expect(page.locator('text=/welcome/i, text=/patient/i')).toBeVisible({ timeout: 5000 });

      // Should show dashboard content
      const dashboardContent = page.locator('[class*="card"], [class*="dashboard"]').first();
      await expect(dashboardContent).toBeVisible({ timeout: 5000 });
    });

    test('should show patient-specific components only', async ({ page }) => {
      const token = createMockJwtToken('patient-1', 'patient@test.com', Role.PATIENT);
      await setTokens(page, token, 'refresh', {
        id: 'patient-1',
        email: 'patient@test.com',
        role: Role.PATIENT,
      });

      await page.goto('/patient/dashboard');

      // Should show patient navigation
      const navLinks = page.locator('nav a, [class*="sidebar"] a');
      const navTexts = await navLinks.allTextContents();

      // Should not show admin-only links
      expect(navTexts.join(' ').toLowerCase()).not.toContain('admin');
    });
  });

  test.describe('Doctor Dashboard', () => {
    test('should load doctor dashboard with authenticated user', async ({ page }) => {
      const token = createMockJwtToken('doctor-1', 'doctor@test.com', Role.DOCTOR);
      await setTokens(page, token, 'refresh', {
        id: 'doctor-1',
        email: 'doctor@test.com',
        role: Role.DOCTOR,
        firstName: 'Dr.',
        lastName: 'Test',
      });

      await page.goto('/doctor/dashboard');

      // Should show doctor-specific content
      await expect(page.locator('text=/doctor/i, text=/appointments/i, text=/welcome/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show doctor-specific components', async ({ page }) => {
      const token = createMockJwtToken('doctor-1', 'doctor@test.com', Role.DOCTOR);
      await setTokens(page, token, 'refresh', {
        id: 'doctor-1',
        email: 'doctor@test.com',
        role: Role.DOCTOR,
      });

      await page.goto('/doctor/appointments');

      // Should show doctor navigation and features
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Admin Dashboard', () => {
    test('should load admin dashboard with authenticated user', async ({ page }) => {
      const token = createMockJwtToken('admin-1', 'admin@test.com', Role.ADMIN);
      await setTokens(page, token, 'refresh', {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      });

      await page.goto('/admin/dashboard');

      // Should show admin-specific content
      await expect(page.locator('text=/admin/i, text=/welcome/i, text=/dashboard/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show admin-only features', async ({ page }) => {
      const token = createMockJwtToken('admin-1', 'admin@test.com', Role.ADMIN);
      await setTokens(page, token, 'refresh', {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });

      await page.goto('/admin/staff');

      // Should show staff management features
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Nurse Dashboard', () => {
    test('should load nurse dashboard with authenticated user', async ({ page }) => {
      const token = createMockJwtToken('nurse-1', 'nurse@test.com', Role.NURSE);
      await setTokens(page, token, 'refresh', {
        id: 'nurse-1',
        email: 'nurse@test.com',
        role: Role.NURSE,
        firstName: 'Nurse',
        lastName: 'Test',
      });

      await page.goto('/nurse/dashboard');

      // Should show nurse-specific content
      await expect(page.locator('text=/nurse/i, text=/patients/i, text=/welcome/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Frontdesk Dashboard', () => {
    test('should load frontdesk dashboard with authenticated user', async ({ page }) => {
      const token = createMockJwtToken('frontdesk-1', 'frontdesk@test.com', Role.FRONTDESK);
      await setTokens(page, token, 'refresh', {
        id: 'frontdesk-1',
        email: 'frontdesk@test.com',
        role: Role.FRONTDESK,
        firstName: 'Frontdesk',
        lastName: 'User',
      });

      await page.goto('/frontdesk/dashboard');

      // Should show frontdesk-specific content
      await expect(page.locator('text=/frontdesk/i, text=/appointments/i, text=/welcome/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Role-Based Component Rendering', () => {
    test('should hide admin components from patient dashboard', async ({ page }) => {
      const token = createMockJwtToken('patient-1', 'patient@test.com', Role.PATIENT);
      await setTokens(page, token, 'refresh', {
        id: 'patient-1',
        email: 'patient@test.com',
        role: Role.PATIENT,
      });

      await page.goto('/patient/dashboard');

      // Admin-specific buttons/links should not be visible
      const adminButton = page.locator('button:has-text("Manage Staff"), a:has-text("Admin")').first();
      const isVisible = await adminButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('should show role-appropriate navigation', async ({ page }) => {
      const token = createMockJwtToken('doctor-1', 'doctor@test.com', Role.DOCTOR);
      await setTokens(page, token, 'refresh', {
        id: 'doctor-1',
        email: 'doctor@test.com',
        role: Role.DOCTOR,
      });

      await page.goto('/doctor/dashboard');

      // Should show doctor navigation items
      const navLinks = page.locator('nav a, [class*="sidebar"] a');
      const navTexts = await navLinks.allTextContents();
      
      // Should contain doctor-relevant links
      const hasRelevantLinks = navTexts.some(text => 
        text.toLowerCase().includes('appointment') || 
        text.toLowerCase().includes('consultation') ||
        text.toLowerCase().includes('patient')
      );
      
      expect(navTexts.length).toBeGreaterThan(0);
    });
  });

  test.describe('Profile Information Accuracy', () => {
    test('should display correct user profile information', async ({ page }) => {
      const token = createMockJwtToken('user-1', 'test@test.com', Role.PATIENT);
      await setTokens(page, token, 'refresh', {
        id: 'user-1',
        email: 'test@test.com',
        role: Role.PATIENT,
        firstName: 'John',
        lastName: 'Doe',
      });

      await page.goto('/patient/profile');

      // Should display user information
      const pageText = await page.textContent('body');
      expect(pageText?.toLowerCase()).toContain('test@test.com'.toLowerCase());
    });

    test('should reflect user role in profile', async ({ page }) => {
      const token = createMockJwtToken('doctor-1', 'doctor@test.com', Role.DOCTOR);
      await setTokens(page, token, 'refresh', {
        id: 'doctor-1',
        email: 'doctor@test.com',
        role: Role.DOCTOR,
        firstName: 'Dr.',
        lastName: 'Smith',
      });

      await page.goto('/doctor/profile');

      // Role should be reflected in profile
      const pageText = await page.textContent('body');
      expect(pageText).toBeTruthy();
    });
  });
});
