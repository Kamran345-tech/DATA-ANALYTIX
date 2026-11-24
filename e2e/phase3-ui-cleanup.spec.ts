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

    // 2. Verify First-Run 3-Step Coach Mark Tour (Fix A.1 & A.3 at 1440x900):
    // - Wait for Executive Dashboard KPI cards to render
    // - Spotlights real target ([data-coach-spotlight="true"])
    // - First KPI card's full bounding box ([data-testid^="exec-kpi-card-"]) AND dashboard header
    //   must NOT intersect the tour card at 1440x900
    const firstKpiCardDesktop = page.locator('[data-testid^="exec-kpi-card-"]').first();
    await expect(firstKpiCardDesktop).toBeVisible({ timeout: 15000 });
    const tour = page.getByTestId('first-run-coach-tour');
    await expect(tour).toBeVisible();
    await expect(page.getByTestId('coach-tour-step-indicator')).toContainText('Step 1 of 3');
    await expect(page.locator('[data-coach-spotlight="true"]').first()).toBeVisible();

    const desktopTourIntersection = await page.evaluate(() => {
      const tourEl = document.querySelector('[data-testid="first-run-coach-tour"]');
      const kpiCardEl = document.querySelector('[data-testid^="exec-kpi-card-"]');
      const headerEl = document.querySelector('#main-content section.glass-panel-luminous');
      if (!tourEl || !kpiCardEl || !headerEl) return null;
      const t = tourEl.getBoundingClientRect();
      const k = kpiCardEl.getBoundingClientRect();
      const h = headerEl.getBoundingClientRect();
      const intersects = (a: DOMRect, b: DOMRect) =>
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      return {
        intersectsKpiCard: intersects(t, k),
        intersectsHeader: intersects(t, h),
        tourBox: { left: t.left, top: t.top, right: t.right, bottom: t.bottom },
        kpiCardBox: { left: k.left, top: k.top, right: k.right, bottom: k.bottom },
      };
    });
    expect(desktopTourIntersection).not.toBeNull();
    expect(
      desktopTourIntersection!.intersectsKpiCard,
      'At 1440x900, the first KPI card bounding box must not intersect the coach tour card'
    ).toBe(false);
    expect(
      desktopTourIntersection!.intersectsHeader,
      'At 1440x900, the dashboard header bounding box must not intersect the coach tour card'
    ).toBe(false);

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

  test('1.3, Fix A.2 & A.3 Mobile Bottom-Sheet Tour & Phase 2.5 Multi-Viewport Screenshots (1440/1024/375 Light+Dark)', async ({
    page,
  }) => {
    test.setTimeout(180000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(LEGACY_SCREENSHOT_DIR, { recursive: true });

    // Verify Fix A.2 & A.3 on Mobile (375x812):
    // Coach tour renders as compact bottom sheet (<= 120px) and the FULL first KPI card bounding box
    // ([data-testid^="exec-kpi-card-"], including delta & source line) does NOT intersect the tour card
    await page.setViewportSize({ width: 375, height: 812 });
    await bootstrapWorkspace(page, { theme: 'dark', skipTour: false });
    const mobileFirstKpiCard = page.locator('[data-testid^="exec-kpi-card-"]').first();
    await expect(mobileFirstKpiCard).toBeVisible({ timeout: 15000 });
    const mobileTour = page.getByTestId('first-run-coach-tour');
    await expect(mobileTour).toBeVisible();

    const mobileOverlapCheck = await page.evaluate(() => {
      const kpiCardEl = document.querySelector('[data-testid^="exec-kpi-card-"]');
      const tourEl = document.querySelector('[data-testid="first-run-coach-tour"]');
      if (!kpiCardEl || !tourEl) return null;
      const k = kpiCardEl.getBoundingClientRect();
      const t = tourEl.getBoundingClientRect();
      const intersects = !(
        t.right <= k.left ||
        t.left >= k.right ||
        t.bottom <= k.top ||
        t.top >= k.bottom
      );
      return {
        intersects,
        kpiCardBottom: k.bottom,
        tourTop: t.top,
        tourHeight: t.height,
        hasBottomPaddingAttr: document.documentElement.getAttribute('data-coach-tour-open') === 'true',
      };
    });
    expect(mobileOverlapCheck).not.toBeNull();
    expect(mobileOverlapCheck!.hasBottomPaddingAttr).toBe(true);
    expect(mobileOverlapCheck!.tourHeight).toBeLessThanOrEqual(120);
    expect(
      mobileOverlapCheck!.intersects,
      'At 375x812, the full first KPI card bounding box must not intersect the coach tour bottom sheet'
    ).toBe(false);
    expect(
      mobileOverlapCheck!.tourTop,
      'Mobile bottom-sheet tour top must be below the full first KPI card bottom (including delta & footer)'
    ).toBeGreaterThan(mobileOverlapCheck!.kpiCardBottom);
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

  test('Section 1-5 E2E: Theme Studio recolours tokens & auto-adjusts low-contrast custom accent; Dashboard Look cards; Glass Sidebar Favorites empty state, 6-item limit toast & slim rail collapse; How to Use downloads non-empty PDF (%PDF) and PPTX (PK)', async ({
    page,
  }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootstrapWorkspace(page, { theme: 'dark', skipTour: true });

    // 1. Verify Section 2 Dashboard Look elements on Executive Dashboard
    await expect(page.getByTestId('topbar-pill-nav')).toBeVisible();
    await expect(page.getByTestId('exec-plain-summary-line')).toBeVisible();
    await expect(page.getByTestId('exec-key-numbers-heading')).toHaveText('Key numbers');
    await expect(page.getByTestId('exec-hero-area-chart')).toBeVisible();
    await expect(page.getByTestId('exec-hero-summary-metrics')).toBeVisible();
    await expect(page.getByTestId('exec-ranking-card')).toBeVisible();
    await expect(page.getByTestId('exec-ranking-view-all')).toBeVisible();
    await expect(page.getByTestId('exec-what-to-do-next')).toBeVisible();
    await expect(page.getByTestId('next-step-fix-data')).toBeVisible();
    await expect(page.getByTestId('next-step-explore-packs')).toBeVisible();
    await expect(page.getByTestId('next-step-share-export')).toBeVisible();
    await expect(page.getByTestId('exec-what-to-do-about-it-heading')).toHaveText(
      'What to do about it'
    );

    // 2. Verify Section 1 Theme Studio live recolouring & low-contrast custom accent auto-adjustment
    await page.getByTestId('navbar-theme-studio-btn').click();
    await expect(page.getByTestId('theme-studio-panel')).toBeVisible();

    await page.getByTestId('theme-preset-violet').click();
    const violetAccent = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--accent').trim()
    );
    expect(violetAccent.toUpperCase()).toBe('#A78BFA');

    // Enter a low-contrast custom hex on dark background (#151922) -> auto-adjusted with note
    const hexInput = page.getByTestId('theme-custom-hex-input');
    await hexInput.fill('#151922');
    await expect(page.getByTestId('theme-contrast-adjusted-note')).toBeVisible();
    await expect(page.getByTestId('theme-contrast-adjusted-note')).toContainText(
      'Adjusted for readability'
    );

    // Reset to default and close Theme Studio popover
    await page.getByTestId('theme-studio-reset-btn').click();
    await page.getByTestId('theme-studio-close-btn').click();

    // 3. Verify Section 3 Glass Sidebar: Favorites 6-item limit toast, empty state, and slim rail collapse
    const sidebar = page.locator('aside#app-sidebar-drawer');
    await expect(sidebar.getByTestId('sidebar-favorites-section')).toBeVisible();
    await expect(sidebar.getByTestId('sidebar-favorites-count')).toContainText('4 of 6');
    await expect(sidebar.getByTestId('sidebar-dataset-health-card')).toBeVisible();
    await expect(sidebar.getByTestId('sidebar-user-row')).toBeVisible();

    // Expand group 'analyze' so we can star 3 more items (5th, 6th, and 7th to trigger limit toast)
    const analyzeToggle = sidebar.getByTestId('sidebar-group-toggle-analyze');
    if ((await analyzeToggle.getAttribute('aria-expanded')) === 'false') {
      await analyzeToggle.click();
    }
    await sidebar.getByTestId('sidebar-pin-toggle-sql_lab').click();
    await expect(sidebar.getByTestId('sidebar-favorites-count')).toContainText('5 of 6');
    await sidebar.getByTestId('sidebar-pin-toggle-python_lab').click();
    await expect(sidebar.getByTestId('sidebar-favorites-count')).toContainText('6 of 6');

    // Attempt to pin a 7th item -> limit toast appears and count stays 6 of 6
    await sidebar.getByTestId('sidebar-pin-toggle-dax_lab').click();
    await expect(sidebar.getByTestId('sidebar-favorites-limit-toast')).toContainText(
      'Favorites are full. Remove one to add another.'
    );
    await expect(sidebar.getByTestId('sidebar-favorites-count')).toContainText('6 of 6');

    // Clear all favorites -> verify empty state with 2 suggestion chips
    await sidebar.getByTestId('sidebar-favorites-clear-btn').click();
    await expect(sidebar.getByTestId('sidebar-favorites-empty')).toBeVisible();
    await sidebar.getByTestId('favorite-suggest-executive_dashboard').click();
    await expect(sidebar.getByTestId('sidebar-favorites-count')).toContainText('1 of 6');

    // Collapse sidebar to slim icon rail and expand back
    await page.getByTestId('sidebar-collapse-toggle').click();
    await expect(page.getByTestId('sidebar-slim-rail')).toBeVisible();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.getByTestId('sidebar-collapse-toggle').click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    // 4. Verify Section 5 How to Use: Downloadable Guide (PDF %PDF and PPTX PK)
    const helpToggle = sidebar.getByTestId('sidebar-group-toggle-help_settings');
    if ((await helpToggle.getAttribute('aria-expanded')) === 'false') {
      await helpToggle.click();
    }
    await sidebar.getByTestId('sidebar-nav-item-how_to_use').click();
    await expect(page.getByTestId('user-guide-handout-preview')).toBeVisible();
    await expect(page.getByTestId('download-guide-pdf-btn')).toBeVisible();
    await expect(page.getByTestId('download-guide-pptx-btn')).toBeVisible();
    await expect(page.getByTestId('download-guide-bottom-pdf-btn')).toBeVisible();
    await expect(page.getByTestId('download-guide-bottom-pptx-btn')).toBeVisible();

    // Download PDF and verify %PDF magic bytes
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-guide-pdf-btn').click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toBe('DATA-ANALYTIX-User-Guide.pdf');
    const pdfPath = await pdfDownload.path();
    expect(pdfPath).not.toBeNull();
    const pdfBuf = fs.readFileSync(pdfPath!);
    expect(pdfBuf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdfBuf.byteLength).toBeGreaterThan(5000);

    // Download PPTX and verify PK zip magic bytes
    const [pptxDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-guide-pptx-btn').click(),
    ]);
    expect(pptxDownload.suggestedFilename()).toBe('DATA-ANALYTIX-User-Guide.pptx');
    const pptxPath = await pptxDownload.path();
    expect(pptxPath).not.toBeNull();
    const pptxBuf = fs.readFileSync(pptxPath!);
    expect(pptxBuf.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(pptxBuf.byteLength).toBeGreaterThan(15000);
  });
});


