import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const modeArg = process.argv[2] || 'before'; // 'before' | 'after'
const outDir = path.resolve(`tests/screenshots/theme-${modeArg}`);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const fallbackExecutable = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync(fallbackExecutable) ? fallbackExecutable : undefined);

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
];

const views = [
  { id: 'executive_dashboard', name: 'executive_dashboard' },
  { id: 'dashboard_builder', name: 'dashboard_builder' },
  { id: 'upload', name: 'upload' },
  { id: 'preview', name: 'preview' },
  { id: 'quality', name: 'quality' },
  { id: 'cleaning', name: 'cleaning' },
  { id: 'modeling', name: 'modeling' },
  { id: 'sql_lab', name: 'sql_lab' },
  { id: 'dax_lab', name: 'dax_lab' },
  { id: 'python_lab', name: 'python_lab' },
  { id: 'reports', name: 'reports' },
  { id: 'export_center', name: 'export_center' },
  { id: 'settings', name: 'settings' },
  { id: 'pricing', name: 'pricing' },
  { id: 'workspaces', name: 'workspaces' },
  { id: 'blog', name: 'blog' },
  { id: 'landing', name: 'landing' },
];

const themes = ['dark', 'light'];

async function captureAll() {
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const theme of themes) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      await context.addInitScript(
        ({ thm, isAfter }) => {
          sessionStorage.setItem('acuitybi_guest_mode', 'true');
          localStorage.setItem('dataanalytix_ui', 'modern');
          localStorage.setItem('acuitybi_theme', thm);
          localStorage.setItem(
            'dataanalytix_features',
            JSON.stringify({
              modernTheme: true,
              groupedSidebar: true,
              depthUI: true,
              heroScene3D: true,
              selfHostedFonts: true,
              chartGuide: true,
              unifiedTheme: isAfter,
              onboardingChecklist: false,
            })
          );
        },
        { thm: theme, isAfter: modeArg === 'after' }
      );

      const page = await context.newPage();
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(400);

      // Dismiss cookie banner if present
      const ackBtn = page.locator('button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")');
      if (await ackBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await ackBtn.first().click().catch(() => {});
      }

      for (const v of views) {
        await page.evaluate(
          ({ tabId, thm, isAfter }) => {
            const flags = {
              modernTheme: true,
              groupedSidebar: true,
              depthUI: true,
              heroScene3D: true,
              selfHostedFonts: true,
              chartGuide: true,
              unifiedTheme: isAfter,
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
            if (isAfter) {
              document.documentElement.setAttribute('data-unified-theme', 'true');
            }

            window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: tabId }));
          },
          { tabId: v.id, thm: theme, isAfter: modeArg === 'after' }
        );

        await page.waitForTimeout(350);
        const fileName = `${theme}_${v.name}_${vp.name}px.png`;
        await page.screenshot({ path: path.join(outDir, fileName), fullPage: false });
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(`Captured ${themes.length * viewports.length * views.length} screenshots in ${outDir}`);
}

captureAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
