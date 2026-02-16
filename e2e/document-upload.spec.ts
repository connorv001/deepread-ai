import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@deepread.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/library', { timeout: 10000 });
  });

  test('should upload a PDF document', async ({ page }) => {
    // Navigate to library
    await page.goto('/library');

    // Find upload button/input
    const uploadInput = page.locator('input[type="file"]');

    // Create a test PDF file path
    // Note: You'll need to create a sample PDF in e2e/fixtures/
    const testPdfPath = path.join(__dirname, 'fixtures', 'sample.pdf');

    // Upload file
    await uploadInput.setInputFiles(testPdfPath);

    // Wait for upload to complete
    await expect(page.locator('text=/uploaded|success/i')).toBeVisible({
      timeout: 15000,
    });

    // Document should appear in library
    await expect(page.locator('.document-item, [data-testid="document"]')).toBeVisible();
  });

  test('should show upload progress', async ({ page }) => {
    await page.goto('/library');

    const uploadInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, 'fixtures', 'sample.pdf');

    await uploadInput.setInputFiles(testPdfPath);

    // Should show loading state or progress
    await expect(
      page.locator('text=/uploading|progress|loading/i, [role="progressbar"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reject invalid file types', async ({ page }) => {
    await page.goto('/library');

    const uploadInput = page.locator('input[type="file"]');

    // Try to upload a non-PDF/EPUB file
    const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid.txt');

    await uploadInput.setInputFiles(invalidFilePath);

    // Should show error message
    await expect(page.locator('text=/invalid|error|unsupported/i')).toBeVisible({
      timeout: 5000,
    });
  });
});
