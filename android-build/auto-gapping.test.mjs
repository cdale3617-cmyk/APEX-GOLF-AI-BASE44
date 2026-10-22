import assert from 'node:assert/strict';
import test from 'node:test';
import { autoGapCarry, GAP_CLUB_IDS } from '../src/lib/autoGapping.js';

const starter = () => {
  const yards = [280, 245, 225, 205, 192, 180, 168, 155, 142, 130, 118, 102, 88];
  return [
    ...GAP_CLUB_IDS.map((id, i) => ({ id, carry: yards[i], miss: 'Straight', active: true })),
    { id: 'pt', carry: 0, miss: 'Straight', active: true },
  ];
};
const carry = (clubs, id) => clubs.find((club) => club.id === id)?.carry;
const sorted = (clubs) => GAP_CLUB_IDS.map((id) => carry(clubs, id));

test('8-iron at 135 metres adjusts remaining clubs; Driver and L-Wedge unchanged', () => {
  const clubs = starter();
  // 135 m is 148 yd (the app internally stores yards).
  const result = autoGapCarry(clubs, '8i', 148);
  assert.equal(result.error, null);
  assert.equal(result.referenceId, '8i');
  assert.equal(carry(result.clubs, '8i'), 148);
  assert.equal(Math.round(carry(result.clubs, '8i') * 0.9144), 135);
  assert.equal(carry(result.clubs, 'dr'), 280);
  assert.equal(carry(result.clubs, 'lw'), 88);
  assert.equal(carry(result.clubs, 'pt'), 0);
  assert.notEqual(carry(result.clubs, '7i'), carry(clubs, '7i'));
  assert.notEqual(carry(result.clubs, '9i'), carry(clubs, '9i'));
  assert.ok(sorted(result.clubs).every((n, i, a) => i === 0 || n < a[i - 1]));
  assert.deepEqual(starter(), clubs, 'Input must not mutate');
});

test('A different middle club becomes the reference and carries are ordered', () => {
  const result = autoGapCarry(starter(), '6i', 175);
  assert.equal(result.error, null);
  assert.equal(result.referenceId, '6i');
  assert.equal(carry(result.clubs, '6i'), 175);
  assert.equal(carry(result.clubs, 'dr'), 280);
  assert.equal(carry(result.clubs, 'lw'), 88);
  assert.ok(sorted(result.clubs).every((n, i, a) => i === 0 || n < a[i - 1]));
});

test('Editing a fixed endpoint recalculates other clubs without altering reference', () => {
  const first = autoGapCarry(starter(), '8i', 148);
  const changedDriver = autoGapCarry(first.clubs, 'dr', 300, first.referenceId);
  assert.equal(changedDriver.error, null);
  assert.equal(carry(changedDriver.clubs, 'dr'), 300);
  assert.equal(carry(changedDriver.clubs, 'lw'), 88);
  assert.equal(carry(changedDriver.clubs, '8i'), 148);
  assert.equal(changedDriver.referenceId, '8i');
  assert.ok(sorted(changedDriver.clubs).every((n, i, a) => i === 0 || n < a[i - 1]));
});

test('Invalid middle carry does not overwrite saved club distances', () => {
  const clubs = starter();
  for (const invalid of [25, 280, -3, NaN, 999]) {
    const outcome = autoGapCarry(clubs, '8i', invalid);
    assert.ok(outcome.error);
    assert.deepEqual(outcome.clubs, clubs);
  }
});

test('Putter edits do not change the rest of the bag', () => {
  const clubs = starter();
  const outcome = autoGapCarry(clubs, 'pt', 8);
  assert.equal(outcome.error, undefined);
  assert.equal(carry(outcome.clubs, 'pt'), 8);
  assert.deepEqual(outcome.clubs.slice(0, -1), clubs.slice(0, -1));
});
