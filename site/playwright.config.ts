import { defineConfig, devices } from '@playwright/test';

const port = 4329;
export const basePath = '/memo-armenia-summerschool-website/';

// Smoke tests run against the built site (npm run build first; preview builds use SITE_OUT_DIR).
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `npx astro preview --ignore-lock --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
