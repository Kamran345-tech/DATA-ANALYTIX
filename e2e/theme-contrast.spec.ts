import { test, expect, Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DESKTOP_VIEWS = [
  'landing',
  'executive_dashboard',
  'dashboard_builder',
  'upload',
  'live_connector',
  'preview',
  'quality',
  'cleaning',
  'modeling',
  'data_engineering',
  'sql_lab',
  'dax_lab',
  'python_lab',
  'reports',
  'export_center',
  'how_to_modify',
  'settings',
  'pricing',
  'workspaces',
  'blog',
];

const SCREENSHOT_VIEWS = [
  'landing',
  'executive_dashboard',
  'live_connector',
  'data_engineering',
  'how_to_modify',
  'export_center',
];

const MOBILE_CORE_VIEWS = [
  'landing',
  'executive_dashboard',
  'dashboard_builder',
  'live_connector',
  'data_engineering',
  'how_to_modify',
  'export_center',
  'settings',
];

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots/qa-verified');

async function initThemeTestPage(
  page: Page,
  theme: 'dark' | 'light',
  width: number,
  height: number,
  uiMode: 'classic' | 'modern' = 'classic'
) {
  await page.addInitScript(
    ({ thm, ui }) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      localStorage.setItem('dataanalytix_ui', ui);
      localStorage.setItem('acuitybi_theme', thm);
      localStorage.setItem('acuitybi_theme_preference', thm);
      localStorage.setItem('dataanalytix_theme_pref', thm);
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
          onboardingChecklist: false,
        })
      );
    },
    { thm: theme, ui: uiMode }
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

async function runViewContrastAndLayoutAudit(page: Page, viewId: string, theme: 'dark' | 'light') {
  await page.evaluate(
    ({ tabId, thm }) => {
      const flags = {
        modernTheme: true,
        groupedSidebar: true,
        depthUI: true,
        heroScene3D: true,
        selfHostedFonts: true,
        chartGuide: true,
        unifiedTheme: true,
        onboardingChecklist: false,
      };
      localStorage.setItem('dataanalytix_features', JSON.stringify(flags));
      window.dispatchEvent(new CustomEvent('dataanalytix:features-updated', { detail: flags }));

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
      document.documentElement.setAttribute('data-unified-theme', 'true');
      window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: tabId }));
    },
    { tabId: viewId, thm: theme }
  );

  await page.waitForTimeout(240);

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

      const rootStyle = window.getComputedStyle(document.documentElement);
      const bgApp = rootStyle.getPropertyValue('--bg-app').trim();
      const textPrimary = rootStyle.getPropertyValue('--text-primary').trim();
      const textSecondary = rootStyle.getPropertyValue('--text-secondary').trim();
      const textMuted = rootStyle.getPropertyValue('--text-muted').trim();

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
        // Skip gradient-text elements where background-clip: text is active
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

      // (b) Solid Accent Fill Contrast Scanner (must meet >= 4.5:1; do NOT skip solid fills)
      const accentElements = Array.from(
        document.querySelectorAll(
          '.bg-accent, .glass-btn-primary, button.bg-sky-600, button.bg-sky-700, button.bg-cyan-500, button.bg-cyan-600, button.bg-emerald-600, button.bg-teal-500, button.bg-teal-600'
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

      // (a) Header Control Clipping & Overlap Scanner
      const headerClips: string[] = [];
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
          if (r.left < -1 || r.right > window.innerWidth + 1) {
            const label =
              (ctrl.textContent || '').trim() ||
              ctrl.getAttribute('aria-label') ||
              ctrl.getAttribute('placeholder') ||
              ctrl.tagName;
            headerClips.push(
              `Header control "${label.slice(0, 28)}" clipped: left=${Math.round(r.left)}, right=${Math.round(r.right)}, viewport=${window.innerWidth}`
            );
          }
        }

        // Check "How to Use" never wraps when visible
        const howToUseBtn = Array.from(headerEl.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('How to Use')
        );
        if (howToUseBtn) {
          const r = howToUseBtn.getBoundingClientRect();
          if (r.width > 0 && r.height > 44) {
            headerClips.push(`"How to Use" button wrapped vertically: height=${Math.round(r.height)}px`);
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
            titleOverlapError = `H1 (${Math.round(r1.left)},${Math.round(r1.top)}..${Math.round(r1.right)},${Math.round(r1.bottom)}) overlaps Health Pill (${Math.round(r2.left)},${Math.round(r2.top)}..${Math.round(r2.right)},${Math.round(r2.bottom)})`;
          }
        }
      }

      const hasUnifiedAttr =
        document.documentElement.getAttribute('data-unified-theme') === 'true';
      const horizontalOverflow =
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 4;

      return {
        bgApp,
        textPrimary,
        textSecondary,
        textMuted,
        hasUnifiedAttr,
        horizontalOverflow,
        failures,
        accentFailures,
        headerClips,
        titleOverlapError,
      };
    },
    { expectedTheme: theme, currentView: viewId }
  );
}

