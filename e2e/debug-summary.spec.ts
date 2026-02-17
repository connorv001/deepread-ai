import { test, expect } from '@playwright/test';

test.describe('Debug Page-Specific Summary', () => {
  test('debug summary on page 22', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('summarize')) {
        console.log(`[NETWORK] ${request.method()} ${request.url()}`);
        console.log(`[NETWORK] Post data:`, request.postData());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('summarize')) {
        console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
        try {
          const body = await response.json();
          console.log(`[NETWORK RESPONSE] Body:`, JSON.stringify(body, null, 2).substring(0, 500));
        } catch (e) {
          console.log(`[NETWORK RESPONSE] Body: (not JSON)`);
        }
      }
    });

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'shubhamgv@gmail.com');
    await page.fill('input[type="password"]', 'DeepRead2025!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/library', { timeout: 10000 });

    // Open the Rishi Intelligence document
    await page.goto('/reader/cmlosxd450003wmvz9vvvh028');
    
    // Wait for PDF to load
    await expect(page.locator('.react-pdf__Page, canvas')).toBeVisible({
      timeout: 15000,
    });

    // Navigate to page 22 (if possible)
    const pageInput = page.locator('input[type="number"]').first();
    if (await pageInput.isVisible()) {
      await pageInput.fill('22');
      await pageInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Click on Summary tab/button
    const summaryTab = page.locator('button:has-text("Summary"), [role="tab"]:has-text("Summary")').first();
    await summaryTab.click();
    await page.waitForTimeout(1000);

    // Click Generate Summary
    const generateButton = page.locator('button:has-text("Generate Summary")');
    await expect(generateButton).toBeVisible();
    
    console.log('[TEST] Clicking Generate Summary button...');
    await generateButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Check what appeared
    const summaryContent = await page.locator('.whitespace-pre-wrap').textContent().catch(() => '');
    console.log(`[TEST] Summary content: ${summaryContent.substring(0, 200)}`);

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/summary-debug.png', fullPage: true });
    console.log('[TEST] Screenshot saved to /tmp/summary-debug.png');
  });
});
