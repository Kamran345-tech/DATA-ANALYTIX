import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const fallbackExecutable = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync(fallbackExecutable) ? fallbackExecutable : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
