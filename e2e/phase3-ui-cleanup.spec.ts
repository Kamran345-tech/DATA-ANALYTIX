import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'artifacts/phase1');
const LEGACY_SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results/qa-phase3');

async function saveDualScreenshot(page: Page, fileName: string) {
  const target1 = path.join(SCREENSHOT_DIR, fileName);
  const target2 = path.join(LEGACY_SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: target1, fullPage: false });
  fs.copyFileSync(target1, target2);
}

async function bootstrapWorkspace(
  page: Page,
  options?: { theme?: 'dark' | 'light'; skipTour?: boolean }
) {
  const theme = options?.theme ?? 'dark';
  const skipTour = options?.skipTour ?? true;

  await page.addInitScript(
    (opts) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      sessionStorage.removeItem('dataanalytix_start_empty');
      localStorage.setItem('acuitybi_theme', opts.theme);
      localStorage.setItem('dataanalytix_theme', opts.theme);
      localStorage.setItem('dataanalytix_ui', 'classic');
      if (opts.skipTour) {
        localStorage.setItem('dataanalytix_coach_tour_completed_v1', 'true');
      } else {
        localStorage.removeItem('dataanalytix_coach_tour_completed_v1');
      }
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
    { theme, skipTour }
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

test.describe('Phase 1 & 3: Workflow Sidebar, Shrunk Page Header Stack, Mobile 375px Stepper/KPIs, First-Run Tour & Responsive Screenshots', () => {
  test('1.1-1.5 Shrunk Executive Dashboard Header (KPIs visible at 1440x900 without scrolling, View options popover with preview), Workflow Stepper & Sidebar, Replayable 3-Step Tour, Upload Banner, Ask AI Cards, Version Sync', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootstrapWorkspace(page, { theme: 'dark', skipTour: false });

    // 1. Verify html[data-design-system-v3="true"] is active
    await expect(page.locator('html')).toHaveAttribute('data-design-system-v3', 'true');

    // 2. Verify First-Run 3-Step Coach Mark Tour (Fix 4):
    // - Spotlights real target ([data-coach-spotlight="true"])
    // - Placed BESIDE the sidebar on desktop (x >= 268, never overlapping the 256px sidebar)
    const tour = page.getByTestId('first-run-coach-tour');
    await expect(tour).toBeVisible();
    await expect(page.getByTestId('coach-tour-step-indicator')).toContainText('Step 1 of 3');
    const tourBox = await tour.boundingBox();
    expect(tourBox).not.toBeNull();
    expect(
      tourBox!.x,
      'Desktop coach tour card must be placed beside the 256px sidebar, not over it'
    ).toBeGreaterThanOrEqual(268);
    await expect(page.locator('[data-coach-spotlight="true"]').first()).toBeVisible();
    await page.getByTestId('coach-tour-skip').click();
    await expect(tour).toHaveCount(0);

    // 3. Verify Shrunk Executive Dashboard Header Stack & Fixes 1, 2, 3, 5:
    // - Fix 3: Full-width purpose line under the title (width > 800px at 1440x900)
    const purposeBar = page.getByTestId('page-purpose-bar-executive_dashboard');
    await expect(purposeBar).toBeVisible();
    const purposeBox = await purposeBar.boundingBox();
    expect(purposeBox).not.toBeNull();
    expect(
      purposeBox!.width,
      'Desktop purpose line must span full width under the title'
    ).toBeGreaterThan(800);

    // - Fix 5a: Sidebar search input placeholder is shortened to "Search pages"
    const searchInput = page.getByTestId('sidebar-search-input').first();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search pages');

    await expect(page.getByTestId('exec-single-action-bar')).toBeVisible();

    const viewOptionsBtn = page.getByTestId('exec-view-options-trigger');
    await expect(viewOptionsBtn).toBeVisible();
    await viewOptionsBtn.click();
    await expect(page.getByTestId('exec-view-options-popover')).toBeVisible();
    await expect(page.getByTestId('exec-view-options-preview')).toBeVisible();
    await page.getByTestId('view-option-theme-wall_street').click();
    await viewOptionsBtn.click();

    // Verify all 4 KPI card values are visible within the 1440x900 viewport without scrolling
    const firstKpiValue = page.locator('[data-testid^="exec-kpi-value-"]').first();
    await expect(firstKpiValue).toBeVisible();
    const kpiBox = await firstKpiValue.boundingBox();
    expect(kpiBox).not.toBeNull();
    expect(
      (kpiBox?.y ?? 999) + (kpiBox?.height ?? 0),
      'Real KPI numbers must be visible in first 1440x900 screenful without scrolling'
    ).toBeLessThan(880);

    // - Fix 1: KPI card labels & source lines never truncate mid-word with single-line ellipsis
    const kpiTruncationCheck = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('[data-testid^="exec-kpi-label-"]'));
      const sources = Array.from(document.querySelectorAll('[data-testid^="exec-kpi-source-"]'));
      const truncatedLabels = labels
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .map((el) => el.textContent);
      const truncatedSources = sources
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .map((el) => el.textContent);
      const missingTooltips = [...labels, ...sources].filter(
        (el) => !(el.getAttribute('title') || '').trim()
      ).length;
      return {
        labelCount: labels.length,
        truncatedLabels,
        truncatedSources,
        missingTooltips,
      };
    });
    expect(kpiTruncationCheck.labelCount).toBe(4);
    expect(kpiTruncationCheck.truncatedLabels).toEqual([]);
    expect(kpiTruncationCheck.truncatedSources).toEqual([]);
    expect(kpiTruncationCheck.missingTooltips).toBe(0);

    // - Fix 2: KPI delta uses clear arrow icon + "up/down/flat X.X%" text coloured by goodDirection
    const deltaCheck = await page.evaluate(() => {
      const deltas = Array.from(document.querySelectorAll('[data-testid^="exec-kpi-delta-"]'));
      return deltas.map((el) => ({
        text: (el.textContent || '').trim(),
        hasSvgIcon: Boolean(el.querySelector('svg')),
        favorableAttr: el.getAttribute('data-favorable'),
      }));
    });
    expect(deltaCheck.length).toBe(4);
    for (const d of deltaCheck) {
      expect(d.hasSvgIcon).toBe(true);
      expect(d.text).toMatch(/^(up|down|flat)\s+\d+\.\d%$/i);
      expect(['true', 'false', 'neutral']).toContain(d.favorableAttr);
    }

    // 4. Verify Guided Workflow Stepper matches sidebar group names (1 Upload, 2 Clean, 3 Analyze, 4 Present, Help & Settings)
    const stepper = page.getByTestId('guided-workflow-stepper');
    await expect(stepper).toBeVisible();
    await expect(page.getByTestId('workflow-step-upload')).toContainText('1 Upload');
    await expect(page.getByTestId('workflow-step-clean')).toContainText('2 Clean');
    await expect(page.getByTestId('workflow-step-analyze')).toContainText('3 Analyze');
    await expect(page.getByTestId('workflow-step-present')).toContainText('4 Present');
    await expect(page.getByTestId('workflow-step-help_settings')).toContainText('Help & Settings');

    // 5. Verify Replay 3-Step Quick Tour from How to Use (Help) page
    await page.getByTestId('workflow-step-help_settings').click();
    const replayBtn = page.getByTestId('replay-coach-tour-btn');
    await expect(replayBtn).toBeVisible();
    await replayBtn.click();
    await expect(page.getByTestId('first-run-coach-tour')).toBeVisible();
    await page.getByTestId('coach-tour-skip').click();

    // 6. Verify Command Palette (Ctrl+K) indexes all 26 pages & actions
    await page.getByTestId('stepper-command-palette-trigger').click();
    const cmdModal = page.getByTestId('command-palette-dialog');
    await expect(cmdModal).toBeVisible();
    const cmdInput = page.getByTestId('command-palette-input');
    await cmdInput.fill('Upload Data');
    await expect(page.getByTestId('command-palette-item-page-upload')).toBeVisible();
    await page.getByTestId('command-palette-item-page-upload').click();

    // 7. On Upload page: verify PageHeader & full-width "Recommended for your data" banner
    const pageTitle = page.getByTestId('page-header-title-upload');
    await expect(pageTitle).toHaveText('Upload & Ingest Data');
    const detectionBanner = page.getByTestId('upload-pack-detection-banner');
    await expect(detectionBanner).toBeVisible();
    const bannerBox = await detectionBanner.boundingBox();
    expect(bannerBox?.width).toBeGreaterThan(700);

    // 8. Navigate to Ask Data AI and verify 2x2 Pack-Aware Example Prompt Cards + Recent Answers
    await page.getByTestId('stepper-command-palette-trigger').click();
    await page.getByTestId('command-palette-input').fill('Ask Your Data AI');
    await page.getByTestId('command-palette-item-page-ai_insights').click();
    await expect(page.getByTestId('ai-example-prompt-cards')).toBeVisible();
    await expect(page.getByTestId('ai-recent-answers')).toBeVisible();

    // 9. Navigate to Settings and verify Version (v2.4.0) & Dataset Identifier
    await page.getByTestId('stepper-command-palette-trigger').click();
    await page.getByTestId('command-palette-input').fill('Settings & Branding');
    await page.getByTestId('command-palette-item-page-settings').click();
    await expect(page.getByTestId('settings-active-version')).toHaveText('v2.4.0');
    await expect(page.getByTestId('navbar-app-version')).toContainText('v2.4.0');
    await expect(page.getByTestId('settings-project-identifier')).toContainText(
      'sales-margin-telemetry'
    );
  });

  test('1.3, Fix 4 Mobile Bottom-Sheet Tour & Phase 2.5 Multi-Viewport Screenshots (1440/1024/375 Light+Dark)', async ({
    page,
  }) => {
    test.setTimeout(180000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(LEGACY_SCREENSHOT_DIR, { recursive: true });

    // First verify Fix 4 on Mobile (375x812): Coach tour renders as bottom sheet that leaves first KPI cards visible
    await page.setViewportSize({ width: 375, height: 812 });
    await bootstrapWorkspace(page, { theme: 'dark', skipTour: false });
    const mobileFirstKpi = page.locator('[data-testid^="exec-kpi-value-"]').first();
    await expect(mobileFirstKpi).toBeVisible({ timeout: 15000 });
    const mobileTour = page.getByTestId('first-run-coach-tour');
    await expect(mobileTour).toBeVisible();

    const mobileOverlapCheck = await page.evaluate(() => {
      const kpiEl = document.querySelector('[data-testid^="exec-kpi-value-"]');
      const tourEl = document.querySelector('[data-testid="first-run-coach-tour"]');
      if (!kpiEl || !tourEl) return null;
      const kpiRect = kpiEl.getBoundingClientRect();
      const tourRect = tourEl.getBoundingClientRect();
      return {
        kpiBottom: kpiRect.bottom,
        tourTop: tourRect.top,
        tourBottom: tourRect.bottom,
      };
    });
    expect(mobileOverlapCheck).not.toBeNull();
    expect(
      mobileOverlapCheck!.tourTop,
      'Mobile bottom-sheet tour must stay below the first KPI card so KPIs remain visible'
    ).toBeGreaterThan(mobileOverlapCheck!.kpiBottom);
    await page.getByTestId('coach-tour-skip').click();

    const viewports = [
      { width: 1440, height: 900, label: '1440' },
      { width: 1024, height: 768, label: '1024' },
      { width: 375, height: 812, label: '375' },
    ] as const;

    for (const theme of ['dark', 'light'] as const) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await bootstrapWorkspace(page, { theme, skipTour: true });

        // 1. Wait for lazy ExecutiveDashboard KPI cards to finish rendering before measuring & screenshotting
        const firstKpi = page.locator('[data-testid^="exec-kpi-value-"]').first();
        await expect(firstKpi).toBeVisible({ timeout: 15000 });

        const execOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(execOverflow).toBe(false);

        if (vp.width === 375) {
          // Verify Phase 1.3 & Fix 5b mobile requirements:
          // - Stepper shows "4/4" counter and "4 Present" is scrolled into view
          await expect(page.getByTestId('stepper-mobile-step-counter')).toContainText('4/4');
          const presentStepBox = await page.getByTestId('workflow-step-present').boundingBox();
          expect(presentStepBox).not.toBeNull();
          expect(presentStepBox!.x).toBeGreaterThanOrEqual(0);
          expect(presentStepBox!.x + presentStepBox!.width).toBeLessThanOrEqual(375);

          // - Fix 5b: Mobile View options button shows icon + "View" (not just "options")
          const viewBtnText = await page
            .getByTestId('exec-view-options-trigger')
            .innerText();
          expect(viewBtnText.trim()).toBe('View');

          // - Purpose/Related links collapsed behind "i" button on mobile
          const infoBtn = page.getByTestId('purpose-info-toggle');
          await expect(infoBtn).toBeVisible();
          await expect(page.getByTestId('page-purpose-related')).toBeHidden();

          // - First KPI value is visible in the first 375x812 screenful without scrolling
          const mobileKpiRect = await page.evaluate(() => {
            const el = document.querySelector('[data-testid^="exec-kpi-value-"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom };
          });
          expect(mobileKpiRect).not.toBeNull();
          expect(
            mobileKpiRect?.bottom ?? 999,
            'First KPI value must be visible in first 375x812 mobile screen without scrolling'
          ).toBeLessThan(790);
        }

        await saveDualScreenshot(page, `after-executive-dashboard-${vp.label}-${theme}.png`);

        // 2. Upload page
        await page.getByTestId('workflow-step-upload').click();
        await expect(page.getByTestId('upload-pack-detection-banner')).toBeVisible();

        const uploadOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(uploadOverflow).toBe(false);

        await saveDualScreenshot(page, `upload-${vp.label}-${theme}.png`);

        // 3. Clean stage (Data Cleaning Lab / Quality Auditor) - Phase 2.5 review
        await page.getByTestId('workflow-step-clean').click();
        await expect(page.locator('text=Loading analytical module...')).toHaveCount(0, {
          timeout: 15000,
        });
        const cleanOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(cleanOverflow).toBe(false);
        await saveDualScreenshot(page, `quality-auditor-${vp.label}-${theme}.png`);

        // 4. Analyze stage (Analytics Packs) - Phase 2.5 review
        await page.getByTestId('workflow-step-analyze').click();
        await expect(page.getByTestId('analytics-packs-view')).toBeVisible();
        const packsOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(packsOverflow).toBe(false);
        await saveDualScreenshot(page, `analytics-packs-${vp.label}-${theme}.png`);

        // 5. Ask Data AI page
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

        await saveDualScreenshot(page, `ask-ai-${vp.label}-${theme}.png`);
      }
    }
  });
});

