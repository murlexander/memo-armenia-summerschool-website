import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createCollageLayout, fitVisibleBounds, layoutMetrics, MIN_TARGET, randomUnit, seededSequence, storyAlignment, type CollageItem } from './collage-layout.ts';

const makeObjects = (count: number): CollageItem[] => Array.from({ length: count }, (_, index) => ({
  id: `o${String(index + 1).padStart(4, '0')}`,
  visualWeight: .9 + (index % 7) * .03,
}));

const objects = makeObjects(30);

type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('optimized solver preserves the complete pre-optimization geometry', () => {
  const set = Array.from({ length: 36 }, (_, index) => ({
    id: `o${String(index + 1).padStart(3, '0')}`,
    visualWeight: .9 + (index % 7) * .03,
  }));
  // SHA-256 of JSON.stringify(createCollageLayout(...)) from commit 88ad85ea, before optimization.
  // Covers every placement, visual trait, ordering and canvas size, beyond the collision constraints.
  const baseline: Record<string, string> = {
    '390:223': '04df5273292bd3f4389f0241c1b2f9bbca0debb72a187600fcc9b608f032d93d',
    '390:71391': 'e1f6528e572300cbe27e50bf2f543e59c309205db14fee7a11534e4658df79af',
    '390:44109': 'b26a71f99b75ad99b2fef159499bf11462fa44722792879a81562f5443ae0297',
    '768:223': 'dcd6e3121724bd32e5fb0ab7721ac2ec286f64826f5eaf37b9cdd74c6f7df2ed',
    '768:71391': '37e2cea6a04f46ce6f21ec67c65f3a75843ab9122ae66f806e1c0eb7bcf7d148',
    '768:44109': '0a071b3178ec3ed4582fca926c5fa385c11ae5260e140c3b5113a5ca015d9f9b',
    '1440:223': '80e943e16c91654500cd8c77061565f20212153e920d38edd5ce966812634201',
    '1440:71391': '1d339a09aae30268a4c3af541c40b7f8ef7d533a8062c30355f4e60528c2ff1f',
    '1440:44109': 'b302f45d375c4b3829d08a08d0011ba55307c1a2cb1a2ba88d50037d866fc21b',
    '1920:223': '1f35a6cacc64586ff0eae988253610b512840c9be3008b097343b3c2255b0671',
    '1920:71391': '8543a5d3923c233925ae12aafcc1320517212f140449f3ffe8f97dfcd7b73965',
    '1920:44109': 'd1d1339b3bb35de3c4969f5ad834863de0406a00b4167a3b2d94671dbbcead03',
  };
  for (const [key, expected] of Object.entries(baseline)) {
    const [width, seed] = key.split(':').map(Number);
    const actual = createHash('sha256').update(JSON.stringify(createCollageLayout(set, width, seed))).digest('hex');
    assert.equal(actual, expected, `changed geometry at width:seed ${key}`);
  }
});

test('cached candidate prefixes preserve the original seeded random values', () => {
  for (const seed of [0, 223, 71391, 0xffffffff]) {
    for (const prefix of ['o001:candidate-x:', 'o036:candidate-y:', 'p-unknown:candidate-score:']) {
      const sequence = seededSequence(seed, prefix);
      for (const index of [0, 1, 9, 10, 99, 100, 719]) {
        assert.equal(sequence(index), randomUnit(seed, `${prefix}${index}`), `${seed}/${prefix}${index}`);
      }
    }
  }
});

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

test('keeps the hover story card inside the field', () => {
  assert.equal(storyAlignment({ x: 600, width: 120 }, 1400), 'center');
  // A centred 272px card under a narrow object at the left edge would start left of the field.
  assert.equal(storyAlignment({ x: 10, width: 120 }, 1400), 'start');
  assert.equal(storyAlignment({ x: 1270, width: 120 }, 1400), 'end');
});
