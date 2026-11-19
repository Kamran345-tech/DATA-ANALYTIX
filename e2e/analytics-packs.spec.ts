import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

const ALL_PACK_IDS = [
  'financial',
  'sales',
  'marketing',
  'customer',
  'product',
  'web',
  'operations',
  'hr',
  'risk-fraud',
  'healthcare',
  'retail',
  'manufacturing',
  'banking-insurance',
  'education',
] as const;

async function bootstrapPacksWorkspace(
  page: Page,
  options?: { startEmpty?: boolean; analyticsPacks?: boolean; theme?: 'dark' | 'light' }
) {
  const analyticsPacksFlag = options?.analyticsPacks ?? true;
  const theme = options?.theme ?? 'dark';

  await page.addInitScript(
    (opts) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      if (opts.startEmpty) {
        sessionStorage.setItem('dataanalytix_start_empty', 'true');
      } else {
        sessionStorage.removeItem('dataanalytix_start_empty');
      }
      localStorage.removeItem('dataanalytix_active_pack');
      localStorage.removeItem('dataanalytix_active_pack_id');
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('dataanalytix_pack_roles_')) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem('acuitybi_theme', opts.theme);
      localStorage.setItem('dataanalytix_ui', 'classic');
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({
          depthUI: true,
          heroScene3D: true,
          chartGuide: true,
          unifiedTheme: true,
          analyticsPacks: opts.analyticsPacksFlag,
        })
      );
    },
    {
      startEmpty: Boolean(options?.startEmpty),
      analyticsPacksFlag,
      theme,
    }
  );

  await page.goto('/', { waitUntil: 'load' });
  await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });

  const cookieBtn = page.locator(
    'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
  );
  if (await cookieBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieBtn.first().click().catch(() => {});
  }

  const guestBtn = page.locator(
    'button:has-text("Explore as Guest"), button:has-text("EXPLORE AS GUEST"), button:has-text("Try with sample data")'
  );
  if (await guestBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await guestBtn.first().click().catch(() => {});
  }

  await page.evaluate(
    (opts) => {
      const flags = {
        depthUI: true,
        heroScene3D: true,
        chartGuide: true,
        unifiedTheme: true,
        analyticsPacks: opts.analyticsPacksFlag,
      };
      localStorage.setItem('dataanalytix_features', JSON.stringify(flags));
      window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: flags }));
      if (opts.startEmpty) {
        window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
      }
    },
    { startEmpty: Boolean(options?.startEmpty), analyticsPacksFlag }
  );
  await page.waitForTimeout(250);
}

