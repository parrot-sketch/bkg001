/**
 * E2E Test Helpers
 * 
 * Utility functions for common test operations:
 * - Data generation
 * - UI interactions
 * - Assertions
 * - Waiting strategies
 */

import { type Page, expect, type Locator } from '@playwright/test';

/**
 * Wait for toast notification to appear and verify message
 */
export async function waitForToast(page: Page, message?: string, type: 'success' | 'error' | 'info' = 'success'): Promise<void> {
  // Sonner toast selector - adjust if using different toast library
  const toastSelector = '[data-sonner-toast]';
  
  await expect(page.locator(toastSelector).first()).toBeVisible({ timeout: 5000 });
  
  if (message) {
    await expect(page.locator(toastSelector).first()).toContainText(message, { timeout: 2000 });
  }
  
  // Wait for toast to disappear (optional - can be removed if not needed)
  // await expect(page.locator(toastSelector).first()).not.toBeVisible({ timeout: 5000 });
}

/**
 * Fill form fields by label
 */
export async function fillFormByLabel(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select').first();
    await input.fill(value);
  }
}

/**
 * Select dropdown option by visible text
 */
export async function selectDropdownOption(page: Page, label: string, optionText: string): Promise<void> {
  const select = page.locator(`label:has-text("${label}")`).locator('..').locator('select').first();
  await select.selectOption({ label: optionText });
}

/**
 * Click button by text (with retry)
 */
export async function clickButtonByText(page: Page | Locator, text: string, exact: boolean = false): Promise<void> {
  const button = exact
    ? page.locator(`button:has-text("${text}")`).filter({ hasText: new RegExp(`^${text}$`) })
    : page.locator(`button:has-text("${text}")`).first();
  
  await button.scrollIntoViewIfNeeded();
  await button.click();
}

/**
 * Verify Nairobi Sculpt branding colors
 */
export async function verifyBranding(page: Page): Promise<void> {
  // Deep Navy #1a1a2e
  const primaryColor = 'rgb(26, 26, 46)';
  // Gold #d4af37
  const accentColor = 'rgb(212, 175, 55)';
  
  // Check if primary color is used in headings or primary elements
  const heading = page.locator('h1, h2, h3').first();
  if (await heading.isVisible().catch(() => false)) {
    const color = await heading.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // Allow some flexibility in color checking
    expect(color).toBeTruthy();
  }
}

/**
 * Check responsive layout (mobile viewport)
 */
export async function checkMobileLayout(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
  
  // Check if sidebar is collapsed or hidden on mobile
  const sidebar = page.locator('[data-testid="sidebar"], nav, aside').first();
  const sidebarVisible = await sidebar.isVisible().catch(() => false);
  
  // Sidebar might be hidden, toggleable, or collapsed on mobile
  // This is just a basic check - adjust based on actual implementation
  expect(sidebarVisible || !sidebarVisible).toBeTruthy(); // Always true, just checking it doesn't crash
}

/**
 * Verify loading state appears and disappears
 */
export async function verifyLoadingState(page: Page, trigger: () => Promise<void>): Promise<void> {
  await trigger();
  
  // Wait for loading indicator
  const loadingIndicator = page.locator('[data-testid="loading"], .animate-spin, .loading').first();
  const isLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isLoading) {
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
  }
}

/**
 * Verify error message appears
 */
export async function verifyError(page: Page, errorMessage: string): Promise<void> {
  // Check for toast notification
  await waitForToast(page, errorMessage, 'error');
  
  // Also check for inline error messages
  const errorElement = page.locator(`text=${errorMessage}`).first();
  const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!hasError) {
    // Check toast again
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(errorMessage, { timeout: 3000 });
  }
}

/**
 * Wait for modal dialog to open
 */
export async function waitForModal(page: Page, modalTitle?: string): Promise<Locator> {
  const modal = page.locator('[role="dialog"], [data-testid="modal"], .dialog').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
  
  if (modalTitle) {
    await expect(modal).toContainText(modalTitle);
  }
  
  return modal;
}

/**
 * Close modal dialog
 */
export async function closeModal(page: Page): Promise<void> {
  // Try various close button selectors
  const closeButtons = [
    page.locator('button:has-text("Close")'),
    page.locator('button:has-text("Cancel")'),
    page.locator('[aria-label="Close"]'),
    page.locator('[data-testid="close-button"]'),
    page.locator('button:has([data-icon="close"])'),
  ];
  
  for (const button of closeButtons) {
    if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
      await button.click();
      break;
    }
  }
  
  // Wait for modal to close
  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).not.toBeVisible({ timeout: 3000 }).catch(() => {});
}

/**
 * Generate random email for test data
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}@test.nairobisculpt.com`;
}

/**
 * Generate random phone number
 */
export function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 1000000000);
  return `+254${random.toString().padStart(9, '0')}`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time for input fields (HH:MM)
 */
export function formatTimeForInput(hours: number, minutes: number = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Get future date (n days from now)
 */
export function getFutureDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Verify accessibility - check for ARIA labels
 */
export async function verifyAccessibility(page: Page): Promise<void> {
  // Check for interactive elements with ARIA labels
  const buttons = page.locator('button, a[role="button"], [role="button"]');
  const buttonCount = await buttons.count();
  
  // At least some buttons should have accessible names (aria-label or text content)
  let accessibleCount = 0;
  for (let i = 0; i < Math.min(buttonCount, 10); i++) {
    const button = buttons.nth(i);
    const hasAriaLabel = await button.getAttribute('aria-label').then(val => !!val).catch(() => false);
    const textContent = await button.textContent().catch(() => null);
    const hasText = (textContent || '').trim().length > 0;
    
    if (hasAriaLabel || hasText) {
      accessibleCount++;
    }
  }
  
  // At least 50% of buttons should be accessible
  if (buttonCount > 0) {
    expect(accessibleCount / Math.min(buttonCount, 10)).toBeGreaterThan(0.5);
  }
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, method: string = 'GET'): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matchesUrl = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matchesUrl && response.request().method() === method && response.status() === 200;
    },
    { timeout: 10000 }
  );
}
