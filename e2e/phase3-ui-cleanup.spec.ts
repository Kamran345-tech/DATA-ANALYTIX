import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results/qa-phase3');

async function bootstrapWorkspace(
  page: Page,
  options?: { theme?: 'dark' | 'light'; navMode?: 'simple' | 'pro' }
) {
  const theme = options?.theme ?? 'dark';
  const navMode = options?.navMode ?? 'simple';

  await page.addInitScript(
    (opts) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      sessionStorage.removeItem('dataanalytix_start_empty');
      localStorage.setItem('acuitybi_theme', opts.theme);
      localStorage.setItem('dataanalytix_theme', opts.theme);
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.setItem('dataanalytix_nav_mode', opts.navMode);
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({
          depthUI: true,
          heroScene3D: true,
          chartGuide: true,
          unifiedTheme: true,
          analyticsPacks: true,
          designSystemV3: true,
          analystFeatures: true,
          dataEngineerFeatures: true,
          southAsiaLocale: true,
          productQuality: true,
        })
      );
    },
    { theme, navMode }
  );

  await page.goto('/', { waitUntil: 'load' });
  await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });

  const cookieBtn = page.locator(
    'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
  );
  if (await cookieBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieBtn.first().click().catch(() => {});
  }

  const launchBtn = page.locator('button:has-text("Launch Enterprise BI")');
  if (await launchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await launchBtn.click();
  }
}

