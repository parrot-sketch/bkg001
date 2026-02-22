/**
 * E2E Tests: Frontdesk Theater Scheduling
 *
 * End-to-end tests for the frontdesk theater scheduling workflow.
 */

import { test, expect } from '@playwright/test';

test.describe('Frontdesk Theater Scheduling', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto('/login');
        
        // Login as frontdesk user
        // Note: Adjust credentials based on your test setup
        await page.fill('input[name="email"]', 'frontdesk@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for navigation to dashboard
        await page.waitForURL('/frontdesk/dashboard');
    });

    test('should display theater scheduling tile when cases are ready', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('/frontdesk/dashboard');
        
        // Check if theater scheduling tile is visible
        const theaterTile = page.locator('text=Theater Scheduling');
        await expect(theaterTile).toBeVisible();
        
        // Check if count is displayed
        const count = page.locator('text=/\\d+ cases? ready/');
        await expect(count).toBeVisible();
    });

    test('should navigate to theater scheduling page', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('/frontdesk/dashboard');
        
        // Click on theater scheduling tile
        await page.click('text=Theater Scheduling');
        
        // Verify navigation to scheduling page
        await expect(page).toHaveURL(/\/frontdesk\/theater-scheduling/);
        
        // Verify page title
        await expect(page.locator('h1')).toContainText('Theater Scheduling');
    });

    test('should display cases ready for booking', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        
        // Wait for cases to load
        await page.waitForSelector('[data-testid="case-card"]', { timeout: 5000 }).catch(() => {
            // If no cases, check for empty state
            const emptyState = page.locator('text=No cases ready');
            expect(emptyState).toBeVisible();
        });
    });

    test('should filter cases by surgeon', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Select surgeon filter
        const surgeonFilter = page.locator('select').first();
        await surgeonFilter.selectOption({ index: 1 }); // Select first surgeon (skip "All")
        
        // Verify filter is applied
        await expect(surgeonFilter).not.toHaveValue('all');
    });

    test('should filter cases by urgency', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Select urgency filter
        const urgencyFilters = page.locator('select');
        const urgencyFilter = urgencyFilters.nth(1); // Second select is urgency
        await urgencyFilter.selectOption('EMERGENCY');
        
        // Verify filter is applied
        await expect(urgencyFilter).toHaveValue('EMERGENCY');
    });

    test('should search cases by patient name', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Enter search query
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill('Test Patient');
        
        // Verify search is applied
        await expect(searchInput).toHaveValue('Test Patient');
    });

    test('should navigate to booking page', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        
        // Wait for cases to load
        await page.waitForLoadState('networkidle');
        
        // Click "Book Theater" button on first case
        const bookButton = page.locator('button:has-text("Book Theater")').first();
        
        // Only proceed if button exists
        if (await bookButton.count() > 0) {
            await bookButton.click();
            
            // Verify navigation to booking page
            await expect(page).toHaveURL(/\/frontdesk\/theater-scheduling\/.*\/book/);
            
            // Verify booking page elements
            await expect(page.locator('h1')).toContainText('Book Theater');
            await expect(page.locator('text=Case Information')).toBeVisible();
        }
    });

    test('should display calendar on booking page', async ({ page }) => {
        // Navigate directly to booking page (assuming a test case ID)
        // In real scenario, this would come from the queue
        await page.goto('/frontdesk/theater-scheduling');
        await page.waitForLoadState('networkidle');
        
        // Try to navigate to booking page
        const bookButton = page.locator('button:has-text("Book Theater")').first();
        
        if (await bookButton.count() > 0) {
            await bookButton.click();
            await page.waitForURL(/\/book/);
            
            // Verify calendar is visible
            const calendar = page.locator('[role="grid"]').or(page.locator('.rdp'));
            await expect(calendar).toBeVisible({ timeout: 5000 });
        }
    });

    test('should select theater and time slot', async ({ page }) => {
        // Navigate to booking page
        await page.goto('/frontdesk/theater-scheduling');
        await page.waitForLoadState('networkidle');
        
        const bookButton = page.locator('button:has-text("Book Theater")').first();
        
        if (await bookButton.count() > 0) {
            await bookButton.click();
            await page.waitForURL(/\/book/);
            
            // Select theater
            const theaterSelect = page.locator('select').first();
            if (await theaterSelect.count() > 0) {
                await theaterSelect.selectOption({ index: 1 });
                
                // Wait for time slots to load
                await page.waitForTimeout(1000);
                
                // Click on a time slot
                const timeSlot = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
                if (await timeSlot.count() > 0) {
                    await timeSlot.click();
                    
                    // Verify slot is selected
                    await expect(timeSlot).toHaveClass(/bg-blue-600/);
                }
            }
        }
    });

    test('should clear filters', async ({ page }) => {
        // Navigate to scheduling page
        await page.goto('/frontdesk/theater-scheduling');
        await page.waitForLoadState('networkidle');
        
        // Apply filters
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill('Test');
        
        const urgencyFilter = page.locator('select').nth(1);
        await urgencyFilter.selectOption('EMERGENCY');
        
        // Click clear all
        const clearButton = page.locator('button:has-text("Clear all")');
        if (await clearButton.count() > 0) {
            await clearButton.click();
            
            // Verify filters are cleared
            await expect(searchInput).toHaveValue('');
            await expect(urgencyFilter).toHaveValue('all');
        }
    });
});
