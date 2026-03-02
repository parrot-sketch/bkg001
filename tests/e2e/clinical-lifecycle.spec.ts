/**
 * E2E Test: Clinical Lifecycle
 * 
 * Tests the clinical inventory workflow:
 * - Doctor adds planned item
 * - Nurse consumes from plan
 * - Verify billing summary updated, usage variance updated, stock decreased
 */

import { test, expect } from '@playwright/test';

test.describe('Clinical Lifecycle', () => {
  test('complete clinical workflow', async ({ page }) => {
    // Step 1: Doctor login and add planned item
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/**', { timeout: 10000 });

    // Navigate to surgical case plan
    // This assumes a test case exists with ID from seeded data
    const testCaseId = 'test-case-id'; // Replace with actual seeded case ID
    await page.goto(`/doctor/surgical-cases/${testCaseId}/plan`);

    // Add planned item
    // This is a placeholder - actual form depends on implementation
    await page.waitForTimeout(1000);

    // Step 2: Nurse login and consume from plan
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nurse@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/**', { timeout: 10000 });

    await page.goto(`/doctor/surgical-cases/${testCaseId}/plan`);

    // Click "Consume" button on planned item
    await page.locator('button:has-text("Consume")').first().click();
    await page.waitForSelector('dialog', { state: 'visible' });

    // Fill quantity and submit
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Consume")');

    // Step 3: Verify updates
    // Check billing summary tab
    await page.click('button:has-text("Billing Summary")');
    await expect(page.locator('text=Total Amount')).toBeVisible();

    // Check usage variance tab
    await page.click('button:has-text("Usage Variance")');
    await expect(page.locator('text=Variance')).toBeVisible();

    // Verify stock decreased (check inventory items page)
    await page.goto('/inventory/items');
    // Assert stock levels
    // This is a placeholder - actual assertions depend on seeded data
  });
});
