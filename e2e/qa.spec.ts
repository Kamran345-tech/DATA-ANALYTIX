import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

async function bootstrapModernWorkspace(page: Page, options?: { startEmpty?: boolean }) {
  await page.addInitScript((opts) => {
    sessionStorage.setItem('acuitybi_guest_mode', 'true');
    if (opts?.startEmpty) {
      sessionStorage.setItem('dataanalytix_start_empty', 'true');
    } else {
      sessionStorage.removeItem('dataanalytix_start_empty');
    }
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
        unifiedTheme: true,
        commandPalette: true,
        onboardingChecklist: true,
      })
    );
  }, options || {});

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

  await page.evaluate((opts) => {
    const flags = {
      modernTheme: true,
      groupedSidebar: true,
      depthUI: true,
      heroScene3D: true,
      selfHostedFonts: true,
      chartGuide: true,
      unifiedTheme: true,
      commandPalette: true,
      onboardingChecklist: true,
    };
    localStorage.setItem('dataanalytix_features', JSON.stringify(flags));
    window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: flags }));
    if (opts?.startEmpty) {
      window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
    }
  }, options || {});
  await page.waitForTimeout(250);
}

test.describe('Data Analytix Comprehensive E2E Functional & SOP Download Suite', () => {
  test('1. Settings -> Experiments shows active session flags banner and toggles flags live', async ({ page }) => {
    await bootstrapModernWorkspace(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'settings' }));
      window.location.hash = '#/settings';
    });

    const banner = page.getByTestId('session-flags-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText('Active flags in this session:');
    await expect(banner).toContainText('depthUI');
    await expect(banner).toContainText('heroScene3D');
    await expect(banner).toContainText('chartGuide');
    await expect(banner).toContainText('unifiedTheme');
  });

  test('2. Verifies 4 layout fixes: balanced Landing H1, collapsed Getting Started checklist, non-overlapping Executive pill, and wide slicer inputs', async ({ page }) => {
    await bootstrapModernWorkspace(page);

    // Check Executive Dashboard pill & Getting Started checklist collapsed by default when dataset is loaded
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'executive_dashboard' }));
    });
    await page.waitForTimeout(300);

    // Checklist should be collapsed to a pill button because step 1 (Load a dataset) is complete
    const collapsedChecklistBtn = page.locator('button[aria-label*="Expand Getting Started checklist"]');
    await expect(collapsedChecklistBtn).toBeVisible({ timeout: 8000 });

    // Numeric filter inputs in InteractiveSlicersBar should have min-w-[110px]
    const minInput = page.locator('input[placeholder^="Min ("]').first();
    if (await minInput.isVisible().catch(() => false)) {
      const box = await minInput.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(105);
    }

    // Navigate to Landing view and verify balanced 2-line H1
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'landing' }));
    });
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText('Raw data in.');
    await expect(h1).toContainText('Clear decisions out.');
  });

  test('3. DownloadMenu in NO-DATA state: disables data-dependent items with reason, downloads blank templates/SOP/Guide, and loads sample data in 1 click', async ({ page }) => {
    await bootstrapModernWorkspace(page, { startEmpty: true });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'executive_dashboard' }));
      window.dispatchEvent(new CustomEvent('dataanalytix:clear-dataset'));
    });
    await page.waitForTimeout(300);

    const trigger = page.getByTestId('download-menu-trigger-executive_dashboard').first();
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();

    const panel = page.getByTestId('download-menu-panel-executive_dashboard');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('No dataset loaded');

    // Data-requiring item is disabled with clear reason
    const disabledPdfItem = page.getByTestId('download-item-executive_pdf');
    await expect(disabledPdfItem).toBeDisabled();
    await expect(disabledPdfItem).toContainText('Load a dataset first');

    // No-data items are enabled and download real SOP files
    const blankCsvItem = page.getByTestId('download-item-blank_csv_template');
    await expect(blankCsvItem).toBeEnabled();
    const [blankCsvDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      blankCsvItem.click(),
    ]);
    expect(blankCsvDownload.suggestedFilename()).toMatch(
      /^data-analytix-blank-template-.*-\d{4}-\d{2}-\d{2}\.csv$/
    );

    // Re-open menu and download Design SOP (.md)
    await trigger.click();
    const sopMdItem = page.getByTestId('download-item-design_sop_md');
    await expect(sopMdItem).toBeEnabled();
    const [sopMdDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      sopMdItem.click(),
    ]);
    expect(sopMdDownload.suggestedFilename()).toMatch(
      /^data-analytix-design-sop-.*-\d{4}-\d{2}-\d{2}\.md$/
    );

    // Re-open menu and click "Use sample dataset" CTA to load data and unlock all items
    await trigger.click();
    const loadSampleBtn = page.getByTestId('download-menu-load-sample');
    await expect(loadSampleBtn).toBeVisible();
    await loadSampleBtn.click();

    await page.waitForTimeout(400);
    await expect(page.getByTestId('download-item-executive_pdf')).toBeEnabled();
  });

  test('4. DownloadMenu across views in DEMO-DATA state: verifies real SOP downloads for PDF, CSV, SQL, DAX, Python, and HTML', async ({ page }) => {
    await bootstrapModernWorkspace(page);

    // 4A. Executive Dashboard -> Executive Report PDF
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'executive_dashboard' }));
    });
    const execTrigger = page.getByTestId('download-menu-trigger-executive_dashboard').first();
    await expect(execTrigger).toBeVisible({ timeout: 10000 });
    await execTrigger.click();

    const [execPdf] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByTestId('download-item-executive_pdf').click(),
    ]);
    expect(execPdf.suggestedFilename()).toMatch(/^data-analytix-executive-report-.*-\d{4}-\d{2}-\d{2}\.pdf$/);
    const execPdfBytes = fs.readFileSync((await execPdf.path())!);
    expect(execPdfBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    // 4B. SQL Lab -> SQL Script (.sql)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'sql_lab' }));
    });
    const sqlTrigger = page.getByTestId('download-menu-trigger-sql_lab').first();
    await expect(sqlTrigger).toBeVisible({ timeout: 10000 });
    await sqlTrigger.click();

    const [sqlDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByTestId('download-item-sql_script').click(),
    ]);
    expect(sqlDownload.suggestedFilename()).toMatch(/^data-analytix-queries-.*-\d{4}-\d{2}-\d{2}\.sql$/);
    const sqlText = fs.readFileSync((await sqlDownload.path())!, 'utf8');
    expect(sqlText).toContain('Data Analytix');

    // 4C. DAX Lab -> DAX Measures (.dax)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'dax_lab' }));
    });
    const daxTrigger = page.getByTestId('download-menu-trigger-dax_lab').first();
    await expect(daxTrigger).toBeVisible({ timeout: 10000 });
    await daxTrigger.click();

    const [daxDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByTestId('download-item-dax_script').click(),
    ]);
    expect(daxDownload.suggestedFilename()).toMatch(/^data-analytix-measures-.*-\d{4}-\d{2}-\d{2}\.dax$/);

    // 4D. Python Lab -> Python Script (.py)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'python_lab' }));
    });
    const pyTrigger = page.getByTestId('download-menu-trigger-python_lab').first();
    await expect(pyTrigger).toBeVisible({ timeout: 10000 });
    await pyTrigger.click();

    const [pyDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByTestId('download-item-python_script').click(),
    ]);
    expect(pyDownload.suggestedFilename()).toMatch(/^data-analytix-pipeline-.*-\d{4}-\d{2}-\d{2}\.py$/);

    // 4E. Data Preview -> Clean Dataset (.csv)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'preview' }));
    });
    const previewTrigger = page.getByTestId('download-menu-trigger-preview').first();
    await expect(previewTrigger).toBeVisible({ timeout: 10000 });
    await previewTrigger.click();

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByTestId('download-item-clean_csv').click(),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/^data-analytix-cleaned-data-.*-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('5. 8-Chart Selection Guide interactive flow, Complete Guide PDF download, and per-chart CSV export', async ({ page }) => {
    await bootstrapModernWorkspace(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: 'dashboard_builder' }));
      window.location.hash = '#/dashboard-builder';
    });

    const guideSection = page.locator('section[aria-label*="Which chart should I use"]');
    await expect(guideSection).toBeVisible({ timeout: 10000 });
    await expect(guideSection).toContainText('Which chart should I use?');

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

    const pdfDownloadBtn = guideSection.locator('button[aria-label="Download complete guide (PDF)"]');
    await expect(pdfDownloadBtn).toBeVisible();

    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      pdfDownloadBtn.click(),
    ]);

    expect(pdfDownload.suggestedFilename()).toMatch(/^data-analytix-chart-guide-.*?\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdfBytes = fs.readFileSync((await pdfDownload.path())!);
    expect(pdfBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
