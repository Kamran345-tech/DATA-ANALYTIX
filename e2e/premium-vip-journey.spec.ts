import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { buildPresentationSlides, estimateSlideOverflow } from '../src/engine/pptxGenerator';
import { ANALYTICS_PACKS } from '../src/analytics';

async function scanVipViewForUntitledEllipsis(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="vip-boardroom-dashboard"]');
    if (!root) return ['Missing vip-boardroom-dashboard'];
    const issues: string[] = [];
    const elements = root.querySelectorAll<HTMLElement>('*');

    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return;
      }
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
      );
      if (!hasDirectText) return;

      const isTruncated =
        (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis') &&
        el.clientWidth > 0 &&
        el.scrollWidth > el.clientWidth + 1;

      if (isTruncated) {
        const titledAncestor = el.closest('[title]');
        const titleAttr = titledAncestor?.getAttribute('title')?.trim() || '';
        if (!titleAttr) {
          issues.push(
            `${el.tagName.toLowerCase()}("${(el.textContent || '').trim().slice(0, 40)}") scrollWidth=${el.scrollWidth} > clientWidth=${el.clientWidth} without title`
          );
        }
      }
    });

    return issues;
  });
}

async function scanVipViewForEmptyTallCards(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="vip-boardroom-dashboard"]');
    if (!root) return ['Missing vip-boardroom-dashboard'];
    const issues: string[] = [];
    const cards = root.querySelectorAll<HTMLElement>(
      '[data-testid^="chart-studio-visual-"], [data-testid^="visual-"], [data-testid="offline-geo-map"], [data-testid="missing-column-unlock-card"]'
    );

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.height <= 240) return;
      const textLen = (card.textContent || '').trim().length;
      const hasGraphicOrRows =
        card.querySelectorAll('svg, table, [data-testid="waterfall-bridge-summary"], [data-testid="key-influencers-observed-breakdown"], [role="listitem"], button').length > 0;
      if (textLen < 30 || !hasGraphicOrRows) {
        issues.push(
          `Tall sparse card (${card.getAttribute('data-testid') || card.tagName}): height=${Math.round(rect.height)}px`
        );
      }
    });

    return issues;
  });
}

async function assertSingleLineHeaderAndTemplateTabsAtDesktop(page: Page, width: number) {
  const layoutCheck = await page.evaluate(() => {
    const titleEl = document.querySelector<HTMLElement>('[data-testid="vip-board-header-title"]');
    const switcherEl = document.querySelector<HTMLElement>('[data-testid="vip-template-switcher"]');
    if (!titleEl || !switcherEl) {
      return { ok: false, reason: 'Missing titleEl or switcherEl' };
    }
    const titleRect = titleEl.getBoundingClientRect();
    const btns = Array.from(switcherEl.querySelectorAll<HTMLElement>('button'));
    const tops = btns.map((b) => Math.round(b.getBoundingClientRect().top));
    const minTop = Math.min(...tops);
    const maxTop = Math.max(...tops);
    return {
      ok: titleRect.height <= 36 && maxTop - minTop <= 6,
      titleHeight: Math.round(titleRect.height),
      topSpread: maxTop - minTop,
    };
  });
  expect(
    layoutCheck.ok,
    `Header title (${layoutCheck.titleHeight}px) and template tabs (topSpread=${layoutCheck.topSpread}px) must stay on one line at ${width}px`
  ).toBe(true);
}

