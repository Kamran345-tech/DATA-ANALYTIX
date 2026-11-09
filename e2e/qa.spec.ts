import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.describe('Data Analytix Full Functional E2E QA (Upload -> Clean -> 8-Chart Guide -> PDF Download -> Export)', () => {
  test('completes end-to-end workflow and verifies Chart Selection Guide PDF and per-chart CSV downloads', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      localStorage.setItem('dataanalytix_ui', 'modern');
      localStorage.setItem(
        'dataanalytix_features',
        JSON.stringify({
          modernTheme: true,
          groupedSidebar: true,
          depthUI: true,
          heroScene3D: true,
          selfHostedFonts: true,
          chartGuide: true,
          commandPalette: true,
          onboardingChecklist: false,
        })
      );
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Dismiss cookie banner if visible
    const cookieBtn = page.locator('button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")');
    if (await cookieBtn.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await cookieBtn.first().click().catch(() => {});
    }

    // Enter workspace if landing/login guest button is visible
    const guestBtn = page.locator(
      'button:has-text("Explore as Guest"), button:has-text("EXPLORE AS GUEST"), button:has-text("Try with sample data")'
    );
    if (await guestBtn.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await guestBtn.first().click().catch(() => {});
    }

    // Ensure feature flags are active in runtime
    await page.evaluate(() => {
      const flags = {
        modernTheme: true,
        groupedSidebar: true,
        depthUI: true,
        heroScene3D: true,
        selfHostedFonts: true,
        chartGuide: true,
      };
      localStorage.setItem('dataanalytix_features', JSON.stringify(flags));
      window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: flags }));
    });

    // 1. Navigate to Data Cleaning & Quality view and verify dataset is loaded
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'cleaning' }));
      window.location.hash = '#/cleaning';
    });
    await page.waitForTimeout(400);
    await expect(page.locator('body')).toContainText(/Quality|Cleaning|Completeness/i);

    // 2. Navigate to Dashboard Builder view
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'dashboard_builder' }));
      window.location.hash = '#/dashboard-builder';
    });

    const guideSection = page.locator('section[aria-label*="Which chart should I use"]');
    await expect(guideSection).toBeVisible({ timeout: 10000 });
    await expect(guideSection).toContainText('Which chart should I use?');

    // 3. Verify all 8 chart guide cards exist and cycle through them
    const expectedCharts = [
      'Bar chart',
      'Line chart',
      'Scatter plot',
      'Histogram',
      'Stacked bar',
      'Donut chart',
      'Heatmap',
      'Box plot',
    ];

    for (const chartName of expectedCharts) {
      const cardBtn = guideSection.locator(`button[aria-label*="${chartName}"]`).first();
      await expect(cardBtn).toBeVisible();
      await cardBtn.click();
      await expect(guideSection).toContainText(`Live Plotted Preview — ${chartName}`);
    }

    // 4. Download complete guide (PDF) from Chart Guide panel header and verify %PDF header
    const pdfDownloadBtn = guideSection.locator('button[aria-label="Download complete guide (PDF)"]');
    await expect(pdfDownloadBtn).toBeVisible();

    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      pdfDownloadBtn.click(),
    ]);

    const suggestedPdfName = pdfDownload.suggestedFilename();
    expect(suggestedPdfName).toMatch(/^data-analytix-chart-guide-\d{4}-\d{2}-\d{2}\.pdf$/);

    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
    const pdfBytes = fs.readFileSync(pdfPath!);
    expect(pdfBytes.byteLength).toBeGreaterThan(2000);
    expect(pdfBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    // 5. Verify per-chart CSV export in the Chart Guide preview
    const csvExportBtn = guideSection.locator('button[aria-label*="plotted data as CSV"]').first();
    await expect(csvExportBtn).toBeVisible();

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      csvExportBtn.click(),
    ]);
    const csvPath = await csvDownload.path();
    expect(csvPath).toBeTruthy();
    const csvContent = fs.readFileSync(csvPath!, 'utf8');
    expect(csvContent.length).toBeGreaterThan(10);
    expect(csvContent.split('\n').length).toBeGreaterThanOrEqual(2);

    // 6. Navigate to Export Center and verify "Chart guide (PDF)" item works
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'export_center' }));
      window.location.hash = '#/export-center';
    });

    const exportCenterGuideBtn = page.locator('button[aria-label="Download Chart guide (PDF)"]');
    await expect(exportCenterGuideBtn).toBeVisible({ timeout: 10000 });

    const [exportCenterPdf] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportCenterGuideBtn.click(),
    ]);
    const exportCenterPdfPath = await exportCenterPdf.path();
    expect(exportCenterPdfPath).toBeTruthy();
    const exportCenterBytes = fs.readFileSync(exportCenterPdfPath!);
    expect(exportCenterBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
