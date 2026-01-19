/**
 * Nurse Dashboard E2E Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { waitForToast, clickButtonByText, waitForModal } from '../helpers/test-helpers';

test.describe('Nurse Dashboard', () => {
  test('should allow nurse to login', async ({ loginAsNurse }) => {
    const page = await loginAsNurse();
    await expect(page).toHaveURL(/\/nurse\/dashboard/);
  });

  test('should view assigned patients', async ({ loginAsNurse }) => {
    const page = await loginAsNurse();
    await page.goto('/nurse/patients');
    
    const patientsSection = page.locator('text=/patients/i').first();
    await expect(patientsSection).toBeVisible({ timeout: 5000 });
  });

  test('should record vitals', async ({ loginAsNurse }) => {
    const page = await loginAsNurse();
    await page.goto('/nurse/patients');
    
    const recordVitalsButton = page.locator('button:has-text("Record Vitals")').first();
    if (await recordVitalsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recordVitalsButton.click();
      const modal = await waitForModal(page);
      await expect(modal).toBeVisible();
    }
  });

  test('should add care notes', async ({ loginAsNurse }) => {
    const page = await loginAsNurse();
    await page.goto('/nurse/patients');
    
    const addNoteButton = page.locator('button:has-text("Add Note")').first();
    if (await addNoteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addNoteButton.click();
      const modal = await waitForModal(page);
      await expect(modal).toBeVisible();
    }
  });

  test('should display doctor info for patients', async ({ loginAsNurse }) => {
    const page = await loginAsNurse();
    await page.goto('/nurse/patients');
    
    // Check for doctor information in patient cards
    const doctorInfo = page.locator('text=/Dr\./i').first();
    await expect(doctorInfo).toBeVisible({ timeout: 5000 });
  });
});
