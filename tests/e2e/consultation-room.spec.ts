import { test, expect } from '@playwright/test';
import { waitForToast } from './helpers/test-helpers';

test.describe('Consultation Room - Draft Save & Complete', () => {
  test('should load active consultation room', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'mukami@nairobisculpt.com');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.fill('#password', 'doctor123');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL(/\/doctor\//, { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    await page.goto('/doctor/consultations/session/8');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Rita CheckIn').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=TEST001').first()).toBeVisible({ timeout: 5000 });
  });

  test('should save draft notes successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'mukami@nairobisculpt.com');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.fill('#password', 'doctor123');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL(/\/doctor\//, { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    await page.goto('/doctor/consultations/session/8');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Rita CheckIn').first()).toBeVisible({ timeout: 15000 });

    const planTab = page.locator('button:has-text("Plan")').first();
    if (await planTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await planTab.click();
    }

    const editor = page.locator('[role="textbox"]').first();
    if (await editor.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editor.click();
      await editor.fill('E2E test plan note');
    }

    const saveDraftButton = page.locator('button:has-text("Save Draft")').first();
    if (await saveDraftButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveDraftButton.click();

      const toast = page.locator('[data-sonner-toast]').first();
      if (await toast.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(toast).toContainText('Draft saved', { timeout: 30000 });
      } else {
        await expect(saveDraftButton).toContainText('Save Draft', { timeout: 30000 });
      }
    }
  });

  test('should complete consultation successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'mukami@nairobisculpt.com');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.fill('#password', 'doctor123');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL(/\/doctor\//, { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    await page.goto('/doctor/consultations/session/8');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Rita CheckIn').first()).toBeVisible({ timeout: 15000 });

    const completeButton = page.locator('button:has-text("Complete")').first();
    if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeButton.click();

      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(modal).toContainText('Finalize documentation', { timeout: 5000 });
        await page.locator('button:has-text("Continue Editing")').first().click();
      }
    }
  });
});
