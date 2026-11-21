import { test, expect, Page } from '@playwright/test';

async function dismissCookieIfVisible(page: Page) {
  const cookieBtn = page.locator(
    'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
  );
  if (await cookieBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieBtn.first().click().catch(() => {});
  }
}

async function assertHealthyWorkspace(page: Page, pageErrors: string[], contextLabel: string) {
  expect(
    pageErrors,
    `Unexpected runtime pageerror during ${contextLabel}: ${pageErrors.join(' | ')}`
  ).toHaveLength(0);

  const crashHeading = page.locator('text=Something encountered an issue');
  await expect(
    crashHeading,
    `Self-Healing ErrorBoundary triggered during ${contextLabel}`
  ).toHaveCount(0);

  await expect(page.locator('#main-content')).toBeVisible();
}

test.describe('Sidebar Navigation & Mode Smoke Suite (Modern + Classic, Simple + Pro)', () => {
  test('Loads app, clicks "Try with sample data", and visits every sidebar item in Classic and Modern (Simple & Pro nav) with 0 pageerrors', async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    // 1. Fresh load -> click "Try with sample data"
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });
    await dismissCookieIfVisible(page);

    const trySampleBtn = page
      .locator('button:has-text("Try with sample data"), button:has-text("Explore as Guest")')
      .first();
    await expect(trySampleBtn).toBeVisible({ timeout: 10000 });
    await trySampleBtn.click();

    const launchBtn = page.locator('button:has-text("Launch Enterprise BI")');
    if (await launchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await launchBtn.click();
    }

    await assertHealthyWorkspace(page, pageErrors, 'initial Try with sample data launch');

    // Helper to click every navigation item inside the active sidebar
    const visitAllSidebarItems = async (sidebarSelector: string, modeLabel: string) => {
      const sidebar = page.locator(sidebarSelector).first();
      await expect(sidebar).toBeVisible();

      // Test Simple (8) mode first
      const simpleToggle = sidebar.getByTestId('nav-mode-simple');
      await expect(simpleToggle).toBeVisible();
      await simpleToggle.click();
      await assertHealthyWorkspace(page, pageErrors, `${modeLabel} -> switch to Simple nav`);

      const simpleButtons = sidebar.locator('[data-testid^="sidebar-nav-item-"]');
      const simpleCount = await simpleButtons.count();
      expect(simpleCount).toBe(8);

      for (let i = 0; i < simpleCount; i++) {
        const btn = simpleButtons.nth(i);
        const testId = (await btn.getAttribute('data-testid')) || `simple-${i}`;
        await btn.click();
        await assertHealthyWorkspace(page, pageErrors, `${modeLabel} [Simple] -> ${testId}`);
      }

      // Switch to Pro (All) mode and visit every item
      const proToggle = sidebar.getByTestId('nav-mode-pro');
      await expect(proToggle).toBeVisible();
      await proToggle.click();
      await assertHealthyWorkspace(page, pageErrors, `${modeLabel} -> switch to Pro nav`);

      const proButtons = sidebar.locator('[data-testid^="sidebar-nav-item-"]');
      const proCount = await proButtons.count();
      expect(proCount).toBeGreaterThanOrEqual(20);

      for (let i = 0; i < proCount; i++) {
        const btn = proButtons.nth(i);
        const testId = (await btn.getAttribute('data-testid')) || `pro-${i}`;
        await btn.click();
        await assertHealthyWorkspace(page, pageErrors, `${modeLabel} [Pro] -> ${testId}`);
      }
    };

    // 2. Test Classic Sidebar (groupedSidebar: false, uiMode: 'classic')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.setItem('dataanalytix_nav_mode', 'simple');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true, groupedSidebar: false })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await assertHealthyWorkspace(page, pageErrors, 'Classic Sidebar reload');
    await visitAllSidebarItems('aside#app-sidebar-drawer', 'Classic Sidebar');

    // 3. Test Classic GroupedSidebar (groupedSidebar: true, uiMode: 'classic')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.setItem('dataanalytix_nav_mode', 'simple');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true, groupedSidebar: true })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await assertHealthyWorkspace(page, pageErrors, 'GroupedSidebar reload');
    await visitAllSidebarItems('aside#app-sidebar-drawer', 'GroupedSidebar');

    // 4. Test Modern Sidebar (uiMode: 'modern')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'modern');
      localStorage.setItem('dataanalytix_nav_mode', 'simple');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await assertHealthyWorkspace(page, pageErrors, 'ModernSidebar reload');
    await visitAllSidebarItems(
      'aside[aria-label="Workflow Navigation Sidebar"]',
      'ModernSidebar'
    );
  });
});