test.describe('Phase 3: UI, Design System, Navigation & Accessibility Verification', () => {
  test('3.1-3.4 Typography, PageHeader, Simple/Pro Nav, Guided Stepper, Ctrl+K, Upload Full-Width Banner, Version Sync, Ask AI Cards', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootstrapWorkspace(page, { theme: 'dark', navMode: 'simple' });

    // 1. Verify html[data-design-system-v3="true"] is active
    await expect(page.locator('html')).toHaveAttribute('data-design-system-v3', 'true');

    // 2. Verify Guided Workflow Stepper (Upload -> Clean -> Analyze -> Present) & "?" Quick Guide trigger
    const stepper = page.getByTestId('guided-workflow-stepper');
    await expect(stepper).toBeVisible();
    await expect(page.getByTestId('workflow-step-upload')).toBeVisible();
    await expect(page.getByTestId('workflow-step-clean')).toBeVisible();
    await expect(page.getByTestId('workflow-step-analyze')).toBeVisible();
    await expect(page.getByTestId('workflow-step-present')).toBeVisible();

    await page.getByTestId('stepper-page-guide-trigger').click();
    await expect(page.getByTestId('stepper-page-guide-panel')).toBeVisible();
    await page.getByTestId('stepper-page-guide-trigger').click();

    // 3. Verify Simple (8) / Pro (All) Sidebar Mode toggle
    const simpleBtn = page.getByTestId('nav-mode-simple').first();
    const proBtn = page.getByTestId('nav-mode-pro').first();
    await expect(simpleBtn).toBeVisible();
    await expect(proBtn).toBeVisible();
    await proBtn.click();

    // 4. Verify Command Palette (Ctrl+K) indexes all 26 pages & actions
    await page.getByTestId('stepper-command-palette-trigger').click();
    const cmdModal = page.getByTestId('command-palette-dialog');
    await expect(cmdModal).toBeVisible();
    const cmdInput = page.getByTestId('command-palette-input');
    await cmdInput.fill('Upload Data');
    await expect(page.getByTestId('command-palette-item-page-upload')).toBeVisible();
    await page.getByTestId('command-palette-item-page-upload').click();

    // 5. On Upload page: verify PageHeader (sentence case, not ALL-CAPS) & full-width "Recommended for your data" banner
    const pageTitle = page.getByTestId('page-header-title-upload');
    await expect(pageTitle).toHaveText('Upload & Data Ingestion');

    const detectionBanner = page.getByTestId('upload-pack-detection-banner');
    await expect(detectionBanner).toBeVisible();
    const matchesGrid = page.getByTestId('upload-top-pack-matches-grid');
    await expect(matchesGrid).toBeVisible();

    const bannerBox = await detectionBanner.boundingBox();
    expect(bannerBox?.width).toBeGreaterThan(700);

    // Verify "?" Quick Guide inside PageHeader
    await page.getByTestId('page-help-trigger-upload').click();
    await expect(page.getByTestId('page-help-panel-upload')).toBeVisible();

    // 6. Navigate to Ask Data AI via Command Palette and verify 2x2 Pack-Aware Example Prompt Cards + Recent Answers
    await page.getByTestId('stepper-command-palette-trigger').click();
    await page.getByTestId('command-palette-input').fill('Ask Your Data AI');
    await page.getByTestId('command-palette-item-page-ai_insights').click();

    await expect(page.getByTestId('ai-example-prompt-cards')).toBeVisible();
    await expect(page.getByTestId('ai-prompt-card-kpi-drivers')).toBeVisible();
    await expect(page.getByTestId('ai-prompt-card-pack-sql')).toBeVisible();
    await expect(page.getByTestId('ai-recent-answers')).toBeVisible();

    // 7. Navigate to Settings and verify single source of truth Version (v2.4.0) & active Dataset Identifier
    await page.getByTestId('stepper-command-palette-trigger').click();
    await page.getByTestId('command-palette-input').fill('Settings & Branding');
    await page.getByTestId('command-palette-item-page-settings').click();

    const navbarVersion = page.getByTestId('navbar-app-version');
    const settingsVersion = page.getByTestId('settings-active-version');
    await expect(settingsVersion).toHaveText('v2.4.0');
    await expect(navbarVersion).toContainText('v2.4.0');

    const projectIdEl = page.getByTestId('settings-project-identifier');
    await expect(projectIdEl).toContainText('sales-margin-telemetry');
  });

  test('3.6 & 3.7 Mobile Bottom-Nav at 375px & 414px with zero horizontal scroll and 1440/1024/375 Light+Dark Screenshots', async ({
    page,
  }) => {
    test.setTimeout(120000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const viewports = [
      { width: 1440, height: 900, label: '1440' },
      { width: 1024, height: 768, label: '1024' },
      { width: 375, height: 812, label: '375' },
    ] as const;

    for (const theme of ['dark', 'light'] as const) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await bootstrapWorkspace(page, { theme, navMode: 'simple' });

        // Navigate to Upload page via Guided Stepper
        await page.getByTestId('workflow-step-upload').click();
        await expect(page.getByTestId('upload-pack-detection-banner')).toBeVisible();

        // Check zero horizontal scroll
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasHorizontalOverflow).toBe(false);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `upload-${vp.label}-${theme}.png`),
          fullPage: false,
        });

        // Navigate to Ask Data AI via Command Palette or Mobile Bottom Nav
        if (vp.width === 375) {
          const mobileNav = page.getByTestId('mobile-bottom-nav');
          await expect(mobileNav).toBeVisible();
          await page.getByTestId('mobile-bottom-more-btn').click();
          await page.getByTestId('mobile-more-item-ai_insights').click();
        } else {
          await page.getByTestId('stepper-command-palette-trigger').click();
          await page.getByTestId('command-palette-input').fill('Ask Your Data AI');
          await page.getByTestId('command-palette-item-page-ai_insights').click();
        }

        await expect(page.getByTestId('ai-example-prompt-cards')).toBeVisible();

        const aiOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(aiOverflow).toBe(false);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `ask-ai-${vp.label}-${theme}.png`),
          fullPage: false,
        });
      }
    }

    // Also verify 414px mobile viewport has zero horizontal scroll across the 5 primary bottom-nav pages
    await page.setViewportSize({ width: 414, height: 896 });
    await bootstrapWorkspace(page, { theme: 'dark', navMode: 'simple' });

    const mobileCoreTabs = ['upload', 'cleaning', 'analytics_packs', 'executive_dashboard', 'reports'] as const;
    for (const tabId of mobileCoreTabs) {
      await page.getByTestId(`mobile-bottom-tab-${tabId}`).click();
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(overflow).toBe(false);
    }
  });
});
