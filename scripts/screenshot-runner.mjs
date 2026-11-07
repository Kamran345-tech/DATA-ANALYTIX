import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('tests/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const prefix = process.argv[2] || 'before'; // 'before' | 'after' | 'modern'

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 }
];

const views = [
  { id: 'executive_dashboard', name: 'dashboard', selector: 'button:has-text("Executive Dashboard")' },
  { id: 'upload', name: 'upload', selector: 'button:has-text("Upload"), button:has-text("Data Ingestion")' },
  { id: 'sql_lab', name: 'sql_lab', selector: 'button:has-text("SQL In-Browser Lab"), button:has-text("SQL Lab")' },
  { id: 'settings', name: 'settings', selector: 'button:has-text("Settings"), button[title="Open Settings"]' }
];

async function run() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });

    await context.addInitScript(({ pfx }) => {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
      if (pfx.startsWith('modern')) {
        localStorage.setItem('dataanalytix_ui', 'modern');
        if (pfx.includes('light')) {
          localStorage.setItem('acuitybi_theme', 'light');
        } else {
          localStorage.setItem('acuitybi_theme', 'dark');
        }
      } else {
        localStorage.setItem('dataanalytix_ui', 'classic');
      }
    }, { pfx: prefix });

    const page = await context.newPage();
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(500);

      await page.evaluate(({ pfx }) => {
        sessionStorage.setItem('acuitybi_guest_mode', 'true');
        const mode = pfx.startsWith('modern') ? 'modern' : 'classic';
        localStorage.setItem('dataanalytix_ui', mode);
        window.dispatchEvent(new CustomEvent('dataanalytix:ui-updated', { detail: mode }));

        const theme = pfx.includes('light') ? 'light' : 'dark';
        localStorage.setItem('acuitybi_theme', theme);
        if (theme === 'light') {
          document.documentElement.classList.add('theme-light');
          document.documentElement.classList.remove('theme-dark', 'dark');
        } else {
          document.documentElement.classList.remove('theme-light');
          document.documentElement.classList.add('theme-dark', 'dark');
        }
      }, { pfx: prefix });

      // Dismiss cookie notice
      const ackBtn = page.locator('button:has-text("Acknowledge & Continue"), button:has-text("Accept All Analytics")');
      if (await ackBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await ackBtn.first().click().catch(() => {});
      }

      // Check if Explore as Guest button is visible
      const guestBtn = page.locator('button:has-text("Explore as Guest"), button:has-text("EXPLORE AS GUEST"), button:has-text("Launch Instant Demo Workspace")');
      if (await guestBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await guestBtn.first().click();
        await page.waitForTimeout(500);
      }

      for (const v of views) {
        // Switch to the target view
        await page.evaluate((tabId) => {
          window.dispatchEvent(new CustomEvent('dataanalytix:set-tab', { detail: tabId }));
          window.location.hash = '#/' + (tabId === 'executive_dashboard' ? 'dashboard' : tabId.replace('_', '-'));
        }, v.id);

        // Also try clicking navigation if exists
        const navBtn = page.locator(v.selector).first();
        if (await navBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await navBtn.click({ force: true }).catch(() => {});
        }

        await page.waitForTimeout(800);

        const fileName = `${prefix}_${v.name}_${vp.name}px.png`;
        const filePath = path.join(outDir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`Saved screenshot: ${fileName}`);
      }
    } catch (err) {
      console.error(`Error capturing for ${vp.name}px:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error('Fatal screenshot runner error:', err);
  process.exit(1);
});