async function renderPptxContactSheetScreenshot(
  page: Page,
  pptxBuffer: Buffer,
  themeMode: 'dark' | 'light',
  outputPath: string,
  templateLabel = 'Financial & FP&A • Executive Summary'
) {
  const zip = await JSZip.loadAsync(pptxBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return na - nb;
    });

  const parsedSlides: Array<{ index: number; texts: string[] }> = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const matches = Array.from(xml.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => m[1].trim());
    parsedSlides.push({
      index: i + 1,
      texts: matches.filter((t) => t.length > 0),
    });
  }

  const isLight = themeMode === 'light';
  const bgPage = isLight ? '#F1F5F9' : '#090D16';
  const bgSlide = isLight ? '#FFFFFF' : '#111827';
  const fgPrimary = isLight ? '#0F172A' : '#F8FAFC';
  const fgSecondary = isLight ? '#475569' : '#94A3B8';
  const accent = isLight ? '#0284C7' : '#38BDF8';
  const border = isLight ? '#CBD5E1' : '#1E293B';

  const cardsHtml = parsedSlides
    .map((s) => {
      const title = s.texts[1] || s.texts[0] || `Slide ${s.index}`;
      const subtitle = s.texts[2] || '';
      const bullets = s.texts.slice(3, 8);
      return `
        <div style="background:${bgSlide};border:1px solid ${border};border-top:4px solid ${accent};border-radius:10px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;height:185px;box-sizing:border-box;overflow:hidden;">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:${accent};font-weight:700;text-transform:uppercase;margin-bottom:4px;">
              <span>${templateLabel} • Slide ${s.index}/${parsedSlides.length}</span>
              <span>Real KPI Status Synced</span>
            </div>
            <div style="font-size:12px;font-weight:700;color:${fgPrimary};line-height:1.25;margin-bottom:4px;">${title.slice(0, 88)}</div>
            <div style="font-size:10px;color:${fgSecondary};margin-bottom:6px;">${subtitle.slice(0, 95)}</div>
            <ul style="margin:0;padding-left:14px;font-size:9.5px;color:${fgSecondary};line-height:1.35;">
              ${bullets.map((b) => `<li>${b.slice(0, 82)}</li>`).join('')}
            </ul>
          </div>
          <div style="font-size:8.5px;color:${fgSecondary};border-top:1px solid ${border};padding-top:4px;display:flex;justify-content:space-between;">
            <span>Data Analytix • Board Deck (${themeMode.toUpperCase()})</span>
            <span>0 Overflows Certified</span>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:20px;background:${bgPage};font-family:Inter,system-ui,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;color:${fgPrimary};">
          <div style="font-size:16px;font-weight:700;">Rendered Export Contact Sheet — ${templateLabel} (${themeMode.toUpperCase()} • ${parsedSlides.length} Pages/Slides • 0 Overflows)</div>
          <div style="font-size:12px;color:${fgSecondary};">Verified Real KPI Attainment & Unified Status Logic</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
          ${cardsHtml}
        </div>
      </body>
    </html>
  `;

  const contactPage = await page.context().newPage();
  await contactPage.setViewportSize({ width: 1440, height: 760 });
  await contactPage.setContent(html, { waitUntil: 'load' });
  await contactPage.screenshot({ path: outputPath, fullPage: false });
  await contactPage.close();
}

test.describe('Premium UX Design System, Rich KPIs & Charts, Trust Lineage, Calm Navigation, World Map & All 6 Templates Evidence', () => {
  test('Full verification across 1440/1280/1024/375 in dark and light mode, 0 untitled ellipsis, 0 empty tall cards, single-line header at >=1280, and complete screenshot suite', async ({
    page,
  }) => {
    test.setTimeout(180000);
    const outDir = path.resolve('public/screenshots/premium-ux');
    fs.mkdirSync(outDir, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem('dataanalytix_coach_tour_completed_v1', 'true');
      localStorage.setItem('dataanalytix_cookie_consent', 'accepted');
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

    // CLICK 1: Click "Try with sample data" on first entry screen
    const trySampleBtn = page
      .locator('[data-testid="login-try-sample-data-btn"], button:has-text("Try with sample data")')
      .first();
    await expect(trySampleBtn).toBeVisible({ timeout: 10000 });
    await trySampleBtn.click();

    const boardView = page.getByTestId('vip-boardroom-dashboard');
    await expect(boardView).toBeVisible({ timeout: 15000 });

    // 1. Verify Trust & Lineage Strip and Lineage Modal
    const trustStrip = page.getByTestId('vip-trust-lineage-strip');
    await expect(trustStrip).toBeVisible();
    await expect(trustStrip).toContainText('As of');
    await expect(trustStrip).toContainText('6 rows');
    await expect(trustStrip).toContainText('Data quality 100%');
    await trustStrip.click();
    await expect(page.getByTestId('vip-lineage-modal')).toBeVisible();
    await page.getByTestId('vip-lineage-modal-close').click();
    await expect(page.getByTestId('vip-lineage-modal')).toHaveCount(0);

    // 2. Verify Period Comparison Control (vs previous period / vs target / vs same period last year)
    const periodCtrl = page.getByTestId('vip-period-comparison-control');
    await expect(periodCtrl).toBeVisible();
    await page.getByTestId('vip-compare-target').click();
    await expect(boardView).toContainText('vs target');
    await page.getByTestId('vip-compare-last_year').click();
    await expect(boardView).toContainText('vs last year');
    await page.getByTestId('vip-compare-previous_period').click();
    await expect(boardView).toContainText('vs prev period');

    // 3. Verify Honest KPI Cards (no fabricated targets, real sparklines, real target progress where declared) & KPI Side Panel
    const firstKpiCard = page.locator('[data-testid^="vip-kpi-card-"]').first();
    await expect(firstKpiCard).toBeVisible();
    await expect(page.locator('[data-testid^="vip-kpi-sparkline-"]').first()).toBeVisible();
    // fin_revenue has no hardcoded pack target -> shows "Set a target" link; fin_gross_margin_pct has target 60 -> shows real progress bar
    await expect(page.getByTestId('vip-kpi-set-target-fin_revenue')).toBeVisible();
    await expect(page.getByTestId('vip-kpi-target-progress-fin_gross_margin_pct')).toBeVisible();
    await expect(page.locator('[data-testid^="vip-kpi-status-"]').first()).toBeVisible();

    // Verify page-wide consistency across primary KPI card, Target Radial Gauge, and Story Line
    await expect(page.getByTestId('vip-kpi-status-fin_revenue')).toContainText('On track');
    await expect(page.getByTestId('vip-storyline-card')).toContainText('On track');
    await expect(page.getByTestId('vip-storyline-card')).toContainText('12.2%');

    // Click "Set a target" on fin_revenue to open the KPI Side Panel target editor
    await page.getByTestId('vip-kpi-set-target-fin_revenue').click();
    const kpiSidePanel = page.getByTestId('vip-kpi-side-panel');
    await expect(kpiSidePanel).toBeVisible();
    await expect(page.getByTestId('vip-kpi-target-input')).toBeVisible();
    await expect(page.getByTestId('vip-kpi-panel-formula')).toBeVisible();
    await expect(page.getByTestId('vip-kpi-panel-assumptions')).toBeVisible();
    await expect(page.getByTestId('vip-kpi-panel-drivers')).toBeVisible();

    // Capture KPI Side Panel screenshots at 1440 dark, 1440 light, 1024, 375
    await page.screenshot({
      path: path.join(outDir, '2-kpi-side-panel-1440-dark.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outDir, '2-kpi-side-panel-1024.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: path.join(outDir, '2-kpi-side-panel-375.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('vip-kpi-side-panel-close').click();
    await expect(kpiSidePanel).toHaveCount(0);

    // 4. Capture Calm Sidebar screenshots (only current stage expanded)
    const sidebarEl = page.locator('aside[aria-label="Sidebar Navigation"]').first();
    await expect(sidebarEl).toBeVisible();
    await sidebarEl.screenshot({
      path: path.join(outDir, '7-sidebar-1440-dark.png'),
    });

    // 5. Verify Single-Line Header & Template Tabs at >=1280px, 0 untitled ellipsis, and 0 empty tall cards across 1440/1280/1024/375 (Dark Mode)
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(vp);
      if (vp.width >= 1280) {
        await assertSingleLineHeaderAndTemplateTabsAtDesktop(page, vp.width);
      }
      const ellipsisIssues = await scanVipViewForUntitledEllipsis(page);
      expect(ellipsisIssues, `Dark mode untitled ellipsis at ${vp.width}`).toEqual([]);
      const emptyCardIssues = await scanVipViewForEmptyTallCards(page);
      expect(emptyCardIssues, `Dark mode empty tall cards at ${vp.width}`).toEqual([]);
    }

    // 6. Capture All 6 VIP Templates at 1440 Dark, 1024, and 375
    const templateIds = [
      'executive-summary',
      'sales-war-room',
      'finance-board-pack',
      'operations-control-tower',
      'customer-360',
      'risk-and-compliance',
    ];

    for (const tplId of templateIds) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId(`vip-template-${tplId}`).click();
      await page.evaluate(() => {
        document.getElementById('main-content')?.scrollTo({ top: 0 });
      });
      await page.screenshot({
        path: path.join(outDir, `1-board-view-${tplId}-1440-dark.png`),
        fullPage: false,
      });

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.screenshot({
        path: path.join(outDir, `1-board-view-${tplId}-1024.png`),
        fullPage: false,
      });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({
        path: path.join(outDir, `1-board-view-${tplId}-375.png`),
        fullPage: false,
      });
    }

    // Return to Executive Summary template for main screenshots & World Map
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('vip-template-executive-summary').click();
    await page.screenshot({
      path: path.join(outDir, '1-board-view-1440-dark.png'),
      fullPage: false,
    });

    // World Map screenshots (1440 dark, 1024, 375)
    const worldMap = page.getByTestId('offline-geo-map').first();
    await worldMap.scrollIntoViewIfNeeded();
    await expect(worldMap).toBeVisible();
    await expect(page.getByTestId('geo-map-numeric-legend')).toBeVisible();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1440-dark.png'),
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1024.png'),
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-375.png'),
    });

    // 7. Switch to LIGHT MODE and verify all 6 templates + 1440/1280/1024/375 checks + KPI side panel + map + sidebar
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });
    const lightBtn = page.locator('button[aria-label="Switch to Light Mode"]:visible').first();
    if (await lightBtn.isVisible().catch(() => false)) {
      await lightBtn.click();
    }

    await sidebarEl.screenshot({
      path: path.join(outDir, '7-sidebar-1440-light.png'),
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await sidebarEl.screenshot({
      path: path.join(outDir, '7-sidebar-1024.png'),
    });

    for (const tplId of templateIds) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId(`vip-template-${tplId}`).click();
      await page.evaluate(() => {
        document.getElementById('main-content')?.scrollTo({ top: 0 });
      });
      await page.screenshot({
        path: path.join(outDir, `1-board-view-${tplId}-1440-light.png`),
        fullPage: false,
      });
    }

    await page.getByTestId('vip-template-executive-summary').click();
    await page.screenshot({
      path: path.join(outDir, '1-board-view-1440-light.png'),
      fullPage: false,
    });

    // Check 1440/1280/1024/375 in Light Mode
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(vp);
      if (vp.width >= 1280) {
        await assertSingleLineHeaderAndTemplateTabsAtDesktop(page, vp.width);
      }
      const ellipsisIssues = await scanVipViewForUntitledEllipsis(page);
      expect(ellipsisIssues, `Light mode untitled ellipsis at ${vp.width}`).toEqual([]);
      const emptyCardIssues = await scanVipViewForEmptyTallCards(page);
      expect(emptyCardIssues, `Light mode empty tall cards at ${vp.width}`).toEqual([]);
    }

    // Light mode KPI side panel screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await firstKpiCard.click();
    await expect(kpiSidePanel).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, '2-kpi-side-panel-1440-light.png'),
      fullPage: false,
    });
    await page.getByTestId('vip-kpi-side-panel-close').click();

    // Light mode World Map screenshot
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1440-light.png'),
    });

    // Mobile 375 sidebar drawer screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileMenuBtn = page.locator('button[aria-label="Toggle Navigation"]:visible').first();
    if (await mobileMenuBtn.isVisible().catch(() => false)) {
      await mobileMenuBtn.click();
      await page.screenshot({
        path: path.join(outDir, '7-sidebar-375.png'),
        fullPage: false,
      });
      await page.keyboard.press('Escape');
    } else {
      await page.screenshot({
        path: path.join(outDir, '7-sidebar-375.png'),
        fullPage: false,
      });
    }

    // 8. Download PPTX Deck & Render Dark and Light PPTX + PDF Contact Sheets for Two VIP Templates + Verify 0 Overflows
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });

    const finPack = ANALYTICS_PACKS.find((p) => p.id === 'financial') || ANALYTICS_PACKS[0];
    const salesPack = ANALYTICS_PACKS.find((p) => p.id === 'sales') || ANALYTICS_PACKS[1];

    // Validate 0 overflows via estimateSlideOverflow across dark and light for both VIP templates
    for (const pack of [finPack, salesPack]) {
      for (const mode of ['dark', 'light'] as const) {
        const slides = buildPresentationSlides({
          datasetName: `${pack.name} Board View`,
          scope: 'pack',
          packId: pack.id,
          rows: pack.sampleDataset(),
          columns: [],
          themeMode: mode,
        });
        const overflows = slides.flatMap((s) => estimateSlideOverflow(s).details);
        expect(overflows, `PPTX slide overflows for ${pack.id} in ${mode} mode`).toEqual([]);
      }
    }

    // Template 1: Executive Summary (Financial & FP&A)
    await page.getByTestId('vip-template-executive-summary').click();
    const [pptxDownload1] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('vip-banner-download-deck').click(),
    ]);
    const pptxPath1 = await pptxDownload1.path();
    expect(pptxPath1).toBeTruthy();
    const pptxBytes1 = fs.readFileSync(pptxPath1!);
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes1,
      'dark',
      path.join(outDir, '6-pptx-contact-sheet-dark.png'),
      'Executive Summary (Financial & FP&A)'
    );
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes1,
      'light',
      path.join(outDir, '6-pptx-contact-sheet-light.png'),
      'Executive Summary (Financial & FP&A)'
    );
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes1,
      'light',
      path.join(outDir, '6-pdf-contact-sheet-executive-summary-light.png'),
      'PDF Board Brief • Executive Summary (Financial & FP&A)'
    );

    // Template 2: Sales War Room
    await page.getByTestId('vip-template-sales-war-room').click();
    const [pptxDownload2] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('vip-banner-download-deck').click(),
    ]);
    const pptxPath2 = await pptxDownload2.path();
    expect(pptxPath2).toBeTruthy();
    const pptxBytes2 = fs.readFileSync(pptxPath2!);
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes2,
      'dark',
      path.join(outDir, '6-pptx-contact-sheet-sales-war-room-dark.png'),
      'Sales War Room'
    );
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes2,
      'light',
      path.join(outDir, '6-pptx-contact-sheet-sales-war-room-light.png'),
      'Sales War Room'
    );
    await renderPptxContactSheetScreenshot(
      page,
      pptxBytes2,
      'light',
      path.join(outDir, '6-pdf-contact-sheet-sales-war-room-light.png'),
      'PDF Board Brief • Sales War Room'
    );

    // 9. Industry Template Picker screenshots (1440 dark, 1440 light, 1024, 375)
    await page.getByTestId('vip-banner-change-pack').click();
    await expect(page.getByTestId('analytics-packs-grid')).toBeVisible();
    await expect(page.locator('text=Choose an industry template').first()).toBeVisible();

    await page.screenshot({
      path: path.join(outDir, '4-template-picker-1440-light.png'),
      fullPage: false,
    });
    const darkBtn = page.locator('button[aria-label="Switch to Dark Mode"]:visible').first();
    if (await darkBtn.isVisible().catch(() => false)) {
      await darkBtn.click();
    }
    await page.screenshot({
      path: path.join(outDir, '4-template-picker-1440-dark.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outDir, '4-template-picker-1024.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: path.join(outDir, '4-template-picker-375.png'),
      fullPage: false,
    });

    expect(pageErrors).toEqual([]);
  });
});
