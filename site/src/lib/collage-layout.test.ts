import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollageLayout, fitVisibleBounds, layoutMetrics, MIN_TARGET, type CollageItem } from './collage-layout.ts';

const makeObjects = (count: number): CollageItem[] => Array.from({ length: count }, (_, index) => ({
  id: `o${String(index + 1).padStart(4, '0')}`,
  visualWeight: .9 + (index % 7) * .03,
}));

const objects = makeObjects(30);

type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('is deterministic for a seed and reshuffles for a new seed', () => {
  const first = createCollageLayout(objects, 1200, 4132);
  const repeat = createCollageLayout(objects, 1200, 4132);
  const changed = createCollageLayout(objects, 1200, 9831);
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first.placements.map(({ id }) => id), changed.placements.map(({ id }) => id));
});

for (const count of [1, 5, 14, 30, 100]) {
  test(`keeps every protected target visible and separate across the width sweep (${count} objects)`, () => {
    const set = makeObjects(count);
    const step = count === 30 ? 16 : 48;
    for (let width = 280; width <= 2560; width += step) {
      const layout = createCollageLayout(set, width, 71391);
      assert.equal(layout.placements.length, set.length, `missing placement at ${width}px`);
      assert.equal(new Set(layout.placements.map(({ id }) => id)).size, set.length, `duplicate placement at ${width}px`);
      for (const placement of layout.placements) {
        assert.ok(placement.width >= MIN_TARGET && placement.height >= MIN_TARGET, `small target at ${width}px`);
        assert.ok(placement.x >= 0 && placement.x + placement.width <= width + .001, `horizontal clipping at ${width}px`);
        assert.ok(placement.y >= 0 && placement.y + placement.height <= layout.canvasHeight, `vertical clipping at ${width}px`);
      }
      for (let left = 0; left < layout.placements.length; left += 1) {
        for (let right = left + 1; right < layout.placements.length; right += 1) {
          assert.equal(overlaps(layout.placements[left], layout.placements[right]), false, `targets overlap at ${width}px`);
        }
      }
    }
  });
}

test('preserves seeded object order while density increases with screen width', () => {
  const widths = [320, 390, 768, 1024, 1440, 1920, 2560];
  const layouts = widths.map((width) => createCollageLayout(objects, width, 44109));
  const objectOrder = layouts[0].placements.map(({ id }) => id);
  for (const layout of layouts.slice(1)) {
    assert.deepEqual(layout.placements.map(({ id }) => id), objectOrder);
  }
  for (let index = 1; index < layouts.length; index += 1) {
    assert.ok(layouts[index].densityColumns >= layouts[index - 1].densityColumns);
  }
});

test('matches the reference density audit points', () => {
  const expected: Array<[number, number]> = [[320, 1], [360, 2], [390, 2], [768, 3], [1024, 4], [1440, 6], [1920, 8]];
  for (const [width, columns] of expected) {
    assert.equal(layoutMetrics(width).densityColumns, columns, `density at ${width}px`);
  }
});

test('keeps the plane compact instead of limiting wide screens to object pairs', () => {
  const mobile = createCollageLayout(objects, 390, 71391);
  const desktop = createCollageLayout(objects, 1440, 71391);
  const wide = createCollageLayout(objects, 1920, 71391);
  assert.ok(mobile.canvasHeight < 9000);
  assert.ok(desktop.canvasHeight < 2200);
  assert.ok(wide.canvasHeight < 1800);
});

test('keeps the plane from resolving into horizontal bands', () => {
  for (const width of [768, 802, 1024, 1440, 1920]) {
    for (const seed of [223, 71391, 44109]) {
      const layout = createCollageLayout(objects, width, seed);
      const centres = layout.placements.map((placement) => placement.y + placement.height / 2).sort((a, b) => a - b);
      for (let index = 0; index + 3 < centres.length; index += 1) {
        assert.ok(centres[index + 3] - centres[index] >= 72, `horizontal band at ${width}px for seed ${seed}`);
      }
      const topCapacity = layout.densityColumns >= 6 ? 3 : 2;
      assert.ok(layout.placements.filter((placement) => placement.y < 108).length <= topCapacity, `flat leading row at ${width}px for seed ${seed}`);
    }
  }
});

test('fits the visible pixels, not the transparent padding, into the box', () => {
  const fit = fitVisibleBounds({ width: 1000, height: 500 }, { x: .25, y: 0, width: .5, height: 1 }, { width: 200, height: 200 });
  // Visible part is 500×500 px; it is scaled to 200×200, so the full image is 400×200.
  assert.equal(fit.width, 400);
  assert.equal(fit.height, 200);
  assert.equal(fit.offsetX, 0);
  const offCentre = fitVisibleBounds({ width: 100, height: 100 }, { x: 0, y: 0, width: .5, height: .5 }, { width: 100, height: 100 });
  assert.equal(offCentre.width, 200);
  assert.equal(offCentre.offsetX, 50);
  assert.equal(offCentre.offsetY, 50);
});
