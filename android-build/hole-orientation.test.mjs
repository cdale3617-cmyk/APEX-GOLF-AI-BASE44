import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldReverseHole } from '../src/lib/holeOrientation.js';

const metres = (a, b) => Math.abs(a[0] - b[0]) * 1111;

test('a hole line drawn green-to-tee is reversed using mapped tee and green', () => {
  assert.equal(shouldReverseHole([0.5, 0], [0, 0], [[0, 0]], [[0.5, 0]], metres), true);
  assert.equal(shouldReverseHole([0, 0], [0.5, 0], [[0, 0]], [[0.5, 0]], metres), false);
});

test('unknown orientation remains as surveyed rather than guessing', () => {
  assert.equal(shouldReverseHole([0, 0], [0.5, 0], [], [], metres), false);
});
