import { test, expect } from '@playwright/test';

const TEST_USER = { email: 'darsh@knowai.com', password: 'admin123' };
const INVALID_USER = { email: 'nonexistent@knowai.com', password: 'wrongpassword' };

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('knowai-user');
      localStorage.removeItem('knowai-authenticated');
    });
    await page.reload();
  });

  test('shows login page with sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (or onboarding if not complete)
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', INVALID_USER.email);
    await page.fill('input[type="password"]', INVALID_USER.password);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
    // Should stay on login page
    expect(page.url()).toContain('/login');
  });

  test('login with empty fields does not submit', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Should stay on login page (HTML5 validation prevents submission)
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
