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
