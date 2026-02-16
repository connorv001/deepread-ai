import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login and open a document
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@deepread.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/library', { timeout: 10000 });

    // Open first document
    await page.locator('.document-item, [data-testid="document"]').first().click();
    await expect(page).toHaveURL(/\/reader\//, { timeout: 10000 });
  });

  test('should generate AI summary', async ({ page }) => {
    // Wait for document to load
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    // Find and click summarize button
    const summarizeButton = page.locator(
      'button:has-text("Summarize"), button:has-text("Summary")'
    );

    if (await summarizeButton.isVisible()) {
      await summarizeButton.click();

      // Should show AI response
      await expect(page.locator('text=/summary|overview/i')).toBeVisible({
        timeout: 30000,
      });
    }
  });

  test('should support AI chat', async ({ page }) => {
    // Wait for document to load
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    // Find chat input
    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]');

    if (await chatInput.isVisible()) {
      await chatInput.fill('What is this document about?');

      // Send message
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")');
      await sendButton.click();

      // Should show AI response
      await expect(page.locator('.message, .chat-message')).toBeVisible({
        timeout: 30000,
      });
    }
  });

  test('should stream AI responses', async ({ page }) => {
    // Wait for document to load
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]');

    if (await chatInput.isVisible()) {
      await chatInput.fill('Explain the main concept');

      const sendButton = page.locator('button[type="submit"], button:has-text("Send")');
      await sendButton.click();

      // Should show streaming indicator or partial response
      await expect(
        page.locator('text=/typing|generating|loading/i, [class*="animate"]')
      ).toBeVisible({ timeout: 5000 });

      // Eventually complete
      await expect(page.locator('.message, .chat-message')).toBeVisible({
        timeout: 30000,
      });
    }
  });
});
