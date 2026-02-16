import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to library after successful registration
    await expect(page).toHaveURL('/library', { timeout: 10000 });

    // Should show welcome or library content
    await expect(page.locator('body')).toContainText(/library|documents/i);
  });

  test('should login with existing user', async ({ page }) => {
    await page.goto('/login');

    // Use test credentials (you may need to seed a test user)
    await page.fill('input[type="email"]', 'test@deepread.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to library
    await expect(page).toHaveURL('/library', { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('body')).toContainText(/invalid|error|failed/i, {
      timeout: 5000,
    });

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@deepread.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/library', { timeout: 10000 });

    // Find and click logout button
    await page.click('button:has-text("Logout"), a:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
