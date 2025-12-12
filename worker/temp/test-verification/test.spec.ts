import { test, expect } from '@playwright/test';

test('Verification test for Google homepage', async ({ page }) => {
  // Step 1: Navigate to Google
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
  
  // Step 2: Verify page has a title containing Google
  await expect(page).toHaveTitle(/Google/);
  
  // Step 3: Check that search input is visible
  const searchInput = page.locator('input[name="q"], textarea[name="q"]').first();
  await expect(searchInput).toBeVisible();
  
  // Step 4: Type a search query
  await searchInput.fill('Playwright testing');
  
  // Step 5: Verify input has the value
  await expect(searchInput).toHaveValue('Playwright testing');
  
  console.log('✅ Google homepage test passed!');
});

test('Verification test for GitHub homepage', async ({ page }) => {
  // Step 1: Navigate to GitHub
  await page.goto('https://github.com', { waitUntil: 'domcontentloaded' });
  
  // Step 2: Verify page has GitHub in title
  await expect(page).toHaveTitle(/GitHub/);
  
  // Step 3: Check body is visible
  await expect(page.locator('body')).toBeVisible();
  
  console.log('✅ GitHub homepage test passed!');
});
