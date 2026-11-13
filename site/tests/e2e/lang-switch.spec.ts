import { expect, test, type Page } from '@playwright/test';

const base = '/memo-armenia-summerschool-website/';

async function openProject(page: Page) {
  await page.goto(`${base}found/`);
  const path = await page.locator('.catalogue a').first().getAttribute('href');
  await page.goto(path!);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
}

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  // Let the scroll event and its rAF callback finish, even when the state stays the same.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('the language switch clears reading content and returns on scroll up and at page edges', async ({ page }) => {
  const end = await openProject(page);
  const switcher = page.locator('.lang-switch');
  const middle = Math.floor(end / 2);
  expect(middle).toBeGreaterThan(100);
  await expect(switcher).toHaveCSS('opacity', '1');
  await scrollTo(page, middle);
  await expect(switcher).toHaveCSS('opacity', '0');
  await expect(switcher).toHaveCSS('pointer-events', 'none');

  await scrollTo(page, middle - 1);
  await expect(switcher).toHaveCSS('opacity', '1');
  await scrollTo(page, middle + 3);
  await expect(switcher).toHaveCSS('opacity', '1');
  await scrollTo(page, middle + 20);
  await expect(switcher).toHaveCSS('opacity', '0');

  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollTo(page, bottom - 40);
  await expect(switcher).toHaveCSS('opacity', '1');
  await scrollTo(page, bottom);
  await expect(switcher).toHaveCSS('opacity', '1');
  await scrollTo(page, 0);
  await scrollTo(page, 40);
  await expect(switcher).toHaveCSS('opacity', '1');
});

test('tabbing into the hidden switch reveals every link immediately and keeps focus visible while scrolling', async ({ page }) => {
  const end = await openProject(page);
  const switcher = page.locator('.lang-switch');
  const links = switcher.locator('a');
  // Put the keyboard immediately before the switch without changing the reading position.
  await page.locator('.site-footer a').last().evaluate((link: HTMLElement) => link.focus({ preventScroll: true }));
  await scrollTo(page, Math.floor(end / 2));
  await expect(switcher).toHaveCSS('opacity', '0');
  for (const link of await links.all()) {
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    await expect(switcher).toHaveCSS('opacity', '1');
    await expect(switcher).toHaveCSS('transition-duration', '0s');
    await expect(link).toBeInViewport();
  }
  await scrollTo(page, Math.floor(end / 2) + 40);
  await expect(switcher).toHaveCSS('opacity', '1');
});

test('reduced motion skips the animation and a non-scrolling page keeps the switch visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const end = await openProject(page);
  const switcher = page.locator('.lang-switch');
  await scrollTo(page, Math.floor(end / 2));
  await expect(switcher).toHaveCSS('opacity', '0');
  await expect(switcher).toHaveCSS('transition-duration', '0s');
  await page.setViewportSize({ width: 1440, height: 10000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBe(0);
  await expect(switcher).toHaveCSS('opacity', '1');
});

test('the language switch stays visible without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    const end = await openProject(page);
    // rAF callbacks do not run in a context with JavaScript disabled.
    await page.evaluate((top) => window.scrollTo(0, top), Math.floor(end / 2));
    await expect(page.locator('.lang-switch')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lang-switch a').first()).toBeInViewport();
  } finally {
    await context.close();
  }
});
