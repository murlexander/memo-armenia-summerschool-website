import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyFilter, filterOptions, filterQuery, matchesFilter, parseFilterQuery } from './catalogue-filter.ts';
import { mediumLabels, mediums } from './media-kinds.ts';

test('every medium has a label in every language', () => {
  for (const medium of mediums) {
    for (const lang of ['ru', 'en', 'hy'] as const) assert.ok(mediumLabels[medium][lang].trim(), `${medium} ${lang}`);
  }
});

test('the filter offers only values that occur, and only groups with at least two', () => {
  const options = filterOptions([
    { studio: 'Мозаики', medium: ['mosaic'] },
    { studio: 'Зины', medium: ['installation'], shift: 1 },
    { studio: 'Мозаики', medium: ['play', 'mosaic'], shift: 1 },
    { medium: [] },
  ]);
  assert.deepEqual(options.studio, ['Мозаики', 'Зины']);
  // Vocabulary order, not order of appearance.
  assert.deepEqual(options.medium, ['play', 'mosaic', 'installation']);
  // One shift cannot narrow anything.
  assert.deepEqual(options.shift, []);
});

test('OR within a group, AND across groups', () => {
  const facets = { studio: ['Зины'], medium: ['installation'], shift: [] };
  assert.ok(matchesFilter(facets, emptyFilter()));
  assert.ok(matchesFilter(facets, { ...emptyFilter(), medium: ['zine', 'installation'] }));
  assert.ok(!matchesFilter(facets, { ...emptyFilter(), medium: ['zine'] }));
  assert.ok(matchesFilter(facets, { ...emptyFilter(), studio: ['Зины'], medium: ['installation'] }));
  assert.ok(!matchesFilter(facets, { ...emptyFilter(), studio: ['Кино'], medium: ['installation'] }));
  // A project without a shift drops out once a shift is chosen.
  assert.ok(!matchesFilter(facets, { ...emptyFilter(), shift: ['1'] }));
});

test('the query keeps offered values in page order and survives a round trip', () => {
  const offered = { studio: ['Зины', 'Кино'], medium: ['film', 'zine', 'mosaic'], shift: [] };
  const state = parseFilterQuery('?medium=mosaic,unknown&medium=film&studio=%D0%9A%D0%B8%D0%BD%D0%BE&shift=1&home=2', offered);
  assert.deepEqual(state, { studio: ['Кино'], medium: ['film', 'mosaic'], shift: [] });
  const query = filterQuery(state, '?home=2&medium=zine');
  assert.equal(query, '?home=2&medium=film,mosaic&studio=%D0%9A%D0%B8%D0%BD%D0%BE');
  assert.deepEqual(parseFilterQuery(query, offered), state);
  assert.equal(filterQuery(emptyFilter(), '?medium=film'), '');
});
