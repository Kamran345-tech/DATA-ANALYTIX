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

  test('5. Phase 1 + Phase 2 + Phase 3 Verification: single dataset name, body-font description toggle, favorable OTIF sparkline, shared filters & KPI parity across Executive and Pack pages, 3-step Download Center, and 14-pack + multi-viewport screenshot suite', async ({
    page,
  }) => {
    test.setTimeout(180000);
    const outDir = 'public/assets/qa-phase123';
    fs.mkdirSync(outDir, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await bootstrapPacksWorkspace(page, { theme: 'dark' });

    // Navigate to Analytics Packs
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
    });
    await expect(page.getByTestId('analytics-packs-view')).toBeVisible({ timeout: 10000 });

    // Phase 2: Verify PagePurposeBar on Analytics Packs
    await expect(page.getByTestId('page-purpose-bar-analytics_packs')).toBeVisible();
    await expect(page.getByTestId('page-purpose-subtitle')).toContainText('Domain dashboards, KPIs, and reports');

    // Open Operations & Supply Chain pack with sample data to verify Phase 1.1, 1.2, 1.3, 1.4
    await page.getByTestId('pack-sample-btn-operations').click();
    await expect(page.getByTestId('pack-sticky-switch-bar')).toBeVisible();

    // Phase 1.1: Dataset name is shown ONCE ("Operations & Supply Chain Sample Dataset"), not prefixed twice
    const headerTitleInput = page.locator('[data-testid="active-pack-dashboard"]').getByText('Operations & Supply Chain Sample Dataset');
    await expect(headerTitleInput.first()).toBeVisible();
    const duplicatedTitle = page.locator('[data-testid="active-pack-dashboard"]').getByText('Operations & Supply Chain / Operations & Supply Chain Sample Dataset');
    await expect(duplicatedTitle).toHaveCount(0);

    // Phase 1.2: Full-width body font description with 2-line clamp and "more"/"less" toggle
    const desc = page.getByTestId('pack-header-description');
    await expect(desc).toBeVisible();
    await expect(desc).toHaveClass(/font-sans/);
    await expect(desc).toHaveClass(/line-clamp-2/);
    const moreBtn = page.getByTestId('pack-description-more-btn');
    await expect(moreBtn).toHaveText('more');
    await moreBtn.click();
    await expect(moreBtn).toHaveText('less');
    await moreBtn.click();

    // Phase 1.3 & 1.4: OTIF label has 2-line wrap (line-clamp-2) and 95.4% OTIF shows favorable green sparkline (data-favorable="true")
    const otifLabel = page.getByTestId('kpi-label-otif_rate');
    await expect(otifLabel).toBeVisible();
    await expect(otifLabel).toHaveClass(/line-clamp-2/);
    const otifTrendBadge = page.getByTestId('kpi-trend-otif_rate');
    await expect(otifTrendBadge).toHaveAttribute('data-favorable', 'true');
    const otifSparkPath = page.getByTestId('kpi-sparkline-path-otif_rate');
    await expect(otifSparkPath).toHaveAttribute('stroke', 'var(--success)');

    // Phase 1.6: Capture all 14 pack dashboards with their own sample data
    for (const packId of ALL_PACK_IDS) {
      await page.getByTestId(`pack-chip-${packId}`).click();
      await expect(page.getByTestId('pack-dashboard-heading')).toBeVisible();
      await page.waitForTimeout(120);
      await page.screenshot({
        path: `${outDir}/pack_${packId}_1440_dark.png`,
        fullPage: false,
      });
    }

    // Switch back to Operations pack and verify Phase 2 KPI parity & shared filter across Analytics Packs and Executive Dashboard
    await page.getByTestId('pack-chip-operations').click();
    await expect(page.getByTestId('kpi-value-otif_rate')).toHaveText('95.4%');

    // Navigate to Executive Dashboard via PagePurposeBar related link
    await page.getByTestId('purpose-related-link-executive_dashboard').click();
    await expect(page.getByTestId('page-purpose-bar-executive_dashboard')).toBeVisible();
    await expect(page.getByTestId('exec-kpi-value-otif_rate')).toHaveText('95.4%');

    // Apply a shared filter on Executive Dashboard and verify it persists on Analytics Packs, Dashboard Builder, and Executive Reports
    const sharedSearchInput = page.getByTestId('shared-filter-search-input').first();
    await sharedSearchInput.fill('Chicago');
    await expect(page.getByTestId('active-filter-chip').first()).toContainText('Chicago');

    const filteredExecOtif = await page.getByTestId('exec-kpi-value-otif_rate').innerText();

    // Check Analytics Packs shows the exact same active filter chip and same filtered KPI value
    await page.getByTestId('purpose-related-link-analytics_packs').click();
    await expect(page.getByTestId('active-filter-chip').first()).toContainText('Chicago');
    await expect(page.getByTestId('kpi-value-otif_rate')).toHaveText(filteredExecOtif);

    // Clear shared filter from Analytics Packs
    await page.getByTestId('shared-filter-clear-all').first().click();
    await expect(page.getByTestId('kpi-value-otif_rate')).toHaveText('95.4%');

    // Phase 3: Verify 3-Step Unified Download Center Dialog
    const dlTrigger = page.getByTestId('download-menu-trigger-analytics_pack').first();
    await dlTrigger.click();
    await expect(page.getByTestId('download-center-stepper')).toBeVisible();
    await expect(page.getByTestId('download-center-step-1')).toBeVisible();

    // Advance to Step 2 ("Which report?")
    await page.getByTestId('download-configure-pack_report_pdf').click();
    await expect(page.getByTestId('download-center-step-2')).toBeVisible();
    await page.getByTestId('download-audience-manager').click();

    // Advance to Step 3 ("Download + progress + Copy summary")
    await page.getByTestId('download-center-next-step-3').click();
    await expect(page.getByTestId('download-center-step-3')).toBeVisible();
    const stdFilename = await page.getByTestId('download-center-filename').innerText();
    expect(stdFilename).toMatch(/_operations_pack-report-pdf_\d{4}-\d{2}-\d{2}\.pdf$/);

    await page.getByTestId('download-center-copy-summary').click();
    const [step3Download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByTestId('download-center-confirm-download').click(),
    ]);
    expect(step3Download.suggestedFilename()).toBe(stdFilename);

    // Multi-viewport screenshot matrix (1440, 1024, 375 in dark + light) for Operations Dashboard & Download Center
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 800 },
      { width: 375, height: 812 },
    ] as const;

    // Ensure Operations Pack Dashboard is open (catalog collapsed) for the dashboard viewport matrix
    const jumpBtn = page.getByTestId('toggle-pack-catalog-btn');
    if (await jumpBtn.isVisible().catch(() => false)) {
      await jumpBtn.click();
    }

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        localStorage.setItem('acuitybi_theme', t);
        localStorage.setItem('dataanalytix_theme_pref', t);
        const root = document.documentElement;
        const body = document.body;
        const isLight = t === 'light';
        root.style.colorScheme = isLight ? 'light' : 'dark';
        if (isLight) {
          root.classList.add('theme-light');
          root.classList.remove('dark', 'theme-dark');
          body.classList.add('theme-light');
          body.classList.remove('dark', 'theme-dark');
        } else {
          root.classList.add('dark', 'theme-dark');
          root.classList.remove('theme-light');
          body.classList.add('dark', 'theme-dark');
          body.classList.remove('theme-light');
        }
      }, theme);
      await page.waitForTimeout(150);

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/phase123_operations_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }

      // Also screenshot the 3-step Download Center open at 1440
      await page.setViewportSize({ width: 1440, height: 900 });
      await dlTrigger.click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${outDir}/phase3_download_center_step1_1440_${theme}.png`,
        fullPage: false,
      });
      await page.getByTestId('download-center-step-tab-2').click();
      await page.waitForTimeout(120);
      await page.screenshot({
        path: `${outDir}/phase3_download_center_step2_1440_${theme}.png`,
        fullPage: false,
      });
      await page.getByTestId('download-center-step-tab-3').click();
      await page.waitForTimeout(120);
      await page.screenshot({
        path: `${outDir}/phase3_download_center_step3_1440_${theme}.png`,
        fullPage: false,
      });
      await page.keyboard.press('Escape');
    }
  });

  test('6. Phase 4 Verification: 16:9 PPTX Presentation Generator, 3 Rendered Slides Storyboard, Audience Switcher, and Multi-Viewport Screenshots', async ({
    page,
  }) => {
    test.setTimeout(120000);
    const outDir = 'public/assets/qa-phase4';
    fs.mkdirSync(outDir, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await bootstrapPacksWorkspace(page, { theme: 'dark' });

    // Load Operations & Supply Chain sample dataset first via Analytics Packs
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
    });
    await expect(page.getByTestId('analytics-packs-view')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('pack-sample-btn-operations').click();
    await expect(page.getByTestId('pack-sticky-switch-bar')).toBeVisible();

    // Navigate to Executive Reports via PagePurposeBar related link
    await page.getByTestId('purpose-related-link-reports').click();
    await expect(page.getByTestId('page-purpose-bar-reports')).toBeVisible();
    await expect(page.getByTestId('pptx-slide-deck-preview-panel')).toBeVisible();

    // Verify all 3 rendered slides are visible in the 3-Slide Storyboard
    const slide1 = page.getByTestId('rendered-slide-1');
    const slide2 = page.getByTestId('rendered-slide-2');
    const slide3 = page.getByTestId('rendered-slide-3');
    await expect(slide1).toBeVisible();
    await expect(slide2).toBeVisible();
    await expect(slide3).toBeVisible();

    await expect(slide1).toContainText('95.4%');
    await expect(slide2).toContainText('KPI Scorecard');
    await expect(slide3).toContainText('4-Lens Strategic Directives');

    // Capture the 3 individual rendered slides
    await slide1.screenshot({ path: `${outDir}/phase4_rendered_slide_1_dark.png` });
    await slide2.screenshot({ path: `${outDir}/phase4_rendered_slide_2_dark.png` });
    await slide3.screenshot({ path: `${outDir}/phase4_rendered_slide_3_dark.png` });

    // Verify Audience template switcher (Board -> Manager -> Analyst)
    await page.getByTestId('pptx-preview-audience-board').click();
    await expect(slide1).toContainText('BOARD DECK');
    await page.getByTestId('pptx-preview-audience-analyst').click();
    await expect(slide1).toContainText('ANALYST DECK');
    await page.getByTestId('pptx-preview-audience-manager').click();
    await expect(slide1).toContainText('MANAGER DECK');

    // Multi-viewport screenshot matrix (1440, 1024, 375 in dark + light) & 3 individual rendered slides
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 800 },
      { width: 375, height: 812 },
    ] as const;

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        localStorage.setItem('acuitybi_theme', t);
        localStorage.setItem('dataanalytix_theme_pref', t);
        const root = document.documentElement;
        const body = document.body;
        const isLight = t === 'light';
        root.style.colorScheme = isLight ? 'light' : 'dark';
        if (isLight) {
          root.classList.add('theme-light');
          root.classList.remove('dark', 'theme-dark');
          body.classList.add('theme-light');
          body.classList.remove('dark', 'theme-dark');
        } else {
          root.classList.add('dark', 'theme-dark');
          root.classList.remove('theme-light');
          body.classList.add('dark', 'theme-dark');
          body.classList.remove('theme-light');
        }
      }, theme);
      await page.waitForTimeout(150);

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(120);
      await slide1.screenshot({ path: `${outDir}/phase4_rendered_slide_1_${theme}.png` });
      await slide2.screenshot({ path: `${outDir}/phase4_rendered_slide_2_${theme}.png` });
      await slide3.screenshot({ path: `${outDir}/phase4_rendered_slide_3_${theme}.png` });

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${outDir}/phase4_reports_pptx_${vp.width}_${theme}.png`,
          fullPage: false,
        });
      }
    }

    // Trigger real .PPTX download at the end
    await page.setViewportSize({ width: 1440, height: 900 });
    const [pptxDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.getByTestId('pptx-preview-download-btn').click(),
    ]);
    expect(pptxDownload.suggestedFilename()).toMatch(/_operations_presentation-pptx_\d{4}-\d{2}-\d{2}\.pptx$/);
  });
});




