import assert from 'node:assert/strict';
import test from 'node:test';
import { objectStatus } from './issues.ts';

const clean = { alsoClaimedBy: [], issues: [] };

test('a project shows its object only when exactly one is settled', () => {
  assert.equal(objectStatus(undefined, [clean], 0), 'certain');
  assert.equal(objectStatus(undefined, [], 0), 'unknown');
  assert.equal(objectStatus(undefined, [clean, clean], 0), 'uncertain');
  assert.equal(objectStatus(undefined, [clean], 1), 'uncertain');
  assert.equal(objectStatus(undefined, [{ alsoClaimedBy: ['p002'], issues: [] }], 0), 'uncertain');
  assert.equal(objectStatus(undefined, [{ alsoClaimedBy: [], issues: ['object-disputed'] }], 0), 'uncertain');
  // The index has the last word.
  assert.equal(objectStatus('uncertain', [clean], 0), 'uncertain');
});
