import { test, expect, Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ALL_VIEWS = [
  'landing',
  'executive_dashboard',
  'how_to_use',
  'dashboard_builder',
  'upload',
  'live_connector',
  'preview',
  'quality',
  'cleaning',
  'modeling',
  'data_engineering',
  'analysis',
  'dax_lab',
  'sql_lab',
  'python_lab',
  'excel_automation',
  'ai_insights',
  'reports',
  'data_dictionary',
  'export_center',
  'how_to_modify',
  'settings',
  'blog',
];

const SIDEBAR_ITEM_LABELS: Record<string, string> = {
  landing: 'Home / Overview',
  executive_dashboard: 'Executive Dashboard',
  how_to_use: 'How to Use Platform',
  dashboard_builder: 'Dashboard Builder',
  upload: 'Upload Data',
  live_connector: 'Live Server & DB',
  preview: 'Data Preview & Profile',
  quality: 'Data Quality Auditor',
  cleaning: 'Data Cleaning Lab',
  modeling: 'Data Modeling (ERD)',
  data_engineering: 'Data Engineering (DAG)',
  analysis: 'Statistical Analysis',
  dax_lab: 'DAX Lab',
  sql_lab: 'SQL Lab',
  python_lab: 'Python Lab',
  excel_automation: 'Excel Automation (XLSX)',
  ai_insights: 'Ask Your Data AI',
  reports: 'Executive Reports',
  data_dictionary: 'Data Dictionary & Lineage',
  export_center: 'Export Center (ZIP)',
  how_to_modify: 'How to Modify Project',
  settings: 'Settings & Branding',
  blog: 'Knowledge Base / Blog',
};

const FINAL_SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots/final');

async function initThemeTestPage(
  page: Page,
  theme: 'dark' | 'light',
  width: number,
  height: number
) {
  await page.addInitScript(
    ({ thm }) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.setItem('acuitybi_theme', thm);
      localStorage.setItem('acuitybi_theme_preference', thm);
      localStorage.setItem('dataanalytix_theme_pref', thm);
    },
    { thm: theme }
  );

  await page.setViewportSize({ width, height });
  await page.goto('/', { waitUntil: 'load' });
  await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim().length > 0,
    { timeout: 10000 }
  );

  const cookieBtn = page.locator(
    'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
  );
  if (await cookieBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
    await cookieBtn.first().click().catch(() => {});
  }

  const guestBtn = page.locator(
    'button:has-text("Explore as Guest"), button:has-text("EXPLORE AS GUEST"), button:has-text("Try with sample data")'
  );
  if (await guestBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
    await guestBtn.first().click().catch(() => {});
  }
}

