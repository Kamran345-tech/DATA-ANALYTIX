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

const EXPECTED_GROUP_FOR_TAB: Record<string, string> = {
  upload: 'upload',
  live_connector: 'upload',
  preview: 'upload',
  quality: 'clean',
  cleaning: 'clean',
  data_dictionary: 'clean',
  analytics_packs: 'analyze',
  analysis: 'analyze',
  sql_lab: 'analyze',
  python_lab: 'analyze',
  dax_lab: 'analyze',
  modeling: 'analyze',
  data_engineering: 'analyze',
  excel_automation: 'analyze',
  executive_dashboard: 'present',
  dashboard_builder: 'present',
  ai_insights: 'present',
  reports: 'present',
  export_center: 'present',
  how_to_use: 'help_settings',
  blog: 'help_settings',
  settings: 'help_settings',
  landing: 'help_settings',
  how_to_modify: 'help_settings',
};

test.describe('Sidebar Workflow Navigation Smoke Suite (Modern + Classic, Accordion, Pin/Unpin, Search, Stepper Sync)', () => {
  test('Loads app, migrates legacy nav_mode key, shows all pages in Classic and Modern, verifies accordion persistence, pin/unpin, search for "SQL", stepper group highlight on every page, and 0 pageerrors', async ({
    page,
  }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    // Seed legacy dataanalytix_nav_mode to verify migration removes it
    await page.addInitScript(() => {
      localStorage.setItem('dataanalytix_nav_mode', 'simple');
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

    // Verify legacy `dataanalytix_nav_mode` was removed by migration and Simple/Pro toggle is gone
    const legacyKeyAfterBoot = await page.evaluate(() =>
      localStorage.getItem('dataanalytix_nav_mode')
    );
    expect(legacyKeyAfterBoot).toBeNull();
    await expect(page.getByTestId('nav-mode-toggle')).toHaveCount(0);

    // Verify 3-step FirstRunCoachTour appears once on first run and can be skipped
    const coachTour = page.getByTestId('first-run-coach-tour');
    if (await coachTour.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(page.getByTestId('coach-tour-step-indicator')).toContainText('Step 1 of 3');
      await page.getByTestId('coach-tour-next').click();
      await expect(page.getByTestId('coach-tour-step-indicator')).toContainText('Step 2 of 3');
      await page.getByTestId('coach-tour-next').click();
      await expect(page.getByTestId('coach-tour-step-indicator')).toContainText('Step 3 of 3');
      await page.getByTestId('coach-tour-done').click();
      await expect(coachTour).toHaveCount(0);
    }

    // Helper to visit every navigation item inside the active sidebar and verify stepper highlights the right group
    const visitAllSidebarItems = async (sidebarSelector: string, modeLabel: string) => {
      const sidebar = page.locator(sidebarSelector).first();
      await expect(sidebar).toBeVisible();

      const navButtons = sidebar.locator('[data-testid^="sidebar-nav-item-"]');
      const navCount = await navButtons.count();
      expect(navCount).toBe(24);

      for (let i = 0; i < navCount; i++) {
        const btn = navButtons.nth(i);
        const testId = (await btn.getAttribute('data-testid')) || `item-${i}`;
        const tabId = testId.replace('sidebar-nav-item-', '');
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await assertHealthyWorkspace(page, pageErrors, `${modeLabel} -> ${testId}`);

        // Verify top stepper highlights the exact group of the current page
        const expectedGroup = EXPECTED_GROUP_FOR_TAB[tabId];
        if (expectedGroup) {
          const stepBtn = page.getByTestId(`workflow-step-${expectedGroup}`);
          await expect(
            stepBtn,
            `Stepper group "${expectedGroup}" should be highlighted on page "${tabId}"`
          ).toHaveAttribute('aria-current', 'step');
        }
      }
    };

    // 2. Test Classic Sidebar (groupedSidebar: false, uiMode: 'classic')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'classic');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true, groupedSidebar: false })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await dismissCookieIfVisible(page);
    await assertHealthyWorkspace(page, pageErrors, 'Classic Sidebar reload');

    const classicSidebar = page.locator('aside#app-sidebar-drawer').first();

    // Test Pin / Unpin persistence
    await expect(classicSidebar.getByTestId('sidebar-pinned-item-upload')).toBeVisible();
    await expect(classicSidebar.getByTestId('sidebar-pinned-item-sql_lab')).toHaveCount(0);
    await classicSidebar.getByTestId('sidebar-pin-toggle-sql_lab').click();
    await expect(classicSidebar.getByTestId('sidebar-pinned-item-sql_lab')).toBeVisible();
    await classicSidebar.getByTestId('sidebar-unpin-btn-sql_lab').click();
    await expect(classicSidebar.getByTestId('sidebar-pinned-item-sql_lab')).toHaveCount(0);

    // Test Sidebar Search finds "SQL" and Enter opens SQL Lab
    const searchInput = classicSidebar.getByTestId('sidebar-search-input');
    await searchInput.fill('SQL');
    await expect(classicSidebar.getByTestId('sidebar-nav-item-sql_lab')).toBeVisible();
    await searchInput.press('Enter');
    await expect(page.getByTestId('workflow-step-analyze')).toHaveAttribute(
      'aria-current',
      'step'
    );
    await searchInput.fill('');

    // Test Accordion state persistence across reload
    // Currently on sql_lab (group 'analyze'), so collapse group 'clean'
    const cleanToggle = classicSidebar.getByTestId('sidebar-group-toggle-clean');
    await expect(cleanToggle).toHaveAttribute('aria-expanded', 'true');
    await cleanToggle.click();
    await expect(cleanToggle).toHaveAttribute('aria-expanded', 'false');

    await page.reload({ waitUntil: 'load' });
    await dismissCookieIfVisible(page);
    // After reload, verify localStorage saved collapsed state for 'clean'
    const savedAccordion = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('dataanalytix_sidebar_accordion_v1') || '{}')
    );
    expect(savedAccordion.clean).toBe(true);
    // Re-expand 'clean' so all 24 items are visible
    if (
      (await classicSidebar
        .getByTestId('sidebar-group-toggle-clean')
        .getAttribute('aria-expanded')) === 'false'
    ) {
      await classicSidebar.getByTestId('sidebar-group-toggle-clean').click();
    }

    await visitAllSidebarItems('aside#app-sidebar-drawer', 'Classic Sidebar');

    // 3. Test Classic GroupedSidebar (groupedSidebar: true, uiMode: 'classic')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.removeItem('dataanalytix_sidebar_accordion_v1');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true, groupedSidebar: true })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await dismissCookieIfVisible(page);
    await assertHealthyWorkspace(page, pageErrors, 'GroupedSidebar reload');
    await visitAllSidebarItems('aside#app-sidebar-drawer', 'GroupedSidebar');

    // 4. Test Modern Sidebar (uiMode: 'modern')
    await page.evaluate(() => {
      localStorage.setItem('dataanalytix_ui', 'modern');
      localStorage.removeItem('dataanalytix_sidebar_accordion_v1');
      const raw = localStorage.getItem('dataanalytix_features');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({ ...parsed, designSystemV3: true })
      );
    });
    await page.reload({ waitUntil: 'load' });
    await dismissCookieIfVisible(page);
    await assertHealthyWorkspace(page, pageErrors, 'ModernSidebar reload');
    await visitAllSidebarItems(
      'aside[aria-label="Workflow Navigation Sidebar"]',
      'ModernSidebar'
    );
  });
});
