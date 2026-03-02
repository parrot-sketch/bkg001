/**
 * E2E Test: Idempotency Replay Protection
 * 
 * Tests that submitting the same usage twice:
 * - Only creates one InventoryUsage record
 * - UI shows replay indicator
 */

import { test, expect } from '@playwright/test';

test.describe('Idempotency Replay Protection', () => {
  test('prevents duplicate usage on resubmission', async ({ page }) => {
    // Login as nurse
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nurse@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/**', { timeout: 10000 });

    const testCaseId = 'test-case-id'; // Replace with actual seeded case ID
    await page.goto(`/doctor/surgical-cases/${testCaseId}/plan`);

    // First consumption
    await page.locator('button:has-text("Consume")').first().click();
    await page.waitForSelector('dialog', { state: 'visible' });
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Consume")');
    await page.waitForTimeout(2000);

    // Second consumption (same item, same quantity)
    await page.locator('button:has-text("Consume")').first().click();
    await page.waitForSelector('dialog', { state: 'visible' });
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Consume")');
    await page.waitForTimeout(2000);

    // Verify replay indicator appears
    await expect(page.locator('text=Already recorded')).toBeVisible({ timeout: 5000 });

    // Verify only one usage record exists (check API or UI)
    // This is a placeholder - actual verification depends on implementation
  });
});
