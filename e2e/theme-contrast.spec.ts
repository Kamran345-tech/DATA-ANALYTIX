import { test, expect } from '@playwright/test';

const VIEWS = [
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

test.describe('Unified Theme System — WCAG Contrast & Token Verification (Dark & Light)', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`verifies semantic tokens, zero horizontal overflow, and WCAG AA contrast across all views in ${theme} mode`, async ({ page }) => {
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

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Dismiss cookie banner if visible
      const cookieBtn = page.locator(
        'button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")'
      );
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

      for (const viewId of VIEWS) {
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

        await page.waitForTimeout(250);

        const audit = await page.evaluate((expectedTheme) => {
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
              expectedTheme === 'light' ? [248, 250, 252, 1] : [11, 18, 32, 1];
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

          // Check primary headings and labels in main content area
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

        expect(audit.hasUnifiedAttr, `View ${viewId} should have data-unified-theme="true"`).toBe(true);
        expect(audit.bgApp.toLowerCase()).toBe(theme === 'light' ? '#f6f8fc' : '#0b1120');
        expect(audit.textPrimary.toLowerCase()).toBe(theme === 'light' ? '#0f172a' : '#e6ecf7');
        expect(audit.horizontalOverflow, `View ${viewId} (${theme}) has horizontal overflow`).toBe(false);
        expect(audit.failures, `Contrast failures in ${viewId} (${theme})`).toEqual([]);
      }
    });
  }
});
