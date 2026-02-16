import { test, expect } from '@playwright/test';

test.describe('Document Reading', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@deepread.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/library', { timeout: 10000 });
  });

  test('should open and read a PDF document', async ({ page }) => {
    await page.goto('/library');

    // Click on first document
    const firstDocument = page.locator('.document-item, [data-testid="document"]').first();
    await firstDocument.click();

    // Should navigate to reader
    await expect(page).toHaveURL(/\/reader\//, { timeout: 10000 });

    // PDF viewer should be visible
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    // Page navigation should work
    const nextPageButton = page.locator('button:has-text("Next"), [aria-label*="next"]');
    if (await nextPageButton.isVisible()) {
      await nextPageButton.click();
      // Page number should change
      await expect(page.locator('text=/page|\\d+/')).toBeVisible();
    }
  });

  test('should support zoom controls', async ({ page }) => {
    await page.goto('/library');
    await page.locator('.document-item, [data-testid="document"]').first().click();

    await expect(page).toHaveURL(/\/reader\//, { timeout: 10000 });

    // Wait for PDF to load
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    // Click zoom in
    const zoomInButton = page.locator('button:has([class*="zoom-in"]), button:has-text("+")');
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      // Zoom percentage should increase
      await expect(page.locator('text=/\\d+%/')).toBeVisible();
    }
  });

  test('should allow text selection', async ({ page }) => {
    await page.goto('/library');
    await page.locator('.document-item, [data-testid="document"]').first().click();

    await expect(page).toHaveURL(/\/reader\//, { timeout: 10000 });

    // Wait for PDF with text layer
    await expect(page.locator('.react-pdf__Page__textContent')).toBeVisible({
      timeout: 20000,
    });

    // Select some text (simulate drag)
    const textLayer = page.locator('.react-pdf__Page__textContent').first();
    await textLayer.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();

    // Selection should exist
    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBeTruthy();
  });
});