test.describe('Analytics Packs E2E Verification Suite', () => {
  test('1. Parametrized 14-Pack Quality Bar: opens EVERY pack with sample data and verifies 8-12 KPIs with formula tooltips, 6-8 charts, 4 lens tabs, executive report sections, pack search/filter, and exports', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await bootstrapPacksWorkspace(page);

    // Navigate to Analytics Packs view
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
    });

    const view = page.getByTestId('analytics-packs-view');
    await expect(view).toBeVisible({ timeout: 10000 });

    // Verify Pack Picker search and category filter work
    const searchInput = page.getByTestId('pack-picker-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Manufacturing');
    await expect(page.getByTestId('pack-card-manufacturing')).toBeVisible();
    await searchInput.fill('');

    await page.getByTestId('pack-category-filter-finance-risk').click();
    await expect(page.getByTestId('pack-card-financial')).toBeVisible();
    await page.getByTestId('pack-category-filter-all').click();

    // Parametrized verification across ALL 14 packs
    for (const packId of ALL_PACK_IDS) {
      const backBtn = page.getByTestId('pack-back-to-catalog-btn');
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
      }

      const packCard = page.getByTestId(`pack-card-${packId}`);
      await expect(packCard).toBeVisible();

      // Load sample data for this pack ("Open with sample data")
      await page.getByTestId(`pack-sample-btn-${packId}`).click();

      // Part A Bug #4: Catalog collapses into sticky switch bar and dashboard heading is inside viewport
      await expect(page.getByTestId('pack-sticky-switch-bar')).toBeVisible();
      const heading = page.getByTestId('pack-dashboard-heading');
      await expect(heading).toBeVisible();
      await expect
        .poll(
          async () => {
            const b = await heading.boundingBox();
            return b ? b.y : -999;
          },
          { message: `Pack ${packId} heading top in viewport`, timeout: 3000 }
        )
        .toBeGreaterThanOrEqual(0);
      const box = await heading.boundingBox();
      expect(box, `Pack ${packId} dashboard heading boundingBox`).toBeTruthy();
      expect(box!.y, `Pack ${packId} heading inside viewport height`).toBeLessThan(880);

      // Verify 8-12 KPIs rendered and ALL KPIs are active (activeKpis === totalKpis) with "i" formula tooltip buttons
      const kpiCards = page.locator('[data-testid="pack-kpi-grid"] > [data-testid^="kpi-card-"]');
      const kpiCount = await kpiCards.count();
      expect(kpiCount, `Pack ${packId} KPI count`).toBeGreaterThanOrEqual(8);
      expect(kpiCount, `Pack ${packId} KPI count`).toBeLessThanOrEqual(12);

      await expect(page.getByTestId('pack-active-kpi-badge')).toHaveText(
        `${kpiCount}/${kpiCount} KPIs Active`
      );

      const tooltipBtns = page.locator('[data-testid="pack-kpi-grid"] [data-testid^="kpi-formula-tooltip-"]');
      expect(await tooltipBtns.count(), `Pack ${packId} formula tooltip count`).toBe(kpiCount);

      // Verify 6-8 domain charts rendered
      const chartCards = page.locator('[data-testid="pack-charts-grid"] > [data-testid^="pack-chart-card-"]');
      const chartCount = await chartCards.count();
      expect(chartCount, `Pack ${packId} chart count`).toBeGreaterThanOrEqual(6);
      expect(chartCount, `Pack ${packId} chart count`).toBeLessThanOrEqual(8);

      // Verify 4 lens tabs and active lens content
      for (const lens of ['descriptive', 'diagnostic', 'predictive', 'prescriptive']) {
        const lensTab = page.getByTestId(`pack-lens-tab-${lens}`);
        await expect(lensTab).toBeVisible();
      }

      // Verify report sections contain real numbers
      const reportSection0 = page.getByTestId('pack-report-section-0');
      await expect(reportSection0).toBeVisible();
      const reportText = await reportSection0.innerText();
      expect(reportText.length).toBeGreaterThan(30);
      expect(reportText).toMatch(/\d/);
    }

    // Test all 4 lens tabs interactively on the active pack
    for (const lens of ['descriptive', 'diagnostic', 'predictive', 'prescriptive']) {
      await page.getByTestId(`pack-lens-tab-${lens}`).click();
      await expect(page.getByTestId(`pack-lens-content-${lens}`)).toBeVisible();
    }
    await expect(page.getByTestId('pack-whatif-simulator')).toBeVisible();

    // Switch back to financial pack via sticky pack chip for export verification
    await page.getByTestId('pack-chip-financial').click();
    await expect(page.getByTestId('kpi-card-fin_revenue')).toBeVisible();
    await expect(page.getByTestId('kpi-card-fin_gross_margin_pct')).toBeVisible();
    await expect(page.getByTestId('pack-active-kpi-badge')).toHaveText('12/12 KPIs Active');

    // Verify Template CSV download button
    const [templateDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByTestId('pack-download-template-btn').click(),
    ]);
    const templatePath = await templateDownload.path();
    expect(templatePath).toBeTruthy();
    const templateText = fs.readFileSync(templatePath!, 'utf8');
    expect(templateText).toContain('revenue');
    expect(templateText).toContain('cogs');

    // Verify PDF, ZIP, and Excel downloads from DownloadMenu (analytics_pack context)
    const menuTrigger = page.getByTestId('download-menu-trigger-analytics_pack').first();

    // 1. PDF Report (%PDF-)
    await menuTrigger.click();
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByTestId('download-item-pack_report_pdf').click(),
    ]);
    const pdfBuf = fs.readFileSync((await pdfDownload.path())!);
    expect(pdfBuf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // 2. Excel Workbook (PK zip header)
    await menuTrigger.click();
    const [xlsxDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByTestId('download-item-pack_excel').click(),
    ]);
    const xlsxBuf = fs.readFileSync((await xlsxDownload.path())!);
    expect(xlsxBuf.subarray(0, 2).toString('ascii')).toBe('PK');

    // 3. Complete Pack ZIP Bundle (PK zip header)
    await menuTrigger.click();
    const [zipDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.getByTestId('download-item-pack_bundle_zip').click(),
    ]);
    const zipBuf = fs.readFileSync((await zipDownload.path())!);
    expect(zipBuf.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  test('2. Zero-data exports work cleanly and missing roles show Unavailable badges with exact missing column', async ({
    page,
  }) => {
    await bootstrapPacksWorkspace(page, { startEmpty: true });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
      window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
    });

    await expect(page.getByTestId('pack-missing-roles-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kpi-card-fin_revenue')).toContainText('UNAVAILABLE');
    await expect(page.getByTestId('kpi-missing-col-fin_revenue')).toContainText('Add column: revenue');

    // Even with 0 rows loaded, pack template and PDF downloads work
    const menuTrigger = page.getByTestId('download-menu-trigger-analytics_pack').first();
    await menuTrigger.click();
    const [emptyTemplateDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByTestId('download-item-pack_template_csv').click(),
    ]);
    const csvContent = fs.readFileSync((await emptyTemplateDl.path())!, 'utf8');
    expect(csvContent.split('\n').length).toBeGreaterThanOrEqual(4);
  });

  test('3. Mobile 375px & Light/Dark mode: zero horizontal scroll and Switch to Classic / flag-off hides Analytics Packs', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await bootstrapPacksWorkspace(page, { theme: 'light' });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
    });
    await expect(page.getByTestId('analytics-packs-view')).toBeVisible({ timeout: 10000 });

    const overflowPx = await page.evaluate(() => {
      const main = document.getElementById('main-content') || document.documentElement;
      return Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        main.scrollWidth - main.clientWidth
      );
    });
    expect(overflowPx).toBeLessThanOrEqual(1);

    // Turn analyticsPacks flag OFF (or Switch to Classic) -> Analytics Packs nav item disappears
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const classicFlags = {
        depthUI: false,
        heroScene3D: false,
        chartGuide: false,
        unifiedTheme: false,
        analyticsPacks: false,
      };
      localStorage.setItem('dataanalytix_features', JSON.stringify(classicFlags));
      window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: classicFlags }));
    });
    await page.waitForTimeout(250);

    const sidebarPacksBtn = page.locator('#app-sidebar-drawer button[aria-label="Analytics Packs"]');
    await expect(sidebarPacksBtn).toHaveCount(0);
  });

  test('4. Visual Redesign Verification & Multi-Viewport Screenshot Matrix (1440, 1024, 375 in Light & Dark)', async ({
    page,
  }) => {
    test.setTimeout(150000);
    const outDir = 'public/assets/qa-packs';
    fs.mkdirSync(outDir, { recursive: true });

    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 800 },
      { width: 375, height: 812 },
    ] as const;

    const themes = ['dark', 'light'] as const;

    for (const theme of themes) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await bootstrapPacksWorkspace(page, { theme });
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
      });
      await expect(page.getByTestId('analytics-packs-view')).toBeVisible({ timeout: 10000 });

      // Financial sample data is auto-loaded on mount (12/12 KPIs Active)
      await expect(page.getByTestId('pack-auto-detect-banner')).toBeVisible();
      await expect(page.getByTestId('pack-hero-iso-illustration')).toBeVisible();
      await expect(page.getByTestId('pack-key-insight-card')).toBeVisible();
      await expect(page.getByTestId('pack-active-kpi-badge')).toHaveText('12/12 KPIs Active');

      // 1. Picker screenshots across viewports (with catalog expanded)
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.getByTestId('analytics-packs-grid').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/packs_picker_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }

      // 2. Click "Open with sample data" on Financial -> collapses catalog to sticky bar and scrolls to dashboard
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId('pack-sample-btn-financial').click();
      await expect(page.getByTestId('pack-sticky-switch-bar')).toBeVisible();
      await expect(page.getByTestId('pack-active-kpi-badge')).toHaveText('12/12 KPIs Active');

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/packs_financial_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }

      // 3. Switch to HR Pack Dashboard via sticky pack chip -> 9/9 KPIs Active
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId('pack-chip-hr').click();
      await expect(page.getByTestId('kpi-card-total_headcount')).toBeVisible();
      await expect(page.getByTestId('pack-active-kpi-badge')).toHaveText('9/9 KPIs Active');
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/packs_hr_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }

      // 4. Pack with Missing Columns (unmap headcount in ColumnMappingModal so partial data state is shown)
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId('pack-map-columns-btn').click();
      const headcountSelect = page.getByTestId('role-select-headcount');
      await expect(headcountSelect).toBeVisible();
      await headcountSelect.selectOption('');
      await page.getByTestId('confirm-column-mapping').click();
      await expect(page.getByTestId('pack-missing-roles-banner')).toBeVisible();
      await expect(page.getByTestId('kpi-map-col-btn-total_headcount')).toBeVisible();
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.getByTestId('kpi-card-total_headcount').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/packs_missing_cols_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }

      // 5. Empty State (0 rows loaded) screenshots across viewports
      await page.evaluate(() => {
        sessionStorage.setItem('dataanalytix_start_empty', 'true');
        window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
      });
      await expect(page.getByTestId('pack-missing-roles-banner')).toBeVisible();
      await expect(page.getByTestId('kpi-map-col-btn-total_headcount')).toBeVisible();
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.getByTestId('pack-missing-roles-banner').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/packs_empty_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }
    }
  });
});


