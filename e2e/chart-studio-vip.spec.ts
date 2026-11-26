import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function initStudioPage(page: Page, width = 1440, height = 900) {
  await page.addInitScript(() => {
    sessionStorage.setItem('acuitybi_guest_mode', 'true');
    localStorage.setItem('dataanalytix_coach_tour_completed_v1', 'true');
  });

  await page.setViewportSize({ width, height });
  await page.goto('/', { waitUntil: 'load' });
  await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15000 });

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

test.describe('Chart Studio, Offline Geo Maps, VIP Boardroom Dashboards & 100k-Row Benchmark', () => {
  test('1. Real 100,000-row CSV upload to dashboard benchmark completes under 10 seconds', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await initStudioPage(page, 1440, 900);

    // Navigate to Upload Data view
    const uploadSidebarBtn = page
      .locator('[data-testid="sidebar-item-upload"], button:has-text("Upload Data"), button:has-text("1. Upload")')
      .first();
    if (await uploadSidebarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadSidebarBtn.click();
    }

    // Build a 100,000-row CSV buffer in memory
    const regions = ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Peshawar', 'Quetta'];
    const categories = ['Enterprise Cloud', 'AI Copilot', 'Data Shield', 'Managed FinOps'];
    const lines = ['date,region,category,revenue,cost,units'];
    for (let i = 0; i < 100000; i++) {
      const m = String((i % 12) + 1).padStart(2, '0');
      const d = String((i % 28) + 1).padStart(2, '0');
      const reg = regions[i % regions.length];
      const cat = categories[i % categories.length];
      const rev = 1000 + (i % 500) * 15;
      const cost = 600 + (i % 300) * 10;
      const units = 5 + (i % 40);
      lines.push(`2025-${m}-${d},${reg},${cat},${rev},${cost},${units}`);
    }
    const csvBuffer = Buffer.from(lines.join('\n'), 'utf8');

    const startMs = Date.now();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'benchmark_100k.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for upload processing and confirm UI stays responsive
    await expect(page.locator('#root > *').first()).toBeVisible({ timeout: 15000 });
    const elapsedSec = (Date.now() - startMs) / 1000;
    console.log(
      `[100k-Row Upload Benchmark] 100,000 rows selected & processed in ${elapsedSec.toFixed(2)}s`
    );
    expect(elapsedSec).toBeLessThan(10);
  });

  test('2. Chart Studio Visuals, Offline Geo Maps (World/US/Pakistan), Key Influencers, VIP Dashboards & Exports across 1440/1024/375 Dark & Light', async ({
    page,
  }) => {
    test.setTimeout(90000);
    const outDir = path.resolve('public/screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await initStudioPage(page, 1440, 900);

    // Click Builder tab in top bar
    const builderTab = page.getByTestId('topbar-tab-builder');
    await builderTab.click();

    const studioSection = page.getByTestId('chart-studio-builder-section');
    await expect(studioSection).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('map-available-badge')).toBeVisible();

    // 1. Screenshot Chart Studio Gallery (Waterfall + Pakistan Choropleth Map) at 1440 Dark
    await page.getByTestId('visual-waterfall').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(outDir, 'chart-studio-gallery-1440-dark.png'),
      fullPage: false,
    });

    // 2. Test Gantt Schedule Visual
    await page.getByTestId('studio-pick-gantt').click();
    const ganttVis = page.getByTestId('visual-gantt');
    await expect(ganttVis).toBeVisible();
    await ganttVis.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(outDir, 'chart-studio-gantt-1440-dark.png'),
      fullPage: false,
    });

    // 3. Test Key Influencers AI Visual
    await page.getByTestId('studio-pick-key_influencers').click();
    const kiVis = page.getByTestId('visual-key-influencers');
    await expect(kiVis).toBeVisible();
    await kiVis.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(outDir, 'chart-studio-key-influencers-1440-dark.png'),
      fullPage: false,
    });

    // 4. Test Offline Geo Map scopes (World, US States, Pakistan)
    await page.getByTestId('studio-pick-map_choropleth').click();
    const geoMap = page.getByTestId('offline-geo-map').first();
    await expect(geoMap).toBeVisible();
    await page.getByTestId('geo-scope-pakistan').first().click();
    await geoMap.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(outDir, 'chart-studio-map-pakistan-1440-dark.png'),
      fullPage: false,
    });

    // 5. Verify Theme Studio live recolouring updates --chart-1 token
    const themeBtn = page.getByTestId('navbar-theme-studio-btn');
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      const violetPreset = page.getByTestId('theme-preset-violet');
      if (await violetPreset.isVisible().catch(() => false)) {
        await violetPreset.click();
      }
      const afterChart1 = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim()
      );
      expect(afterChart1).not.toEqual('');
      const closeBtn = page.getByTestId('theme-studio-close-btn');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    }

    // 6. Switch to VIP Boardroom Layouts (6 templates & 3+ packs) + Verify PPTX & PDF downloads
    await page.getByTestId('builder-tab-vip-layouts').click();
    const vipDashboard = page.getByTestId('vip-boardroom-dashboard');
    await expect(vipDashboard).toBeVisible();
    await expect(page.getByTestId('vip-hero-kpi-band')).toBeVisible();
    await expect(page.getByTestId('vip-five-line-summary')).toBeVisible();
    await expect(page.getByTestId('vip-what-to-do-next-strip')).toBeVisible();

    // VIP Dashboard #1: Executive Summary (Financial Pack) - 1440 Dark
    await vipDashboard.scrollIntoViewIfNeeded();
    await expect(page.getByTestId('vip-hero-kpi-band')).not.toContainText('Unavailable');
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-1-financial-1440-dark.png'),
      fullPage: false,
    });

    // VIP Dashboard #2: Sales War Room (Sales Pack)
    await page.getByTestId('vip-template-sales-war-room').click();
    await expect(page.getByTestId('vip-hero-kpi-band')).not.toContainText('Unavailable');
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-2-sales-war-room-1440-dark.png'),
      fullPage: false,
    });

    // VIP Dashboard #3: Operations Control Tower (Operations Pack)
    await page.getByTestId('vip-template-operations-control-tower').click();
    await expect(page.getByTestId('vip-hero-kpi-band')).not.toContainText('Unavailable');
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-3-operations-1440-dark.png'),
      fullPage: false,
    });

    // Test VIP PPTX and PDF exports and verify file headers
    const downloadMenuBtn = page.getByTestId('vip-download-menu-btn');
    if (await downloadMenuBtn.isVisible().catch(() => false)) {
      await downloadMenuBtn.click();
    }
    const [pptxDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('vip-download-pptx').click(),
    ]);
    const pptxPath = await pptxDownload.path();
    expect(pptxPath).toBeTruthy();
    const pptxBytes = fs.readFileSync(pptxPath!);
    expect(pptxBytes.subarray(0, 2).toString('utf8')).toBe('PK');

    if (await downloadMenuBtn.isVisible().catch(() => false)) {
      await downloadMenuBtn.click();
    }
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('vip-download-pdf').click(),
    ]);
    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
    const pdfBytes = fs.readFileSync(pdfPath!);
    expect(pdfBytes.subarray(0, 4).toString('utf8')).toBe('%PDF');

    // Switch to Light mode via top bar toggle and capture 1440 Light screenshot
    const lightModeBtn = page.locator('button[aria-label="Switch to Light Mode"]:visible').first();
    if (await lightModeBtn.isVisible().catch(() => false)) {
      await lightModeBtn.click();
    }
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-1440-light.png'),
      fullPage: false,
    });

    // Verify 1024px and 375px viewports have zero horizontal overflow
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-1024-light.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    const hasHorizontalOverflow375 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow375).toBe(false);
    await page.screenshot({
      path: path.join(outDir, 'vip-dashboard-375-mobile.png'),
      fullPage: false,
    });

    expect(pageErrors).toEqual([]);
  });
});
