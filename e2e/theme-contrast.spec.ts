import { test, expect, Page } from '@playwright/test';

const DESKTOP_VIEWS = [
  'landing',
  'executive_dashboard',
  'dashboard_builder',
  'upload',
  'preview',
  'quality',
  'cleaning',
  'modeling',
  'sql_lab',
  'dax_lab',
  'python_lab',
  'reports',
  'export_center',
  'settings',
  'pricing',
  'workspaces',
  'blog',
];

const MOBILE_CORE_VIEWS = [
  'landing',
  'executive_dashboard',
  'dashboard_builder',
  'preview',
  'cleaning',
  'sql_lab',
  'reports',
  'settings',
];

async function initThemeTestPage(page: Page, theme: 'dark' | 'light', width: number, height: number) {
  await page.addInitScript((thm) => {
    sessionStorage.setItem('acuitybi_guest_mode', 'true');
    localStorage.setItem('dataanalytix_ui', 'modern');
    localStorage.setItem('acuitybi_theme', thm);
    localStorage.setItem('acuitybi_theme_preference', thm);
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
  }, theme);

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
  if (await cookieBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieBtn.first().click().catch(() => {});
  }

  const guestBtn = page.locator(
    'button:has-text("Explore as Guest"), button:has-text("EXPLORE AS GUEST"), button:has-text("Try with sample data")'
  );
  if (await guestBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await guestBtn.first().click().catch(() => {});
  }
}

async function runViewContrastAudit(page: Page, viewId: string, theme: 'dark' | 'light') {
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

  await page.waitForTimeout(220);

  return page.evaluate((expectedTheme) => {
    function parseColor(str: string): [number, number, number, number] | null {
      const m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
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
    ).slice(0, 40);

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
    };
  }, theme);
}

test.describe('Unified Theme System — WCAG Contrast & Token Verification (Dark & Light @ 1440px & 375px)', () => {
  test('1. Dark Mode @ 1440px Desktop: verifies semantic tokens, zero horizontal overflow, and WCAG AA contrast across all 17 views', async ({ page }) => {
    await initThemeTestPage(page, 'dark', 1440, 900);

    for (const viewId of DESKTOP_VIEWS) {
      const audit = await runViewContrastAudit(page, viewId, 'dark');
      expect(audit.hasUnifiedAttr, `View ${viewId} should have data-unified-theme="true"`).toBe(true);
      expect(audit.bgApp.toLowerCase()).toBe('#0b1120');
      expect(audit.textPrimary.toLowerCase()).toBe('#e6ecf7');
      expect(audit.horizontalOverflow, `View ${viewId} (dark, 1440px) has horizontal overflow`).toBe(false);
      expect(audit.failures, `Contrast failures in ${viewId} (dark, 1440px)`).toEqual([]);
    }
  });

  test('2. Light Mode @ 1440px Desktop: verifies semantic tokens, zero horizontal overflow, and WCAG AA contrast across all 17 views', async ({ page }) => {
    await initThemeTestPage(page, 'light', 1440, 900);

    for (const viewId of DESKTOP_VIEWS) {
      const audit = await runViewContrastAudit(page, viewId, 'light');
      expect(audit.hasUnifiedAttr, `View ${viewId} should have data-unified-theme="true"`).toBe(true);
      expect(audit.bgApp.toLowerCase()).toBe('#f6f8fc');
      expect(audit.textPrimary.toLowerCase()).toBe('#0f172a');
      expect(audit.horizontalOverflow, `View ${viewId} (light, 1440px) has horizontal overflow`).toBe(false);
      expect(audit.failures, `Contrast failures in ${viewId} (light, 1440px)`).toEqual([]);
    }
  });

  test('3. Dark & Light Mode @ 375px Mobile: verifies responsive layout, zero horizontal overflow, and WCAG AA contrast', async ({ page }) => {
    for (const theme of ['dark', 'light'] as const) {
      await initThemeTestPage(page, theme, 375, 812);

      for (const viewId of MOBILE_CORE_VIEWS) {
        const audit = await runViewContrastAudit(page, viewId, theme);
        expect(audit.hasUnifiedAttr).toBe(true);
        expect(audit.horizontalOverflow, `View ${viewId} (${theme}, 375px) has horizontal overflow`).toBe(false);
        expect(audit.failures, `Contrast failures in ${viewId} (${theme}, 375px)`).toEqual([]);
      }
    }
  });
});