async function auditCurrentPage(page: Page, viewId: string, theme: 'dark' | 'light') {
  await page.waitForTimeout(80);

  return page.evaluate(
    ({ expectedTheme, currentView }) => {
      function parseColor(str: string): [number, number, number, number] | null {
        const m = str.match(
          /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/
        );
        if (!m) return null;
        return [
          Number(m[1]),
          Number(m[2]),
          Number(m[3]),
          m[4] !== undefined ? Number(m[4]) : 1,
        ];
      }

      function blend(
        fg: [number, number, number, number],
        bg: [number, number, number, number]
      ): [number, number, number, number] {
        const alpha = fg[3];
        return [
          fg[0] * alpha + bg[0] * (1 - alpha),
          fg[1] * alpha + bg[1] * (1 - alpha),
          fg[2] * alpha + bg[2] * (1 - alpha),
          1,
        ];
      }

      function relLum([r, g, b]: [number, number, number, number]): number {
        const f = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      }

      function ratio(
        c1: [number, number, number, number],
        c2: [number, number, number, number]
      ): number {
        const l1 = relLum(c1);
        const l2 = relLum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      function resolveEffectiveBg(el: Element): [number, number, number, number] {
        const fallback: [number, number, number, number] =
          expectedTheme === 'light' ? [246, 248, 252, 1] : [11, 17, 32, 1];
        const layers: [number, number, number, number][] = [];
        let cur: Element | null = el;
        while (cur && cur.nodeType === 1) {
          const cs = window.getComputedStyle(cur);
          const parsed = parseColor(cs.backgroundColor);
          if (parsed && parsed[3] > 0) {
            layers.unshift(parsed);
            if (parsed[3] >= 0.99) break;
          }
          cur = cur.parentElement;
        }
        let effective = fallback;
        for (const layer of layers) {
          effective = blend(layer, effective);
        }
        return effective;
      }

      const mainEl = document.querySelector('main') || document.body;
      const candidates = Array.from(
        mainEl.querySelectorAll('h1, h2, h3, th, label, p')
      ).slice(0, 45);

      const failures: string[] = [];
      for (const el of candidates) {
        const text = (el.textContent || '').trim();
        if (!text || text.length < 2) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const cs = window.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) {
          continue;
        }
        if (el.closest('[aria-disabled="true"], [disabled], .opacity-40, .opacity-50')) {
          continue;
        }
        if (
          cs.webkitBackgroundClip === 'text' ||
          (cs as any).backgroundClip === 'text'
        ) {
          continue;
        }

        const fgRaw = parseColor(cs.color);
        if (!fgRaw || fgRaw[3] < 0.75) continue;

        const bg = resolveEffectiveBg(el);
        const fg = blend(fgRaw, bg);
        const cr = ratio(fg, bg);

        const fontSize = parseFloat(cs.fontSize || '14');
        const fontWeight = parseInt(cs.fontWeight || '400', 10);
        const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const minRequired = isLarge ? 3.0 : 4.5;

        if (cr < minRequired) {
          failures.push(
            `<${el.tagName.toLowerCase()}> "${text.slice(0, 32)}" contrast=${cr.toFixed(2)}:1 (min ${minRequired}:1)`
          );
        }
      }

      // Solid Accent Fill Contrast Scanner (>= 4.5:1, ignore gradient/background-clip elements)
      const accentElements = Array.from(
        document.querySelectorAll(
          '.bg-accent, .glass-btn-primary, button.bg-sky-600, button.bg-sky-700, button.bg-cyan-400, button.bg-cyan-500, button.bg-cyan-600, button.bg-emerald-500, button.bg-emerald-600, button.bg-amber-400, button.bg-amber-500, button.bg-teal-500, button.bg-teal-600'
        )
      );
      const accentFailures: string[] = [];
      for (const el of accentElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const cs = window.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) {
          continue;
        }
        if (el.closest('[aria-disabled="true"], [disabled]')) continue;
        if (cs.webkitBackgroundClip === 'text' || (cs as any).backgroundClip === 'text') {
          continue;
        }
        const text = (el.textContent || '').trim();
        if (!text) continue;

        const bg = resolveEffectiveBg(el);
        const fgRaw = parseColor(cs.color);
        if (!fgRaw) continue;
        const fg = blend(fgRaw, bg);
        const cr = ratio(fg, bg);
        if (cr < 4.5) {
          accentFailures.push(
            `Accent element "${text.slice(0, 32)}" contrast=${cr.toFixed(2)}:1 (requires >= 4.5:1)`
          );
        }
      }

      // Header Control Clipping & Touch Target Scanner
      const headerClips: string[] = [];
      const mobileTouchTargetFailures: string[] = [];
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const controls = Array.from(headerEl.querySelectorAll('button, input, a'));
        for (const ctrl of controls) {
          const cs = window.getComputedStyle(ctrl);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
            continue;
          }
          const r = ctrl.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const label =
            (ctrl.textContent || '').trim() ||
            ctrl.getAttribute('aria-label') ||
            ctrl.getAttribute('placeholder') ||
            ctrl.tagName;
          if (r.left < -1 || r.right > window.innerWidth + 1) {
            headerClips.push(
              `Header control "${label.slice(0, 28)}" clipped: left=${Math.round(r.left)}, right=${Math.round(r.right)}, viewport=${window.innerWidth}`
            );
          }
          if (window.innerWidth < 640 && ctrl.tagName === 'BUTTON') {
            if (r.width < 43.5 || r.height < 43.5) {
              mobileTouchTargetFailures.push(
                `Header button "${label.slice(0, 24)}" touch target ${Math.round(r.width)}x${Math.round(r.height)}px < 44x44px`
              );
            }
          }
        }
      }

      // Check Executive Dashboard Title vs Data Quality / Business Health pill non-overlap
      let titleOverlapError: string | null = null;
      if (currentView === 'executive_dashboard') {
        const h1 = mainEl.querySelector('h1');
        const qualityPillBtn = Array.from(mainEl.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('DATA QUALITY')
        );
        const pillContainer = qualityPillBtn?.parentElement;
        if (h1 && pillContainer) {
          const r1 = h1.getBoundingClientRect();
          const r2 = pillContainer.getBoundingClientRect();
          const overlapsHorizontally = r1.left < r2.right - 2 && r2.left < r1.right - 2;
          const overlapsVertically = r1.top < r2.bottom - 2 && r2.top < r1.bottom - 2;
          if (overlapsHorizontally && overlapsVertically) {
            titleOverlapError = `H1 overlaps Health Pill`;
          }
        }
      }

      const hasUnifiedAttr =
        document.documentElement.getAttribute('data-unified-theme') === 'true';
      const horizontalOverflow =
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 4;

      return {
        hasUnifiedAttr,
        horizontalOverflow,
        failures,
        accentFailures,
        headerClips,
        mobileTouchTargetFailures,
        titleOverlapError,
      };
    },
    { expectedTheme: theme, currentView: viewId }
  );
}

