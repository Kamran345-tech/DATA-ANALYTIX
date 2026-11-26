import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

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

test.describe('Premium UX VIP User Journey: 2-Click Board View, 3-Click Deck Download, <=12 Controls, Zero Cut Labels & Presentation Mode', () => {
  test('First-time VIP journey: load sample data -> Board View in <=2 clicks -> Download deck in <=3 clicks, <=12 first-screen controls, 0 untitled cut labels at 1440/1280/1024/375, Presentation Mode at 1920x1080, and full screenshot evidence', async ({
    page,
  }) => {
    test.setTimeout(120000);
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

    // Dismiss cookie banner if present (not part of workflow clicks)
    const cookieBtn = page.locator(
      'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
    );
    if (await cookieBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cookieBtn.first().click().catch(() => {});
    }

    let clickCount = 0;

    // CLICK 1: Click "Try with sample data" on first entry screen
    const trySampleBtn = page
      .locator('[data-testid="login-try-sample-data-btn"], button:has-text("Try with sample data")')
      .first();
    await expect(trySampleBtn).toBeVisible({ timeout: 10000 });
    await trySampleBtn.click();
    clickCount += 1;

    // Assert within <= 2 clicks (here 1 click!) the user sees the Board View & recognition banner
    expect(clickCount).toBeLessThanOrEqual(2);
    const boardView = page.getByTestId('vip-boardroom-dashboard');
    const recognitionBanner = page.getByTestId('vip-recognition-banner');
    await expect(boardView).toBeVisible({ timeout: 15000 });
    await expect(recognitionBanner).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('vip-recognition-message')).toContainText(
      'We recognised your data as'
    );
    await expect(page.getByTestId('vip-recognition-message')).toContainText(
      'Here is your board view.'
    );

    // Verify recognition banner has ONLY 2 buttons: "Download deck" and "Change pack"
    const bannerButtons = recognitionBanner.locator('button');
    await expect(bannerButtons).toHaveCount(2);
    await expect(page.getByTestId('vip-banner-download-deck')).toHaveText('Download deck');
    await expect(page.getByTestId('vip-banner-change-pack')).toHaveText('Change pack');

    // Verify ONE NAVIGATION, ONE SEARCH on Board View:
    // - GuidedWorkflowStepper is hidden on Board View
    await expect(page.getByTestId('guided-workflow-stepper')).toHaveCount(0);
    // - Sidebar search input is removed; only one Ctrl+K search button in top bar
    await expect(page.getByTestId('sidebar-search-input')).toHaveCount(0);
    await expect(page.getByTestId('navbar-search-box')).toHaveCount(0);
    await expect(page.getByTestId('navbar-search-icon-btn')).toBeVisible();

    // Count total visible interactive controls on the first screen of Board View and assert <= 12
    const firstScreenBoardControls = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="vip-boardroom-dashboard"]');
      if (!root) return 999;
      const controls = root.querySelectorAll<HTMLElement>('button, select, input, a[href]');
      let visibleCount = 0;
      controls.forEach((ctrl) => {
        const style = window.getComputedStyle(ctrl);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return;
        }
        const rect = ctrl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight) {
          visibleCount += 1;
        }
      });
      return visibleCount;
    });
    console.log(`[Premium UX] Interactive controls on first screen of Board View: ${firstScreenBoardControls}`);
    expect(firstScreenBoardControls).toBeLessThanOrEqual(12);

    // Screenshot 1: First landing after data load / Board View (1440 Dark)
    await page.screenshot({
      path: path.join(outDir, '1-board-view-1440-dark.png'),
      fullPage: false,
    });

    // CLICK 2 (<= 3 clicks total): Click "Download deck" in the recognition banner
    const [pptxDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('vip-banner-download-deck').click(),
    ]);
    clickCount += 1;
    expect(clickCount).toBeLessThanOrEqual(3);

    const pptxPath = await pptxDownload.path();
    expect(pptxPath).toBeTruthy();
    const pptxBytes = fs.readFileSync(pptxPath!);
    expect(pptxBytes.subarray(0, 2).toString('utf8')).toBe('PK');

    // Verify post-download success toast with "Open file" link
    await expect(page.getByTestId('vip-download-toast')).toBeVisible();
    await expect(page.getByTestId('vip-download-open-file')).toBeVisible();

    // Screenshot 5: New World Map with Natural-Earth country polygons and persistent Top 5 labels (1440 Dark)
    const worldMap = page.getByTestId('offline-geo-map').first();
    await worldMap.scrollIntoViewIfNeeded();
    await expect(worldMap).toBeVisible();
    const top5MapLabelsCount = await worldMap.locator('[data-testid^="geo-top5-label-"]').count();
    expect(top5MapLabelsCount).toBeGreaterThanOrEqual(3);
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1440-dark.png'),
    });

    // Scroll back to top of Board View
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });

    // Zero untitled cut labels check across 1440, 1280, 1024, and 375
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(vp);
      const issues = await scanVipViewForUntitledEllipsis(page);
      expect(issues, `Untitled ellipsized text at ${vp.width}x${vp.height}`).toEqual([]);
    }

    // Capture 1024 and 375 screenshots for Board View and World Map
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });
    await page.screenshot({
      path: path.join(outDir, '1-board-view-1024.png'),
      fullPage: false,
    });
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1024.png'),
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });
    await page.screenshot({
      path: path.join(outDir, '1-board-view-375.png'),
      fullPage: false,
    });
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-375.png'),
    });

    // Switch to 1440 Light Mode and capture Board View + World Map
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });
    const lightBtn = page.locator('button[aria-label="Switch to Light Mode"]:visible').first();
    if (await lightBtn.isVisible().catch(() => false)) {
      await lightBtn.click();
    }
    await page.screenshot({
      path: path.join(outDir, '1-board-view-1440-light.png'),
      fullPage: false,
    });
    await worldMap.scrollIntoViewIfNeeded();
    await worldMap.screenshot({
      path: path.join(outDir, '5-world-map-after-1440-light.png'),
    });

    // Switch back to Dark Mode for Presentation Mode & Template Picker screenshots
    const darkBtn = page.locator('button[aria-label="Switch to Dark Mode"]:visible').first();
    if (await darkBtn.isVisible().catch(() => false)) {
      await darkBtn.click();
    }
    await page.evaluate(() => {
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    });

    // Test Presentation Mode (Full screen, keyboard navigation ArrowRight & Escape, 1920x1080 + 1440/1024/375)
    await page.getByTestId('vip-presentation-mode-btn').click();
    await expect(page.getByTestId('vip-presentation-toolbar')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('vip-presentation-toolbar')).toContainText('Section 2 of 5');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({
      path: path.join(outDir, '3-presentation-mode-1920x1080-dark.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(outDir, '3-presentation-mode-1440-dark.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outDir, '3-presentation-mode-1024.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: path.join(outDir, '3-presentation-mode-375.png'),
      fullPage: false,
    });

    // Exit Presentation Mode with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vip-presentation-toolbar')).toHaveCount(0);

    // Test "Change pack" -> Opens Industry Templates Picker
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('vip-banner-change-pack').click();
    await expect(page.getByTestId('analytics-packs-grid')).toBeVisible();
    await expect(page.locator('text=Industry templates').first()).toBeVisible();

    await page.screenshot({
      path: path.join(outDir, '4-template-picker-1440-dark.png'),
      fullPage: false,
    });

    if (await lightBtn.isVisible().catch(() => false)) {
      await lightBtn.click();
    }
    await page.screenshot({
      path: path.join(outDir, '4-template-picker-1440-light.png'),
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
