import { expect, test, type Page } from '@playwright/test';

const base = '/memo-armenia-summerschool-website/';

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
}

async function projectPaths(page: Page): Promise<string[]> {
  await page.goto(`${base}found/`);
  return page.locator('.catalogue a').evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
}

test('every route renders under the base path without horizontal scroll', async ({ page }) => {
  const routes: Array<[string, string | null]> = [
    [base, 'LOST'],
    [`${base}found/`, 'FOUND'],
    [`${base}pokr-ayrum/`, 'ПОКР АЙРУМ'],
  ];
  for (const path of await projectPaths(page)) routes.push([path, 'FOUND']);
  expect(routes.length).toBeGreaterThan(3);

  for (const [path, current] of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.title-menu a')).toHaveCount(3);
    if (current) await expect(page.locator('.title-menu a[aria-current]')).toHaveText(current);
    await expectNoHorizontalScroll(page);
  }
});

test('unknown routes get the 404 page', async ({ page }) => {
  const response = await page.goto(`${base}no-such-page/`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Страница не найдена');
  await expectNoHorizontalScroll(page);
});

test('the object field places every object as a separate link that resolves', async ({ page, request }) => {
  await page.goto(base);
  const field = page.locator('.object-field[data-ready="true"]');
  await expect(field).toBeVisible();
  const objects = field.locator('a[data-testid="field-object"]');
  const count = await objects.count();
  expect(count).toBeGreaterThan(0);

  const boxes = await objects.evaluateAll((links) => links.map((link) => {
    const style = (link as HTMLElement).style;
    return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
  }));
  for (const [index, box] of boxes.entries()) {
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
    for (const other of boxes.slice(index + 1)) {
      const overlap = box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y;
      expect(overlap, 'protected targets overlap').toBe(false);
    }
  }

  const hrefs = await objects.evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''));
  for (const href of new Set(hrefs)) {
    expect(href.startsWith(`${base}found/`)).toBe(true);
    expect((await request.get(href)).status(), href).toBe(200);
  }
  await expectNoHorizontalScroll(page);
});

test('object → project → Back returns to the field', async ({ page }) => {
  await page.goto(base);
  const first = page.locator('.object-field[data-ready="true"] a[data-testid="field-object"]').first();
  const href = await first.getAttribute('href');
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('.project-head h1')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${base}$`));
  await expect(page.locator('.object-field[data-ready="true"] a[data-testid="field-object"]').first()).toBeVisible();
});

test('a project links its cut-outs back to the field', async ({ page }) => {
  const [path] = await projectPaths(page);
  await page.goto(path);
  const link = page.locator('.project-objects a').first();
  const target = (await link.getAttribute('href')) ?? '';
  expect(target).toMatch(new RegExp(`^${base}#object-o\\d+$`));
  await link.click();
  const id = target.split('#')[1];
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
});

test('home text variants switch with ?home=', async ({ page }) => {
  for (const variant of ['1', '2', '3']) {
    await page.goto(`${base}?home=${variant}`);
    await expect(page.locator(`.home-variant[data-variant="${variant}"]`)).toBeVisible();
    await expect(page.locator('.home-variant:visible')).toHaveCount(1);
  }
  await page.goto(`${base}?home=3`);
  await expect(page.locator('.home-keywords li').first()).toBeVisible();
});

test('YouTube loads nothing before the visitor presses play', async ({ page }) => {
  const youtubeRequests: string[] = [];
  page.on('request', (request) => {
    if (/youtube|ytimg|googlevideo/.test(new URL(request.url()).hostname)) youtubeRequests.push(request.url());
  });
  let found = false;
  for (const path of await projectPaths(page)) {
    await page.goto(path);
    if (await page.locator('a[data-youtube-id]').count()) {
      found = true;
      break;
    }
  }
  test.skip(!found, 'no YouTube media in this content');
  await page.waitForLoadState('networkidle');
  expect(youtubeRequests).toEqual([]);
  await page.route(/youtube-nocookie\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>stub</p>' }));
  await page.locator('a[data-youtube-id]').first().click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(1);
});
