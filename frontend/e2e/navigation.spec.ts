import { test, expect } from '@playwright/test';

const TEST_USER = { email: 'darsh@knowai.biz', password: 'admin123' };

test.describe('Navigation & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('knowai-user');
      localStorage.removeItem('knowai-authenticated');
    });
    await page.reload();
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    // Dismiss welcome tour if present
    const skipTour = page.locator('text=Skip tour');
    if (await skipTour.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipTour.click();
    }
  });

  test('dashboard loads with key widgets', async ({ page }) => {
    // Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard');
    }
    await page.waitForLoadState('networkidle');

    // Dashboard should have content
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });

  test('sidebar navigation works', async ({ page }) => {
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard');
    }
    await page.waitForLoadState('networkidle');

    // Check that sidebar links exist (CEO should see all)
    const sidebarLinks = page.locator('nav a, aside a, [class*="sidebar"] a');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(3);
  });

  test('can navigate to tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/tasks');
    // Page should render without error
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('can navigate to projects page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/projects');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('can navigate to team page', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/team');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('can navigate to expenses page', async ({ page }) => {
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/expenses');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('can navigate to payroll page', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/payroll');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/settings');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