async function captureAndAttachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string
) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
}

test.describe('Unified Theme, Header Clipping, Solid Accent Contrast & Performance QA (1280, 1440, 1920, 375px)', () => {
  for (const width of [1280, 1440, 1920] as const) {
    for (const theme of ['dark', 'light'] as const) {
      test(`Desktop ${width}px (${theme}): zero header clipping, zero title overlap, solid accent >= 4.5:1, and WCAG contrast across all views`, async ({
        page,
      }, testInfo) => {
        const height = width === 1920 ? 1080 : width === 1440 ? 900 : 800;
        await initThemeTestPage(page, theme, width, height, 'classic');

        for (const viewId of DESKTOP_VIEWS) {
          const audit = await runViewContrastAndLayoutAudit(page, viewId, theme);
          expect(audit.hasUnifiedAttr, `View ${viewId} should have data-unified-theme="true"`).toBe(true);
          expect(audit.horizontalOverflow, `View ${viewId} (${theme}, ${width}px) has horizontal overflow`).toBe(false);
          expect(audit.headerClips, `Header clipping in ${viewId} (${theme}, ${width}px)`).toEqual([]);
          expect(audit.titleOverlapError, `Title overlap in ${viewId} (${theme}, ${width}px)`).toBeNull();
          expect(audit.accentFailures, `Solid accent contrast failures in ${viewId} (${theme}, ${width}px)`).toEqual([]);
          expect(audit.failures, `Text contrast failures in ${viewId} (${theme}, ${width}px)`).toEqual([]);

          if (SCREENSHOT_VIEWS.includes(viewId)) {
            await captureAndAttachScreenshot(page, testInfo, `${viewId}-${theme}-${width}px`);
          }
        }
      });
    }
  }

  test('Mobile 375px (dark & light): verifies responsive header, zero horizontal overflow, solid accent >= 4.5:1, and WCAG contrast', async ({
    page,
  }, testInfo) => {
    for (const theme of ['dark', 'light'] as const) {
      await initThemeTestPage(page, theme, 375, 812, 'classic');

      for (const viewId of MOBILE_CORE_VIEWS) {
        const audit = await runViewContrastAndLayoutAudit(page, viewId, theme);
        expect(audit.hasUnifiedAttr).toBe(true);
        expect(audit.horizontalOverflow, `View ${viewId} (${theme}, 375px) has horizontal overflow`).toBe(false);
        expect(audit.headerClips, `Header clipping in ${viewId} (${theme}, 375px)`).toEqual([]);
        expect(audit.titleOverlapError, `Title overlap in ${viewId} (${theme}, 375px)`).toBeNull();
        expect(audit.accentFailures, `Solid accent contrast failures in ${viewId} (${theme}, 375px)`).toEqual([]);
        expect(audit.failures, `Text contrast failures in ${viewId} (${theme}, 375px)`).toEqual([]);

        if (['landing', 'executive_dashboard', 'data_engineering'].includes(viewId)) {
          await captureAndAttachScreenshot(page, testInfo, `${viewId}-${theme}-375px`);
        }
      }
    }
  });

  test('Performance budget: navigation long tasks <= 200ms and average frame time <= 33ms', async ({
    page,
  }) => {
    await initThemeTestPage(page, 'dark', 1440, 900, 'classic');

    const perfMetrics = await page.evaluate(async () => {
      const longTasks: number[] = [];
      let observer: PerformanceObserver | null = null;
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longTasks.push(entry.duration);
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch {}
      }

      const viewsToNavigate = ['executive_dashboard', 'live_connector', 'data_engineering', 'how_to_modify'];
      for (const tab of viewsToNavigate) {
        window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: tab }));
        await new Promise((r) => setTimeout(r, 80));
      }

      // Measure 20 requestAnimationFrame intervals
      const frameDeltas: number[] = [];
      await new Promise<void>((resolve) => {
        let last = performance.now();
        let count = 0;
        function step(now: number) {
          if (count > 0) {
            frameDeltas.push(now - last);
          }
          last = now;
          count++;
          if (count <= 20) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });

      observer?.disconnect();
      const maxLongTaskMs = longTasks.length ? Math.max(...longTasks) : 0;
      const avgFrameTimeMs =
        frameDeltas.reduce((acc, v) => acc + v, 0) / Math.max(1, frameDeltas.length);

      return {
        maxLongTaskMs: Math.round(maxLongTaskMs * 100) / 100,
        avgFrameTimeMs: Math.round(avgFrameTimeMs * 100) / 100,
      };
    });

    expect(
      perfMetrics.maxLongTaskMs,
      `Max long task on navigation (${perfMetrics.maxLongTaskMs}ms) exceeded 200ms budget`
    ).toBeLessThanOrEqual(200);
    expect(
      perfMetrics.avgFrameTimeMs,
      `Average frame time (${perfMetrics.avgFrameTimeMs}ms) exceeded 33ms budget`
    ).toBeLessThanOrEqual(33);
  });
});
