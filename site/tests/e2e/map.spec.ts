import { expect, test } from '@playwright/test';

const base = '/memo-armenia-summerschool-website/';

for (const lang of ['', 'en/']) {
  test(`the map of places on /${lang}pokr-ayrum/ links to project pages`, async ({ page, request }) => {
    await page.goto(`${base}${lang}pokr-ayrum/`);
    const map = page.locator('#map');
    await expect(map.locator('h2')).toHaveCount(1);
    await expect(map.locator('.pm-marker').first()).toBeAttached();

    const links = map.locator('.place-map-list a');
    expect(await links.count()).toBeGreaterThan(0);
    for (const box of await links.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(48);
    }
    const hrefs = new Set(await links.evaluateAll((elements) => elements.map((element) => element.getAttribute('href') ?? '')));
    for (const href of hrefs) {
      expect(href.startsWith(`${base}${lang}found/`), href).toBe(true);
      expect((await request.get(href)).status(), href).toBe(200);
    }

    // Russian place names never show on the English page.
    if (lang) await expect(map.locator('.place-map-lists')).not.toContainText('Пример');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const lang of ['', 'en/']) {
  test(`a marker on /${lang}pokr-ayrum/ leads to its row in the list`, async ({ page }) => {
    await page.goto(`${base}${lang}pokr-ayrum/`);
    const map = page.locator('#map');
    const url = page.url();
    const sticky = await map.locator('.place-map-main').evaluate((element) => getComputedStyle(element).position === 'sticky');

    // Clicking scrolls to the row and highlights it, without leaving the page; a wide screen keeps the drawing in view.
    const last = map.locator('.pm-marker').last();
    const id = await last.getAttribute('data-place');
    await last.click();
    const row = map.locator(`#place-${id}`);
    await expect(row).toHaveAttribute('data-active', '');
    await expect(row).toBeInViewport();
    if (sticky) await expect(map.locator('.place-map-figure')).toBeInViewport({ ratio: 1 });
    expect(page.url()).toBe(url);

    // Enter on a focused marker does the same and moves focus to the row.
    const first = map.locator('.pm-marker').first();
    const firstId = await first.getAttribute('data-place');
    await first.focus();
    await page.keyboard.press('Enter');
    const firstRow = map.locator(`#place-${firstId}`);
    await expect(firstRow).toHaveAttribute('data-active', '');
    await expect(firstRow).toBeInViewport();
    expect(await page.evaluate((rowId) => document.getElementById(rowId)?.contains(document.activeElement), `place-${firstId}`)).toBe(true);
    expect(page.url()).toBe(url);
  });
}
