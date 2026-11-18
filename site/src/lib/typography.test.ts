import assert from 'node:assert/strict';
import test from 'node:test';
import { bindShortWords } from './typography.ts';

test('short words stay with the following word', () => {
  assert.equal(
    bindShortWords('Музей потерянного и найденного в деревне на севере Армении и ее окрестностях.'),
    'Музей потерянного и найденного в деревне на севере Армении и ее окрестностях.',
  );
});

test('longer words and the last word are left alone', () => {
  assert.equal(bindShortWords('Арт-лаборатория в деревне'), 'Арт-лаборатория в деревне');
  assert.equal(bindShortWords('туман и'), 'туман и');
});