async function navigateToViewAndAudit(page: Page, viewId: string, theme: 'dark' | 'light') {
  await page.evaluate(
    ({ tabId, thm }) => {
      localStorage.setItem('acuitybi_theme', thm);
      localStorage.setItem('dataanalytix_theme_pref', thm);
      if (thm === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark', 'dark');
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark', 'dark');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark', 'dark');
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark', 'dark');
      }
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: tabId }));
    },
    { tabId: viewId, thm: theme }
  );

  return auditCurrentPage(page, viewId, theme);
}

async function saveFinalScreenshot(page: Page, _testInfo: TestInfo, name: string) {
  fs.mkdirSync(FINAL_SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(FINAL_SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
}

test.describe('Comprehensive Browser Verification: Default Flags, 120-Char Titles, Mobile Drawer (375/414), Desktop (1280/1440/1920), & Exact Export Smoke Tests', () => {
  test('1. Default Flags Smoke Test: new visitor sees Unified Theme, Depth UI, 3D Hero, and 8-Chart Guide by default, and "Switch to Classic" persists in localStorage', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });

    const cookieBtn = page.locator(
      'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
    );
    if (await cookieBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cookieBtn.first().click().catch(() => {});
    }

    // Verify default flags are active for new visitors without any localStorage injection
    const attrs = await page.evaluate(() => ({
      unifiedTheme: document.documentElement.getAttribute('data-unified-theme'),
      depthUI: document.documentElement.getAttribute('data-depth-ui'),
    }));
    expect(attrs.unifiedTheme).toBe('true');
    expect(attrs.depthUI).toBe('true');

    // Verify header label and Switch to Classic button in navbar
    await expect(page.locator('header')).toContainText('DATA');
    await expect(page.locator('header')).toContainText('ANALYTIX');
    const switchClassicBtn = page.getByTestId('navbar-switch-classic');
    await expect(switchClassicBtn).toBeVisible();
    await expect(switchClassicBtn).toContainText('Switch to Classic');

    // Navigate to Landing view and check 3D hero scene
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'landing' }));
    });
    await expect(page.getByTestId('hero-3d-scene')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('h1').first()).toContainText('Raw data in.');
    await expect(page.locator('h1').first()).toContainText('Clear decisions out.');

    // Navigate to Dashboard Builder and verify 8-Chart Guide & PDF button
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'dashboard_builder' }));
    });
    const chartGuidePdfBtn = page.getByRole('button', {
      name: 'Download complete guide (PDF)',
      exact: true,
    });
    await expect(chartGuidePdfBtn).toBeVisible({ timeout: 8000 });

    // Click "Switch to Classic" in navbar and verify persistence in localStorage
    await switchClassicBtn.click();
    const afterSwitch = await page.evaluate(() => ({
      unifiedTheme: document.documentElement.getAttribute('data-unified-theme'),
      stored: JSON.parse(localStorage.getItem('dataanalytix_features') || '{}'),
    }));
    expect(afterSwitch.unifiedTheme).toBeNull();
    expect(afterSwitch.stored.unifiedTheme).toBe(false);
    expect(afterSwitch.stored.depthUI).toBe(false);
    expect(afterSwitch.stored.heroScene3D).toBe(false);
    expect(afterSwitch.stored.chartGuide).toBe(false);
  });

  test('2. 120-Character Title Clamping & Keyboard-Focusable Tooltip at 1280px, 1440px, and 375px', async ({
    page,
  }) => {
    const longName120 =
      'Enterprise_Global_Consolidated_Revenue_Margin_Telemetry_FY2025_Q4_Audited_Master_Warehouse_Production_Dataset_v12_Final_';
    expect(longName120.length).toBe(120);

    await initThemeTestPage(page, 'dark', 1440, 900);

    // Rename project to 120-char name via EditableDashboardTitle on Executive Dashboard
    const titleTrigger = page.getByTestId('clamped-dashboard-title').last();
    await titleTrigger.click();
    const renameInput = page.locator('input[placeholder="Type custom dashboard name..."]');
    await expect(renameInput).toBeVisible();
    await renameInput.fill(longName120);
    await renameInput.press('Enter');

    for (const width of [1280, 1440, 375] as const) {
      await page.setViewportSize({ width, height: 812 });

      for (const viewId of ['executive_dashboard', 'reports', 'dashboard_builder'] as const) {
        const audit = await navigateToViewAndAudit(page, viewId, 'dark');
        expect(audit.horizontalOverflow, `120-char title overflow on ${viewId} at ${width}px`).toBe(false);
        expect(audit.headerClips, `120-char header clip on ${viewId} at ${width}px`).toEqual([]);
        expect(audit.titleOverlapError, `120-char title overlap on ${viewId} at ${width}px`).toBeNull();

        const clampedEl = page.locator('main [data-testid="clamped-dashboard-title"]').first();
        await expect(clampedEl).toBeVisible();
        await expect(clampedEl).toHaveAttribute('title', longName120);
        await expect(clampedEl).toHaveAttribute('aria-label', longName120);

        // Focus keyboard-focusable trigger and verify Tooltip component renders full 120-char name
        const focusTarget = clampedEl.locator('..');
        await focusTarget.focus();
        const tooltip = page.locator('[role="tooltip"]').first();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(longName120);
        await page.keyboard.press('Escape');
      }
    }
  });

  test('3. Mobile Drawer (375x812 & 414x896, Dark & Light): opens via hamburger, traps/restores focus on Escape, closes on item click, >=44px touch targets, and zero horizontal scroll across all views', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180000);
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 414, height: 896 },
    ] as const) {
      for (const theme of ['dark', 'light'] as const) {
        await initThemeTestPage(page, theme, viewport.width, viewport.height);

        const hamburger = page.getByTestId('mobile-menu-toggle');
        const drawer = page.locator('#app-sidebar-drawer');

        // Drawer is closed initially on mobile
        await expect(drawer).toBeHidden();

        // Open drawer with hamburger, test focus trap & Escape focus restoration
        await hamburger.click();
        await expect(drawer).toBeVisible();
        await page.waitForTimeout(100);

        const focusInsideDrawer = await page.evaluate(() => {
          const d = document.getElementById('app-sidebar-drawer');
          return Boolean(d && d.contains(document.activeElement));
        });
        expect(focusInsideDrawer).toBe(true);

        await page.keyboard.press('Escape');
        await expect(drawer).toBeHidden();
        await page.waitForTimeout(100);
        const focusRestoredToHamburger = await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="mobile-menu-toggle"]');
          return document.activeElement === btn;
        });
        expect(focusRestoredToHamburger).toBe(true);

        // Navigate through views by opening drawer first and clicking each nav item
        const viewsToTestOnViewport =
          viewport.width === 375 && theme === 'dark'
            ? ALL_VIEWS
            : ['landing', 'executive_dashboard', 'dashboard_builder', 'reports', 'export_center', 'settings'];

        for (const viewId of viewsToTestOnViewport) {
          await hamburger.click();
          await expect(drawer).toBeVisible();

          const label = SIDEBAR_ITEM_LABELS[viewId];
          const navBtn = drawer.getByRole('button', { name: label, exact: true });
          await navBtn.scrollIntoViewIfNeeded();

          // Check mobile touch target >= 44px on the drawer button
          const navBox = await navBtn.boundingBox();
          expect(navBox?.height, `Drawer button "${label}" height >= 44px`).toBeGreaterThanOrEqual(43.5);

          await navBtn.click();
          // Drawer must close automatically on item click
          await expect(drawer).toBeHidden();

          const audit = await auditCurrentPage(page, viewId, theme);
          expect(audit.horizontalOverflow, `Horizontal overflow in ${viewId} (${theme}, ${viewport.width}px)`).toBe(false);
          expect(audit.headerClips, `Header clip in ${viewId} (${theme}, ${viewport.width}px)`).toEqual([]);
          expect(audit.mobileTouchTargetFailures, `Touch target <44px in ${viewId} (${theme}, ${viewport.width}px)`).toEqual([]);
          expect(audit.accentFailures, `Accent contrast in ${viewId} (${theme}, ${viewport.width}px)`).toEqual([]);
          expect(audit.failures, `Text contrast in ${viewId} (${theme}, ${viewport.width}px)`).toEqual([]);

          if (viewport.width === 375 && theme === 'light' && ['landing', 'executive_dashboard', 'reports', 'export_center'].includes(viewId)) {
            await saveFinalScreenshot(page, testInfo, `mobile-375px-light-${viewId}`);
          }
        }
      }
    }
  });

  for (const width of [1280, 1440, 1920] as const) {
    for (const theme of ['dark', 'light'] as const) {
      test(`4. Desktop ${width}px (${theme}): all 23 views pass header clipping, horizontal scroll, solid accent >= 4.5:1, and light-mode screenshots`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(180000);
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const txt = msg.text();
            if (
              !/firebase|firestore|network|Failed to load resource|ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED/i.test(
                txt
              )
            ) {
              consoleErrors.push(txt);
            }
          }
        });

        const height = width === 1920 ? 1080 : width === 1440 ? 900 : 800;
        await initThemeTestPage(page, theme, width, height);

        for (const viewId of ALL_VIEWS) {
          const audit = await navigateToViewAndAudit(page, viewId, theme);
          expect(audit.hasUnifiedAttr, `View ${viewId} should have data-unified-theme="true"`).toBe(true);
          expect(audit.horizontalOverflow, `View ${viewId} (${theme}, ${width}px) has horizontal overflow`).toBe(false);
          expect(audit.headerClips, `Header clipping in ${viewId} (${theme}, ${width}px)`).toEqual([]);
          expect(audit.titleOverlapError, `Title overlap in ${viewId} (${theme}, ${width}px)`).toBeNull();
          expect(audit.accentFailures, `Solid accent contrast failures in ${viewId} (${theme}, ${width}px)`).toEqual([]);
          expect(audit.failures, `Text contrast failures in ${viewId} (${theme}, ${width}px)`).toEqual([]);

          // Save ALL views in Light mode at 1440px into tests/screenshots/final/
          if (theme === 'light' && width === 1440) {
            await saveFinalScreenshot(page, testInfo, `light-1440px-${viewId}`);
          }
        }

        expect(consoleErrors, `Unexpected console errors at ${width}px (${theme})`).toEqual([]);
      });
    }
  }

  test('5. Download Smoke Tests: clicks exact export buttons and verifies %PDF and PK file headers', async ({
    page,
  }) => {
    await initThemeTestPage(page, 'dark', 1440, 900);

    // (a) Chart Guide PDF ("Download complete guide (PDF)" in Dashboard Builder)
    await navigateToViewAndAudit(page, 'dashboard_builder', 'dark');
    const chartGuideBtn = page.getByRole('button', {
      name: 'Download complete guide (PDF)',
      exact: true,
    });
    await expect(chartGuideBtn).toBeVisible();
    const [guidePdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      chartGuideBtn.click(),
    ]);
    const guidePdfBytes = fs.readFileSync((await guidePdfDownload.path())!);
    expect(guidePdfBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    // Navigate to Export Center for exact-label PDF, Bundle ZIP, Complete ZIP, and Excel exports
    await navigateToViewAndAudit(page, 'export_center', 'dark');

    // (b) Executive Report PDF ("Executive Report (PDF)")
    const reportPdfBtn = page.getByRole('button', {
      name: 'Executive Report (PDF)',
      exact: true,
    });
    await expect(reportPdfBtn).toBeVisible();
    const [reportPdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      reportPdfBtn.click(),
    ]);
    const reportPdfBytes = fs.readFileSync((await reportPdfDownload.path())!);
    expect(reportPdfBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    // (c) Dashboard Bundle ZIP ("Download Dashboard + Report Bundle")
    const bundleZipBtn = page.getByRole('button', {
      name: 'Download Dashboard + Report Bundle',
      exact: true,
    });
    await expect(bundleZipBtn).toBeVisible();
    const [bundleZipDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      bundleZipBtn.click(),
    ]);
    const bundleZipBytes = fs.readFileSync((await bundleZipDownload.path())!);
    expect(bundleZipBytes.subarray(0, 2).toString('utf8')).toBe('PK');

    // (d) Complete Project ZIP ("DOWNLOAD COMPLETE ZIP")
    const completeZipBtn = page.getByRole('button', {
      name: 'DOWNLOAD COMPLETE ZIP',
      exact: true,
    });
    await expect(completeZipBtn).toBeVisible();
    const [completeZipDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      completeZipBtn.click(),
    ]);
    const completeZipBytes = fs.readFileSync((await completeZipDownload.path())!);
    expect(completeZipBytes.subarray(0, 2).toString('utf8')).toBe('PK');

    // (e) Excel Workbook ("Download .XLSX Source")
    const excelBtn = page.getByRole('button', {
      name: 'Download .XLSX Source',
      exact: true,
    });
    await expect(excelBtn).toBeVisible();
    const [excelDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      excelBtn.click(),
    ]);
    const excelBytes = fs.readFileSync((await excelDownload.path())!);
    expect(excelBytes.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});
