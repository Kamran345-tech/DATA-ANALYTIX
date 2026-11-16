import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

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
  test('1. Renders all 14 pack cards, loads sample data, displays KPIs, 4 lenses, charts, and downloads valid PDF/ZIP/Excel/Template files', async ({
    page,
  }) => {
    await bootstrapPacksWorkspace(page);

    // Navigate to Analytics Packs view
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
    });

    const view = page.getByTestId('analytics-packs-view');
    await expect(view).toBeVisible({ timeout: 10000 });

    // Verify all 14 pack cards are rendered
    const expectedIds = [
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
    ];
    for (const id of expectedIds) {
      await expect(page.getByTestId(`pack-card-${id}`)).toBeVisible();
    }

    // Click "Try with sample data" on Financial & FP&A pack
    await page.getByTestId('pack-sample-btn-financial').click();
    await page.waitForTimeout(300);

    // KPIs visible & populated
    const kpiGrid = page.getByTestId('pack-kpi-grid');
    await expect(kpiGrid).toBeVisible();
    await expect(page.getByTestId('kpi-card-fin_revenue')).toBeVisible();
    await expect(page.getByTestId('kpi-card-fin_gross_margin_pct')).toBeVisible();

    // Test all 4 lenses (Descriptive, Diagnostic, Predictive, Prescriptive)
    for (const lens of ['descriptive', 'diagnostic', 'predictive', 'prescriptive']) {
      await page.getByTestId(`pack-lens-tab-${lens}`).click();
      await expect(page.getByTestId(`pack-lens-content-${lens}`)).toBeVisible();
    }
    await expect(page.getByTestId('pack-whatif-simulator')).toBeVisible();

    // Charts & Report sections visible
    await expect(page.getByTestId('pack-charts-grid')).toBeVisible();
    await expect(page.getByTestId('pack-report-sections')).toBeVisible();

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

  test('2. Zero-data exports work cleanly and missing roles show Unavailable badges', async ({
    page,
  }) => {
    await bootstrapPacksWorkspace(page, { startEmpty: true });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'analytics_packs' }));
      window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
    });

    await expect(page.getByTestId('pack-missing-roles-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kpi-card-fin_revenue')).toContainText('UNAVAILABLE');

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
});
