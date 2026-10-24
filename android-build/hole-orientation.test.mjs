import test from 'node:test';
import assert from 'node:assert/strict';
import { alignHoleEndpoints } from '../src/lib/holeOrientation.js';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('reverses a line drawn green-to-tee using both surveyed features', () => {
  const result = alignHoleEndpoints([0, 0], [0, 300], [[0, 302]], [[1, 0]], distance);
  assert.equal(result.reversed, true);
  assert.deepEqual(result.tee, [0, 302]);
  assert.deepEqual(result.pin, [1, 0]);
});

test('retains tee-to-green direction on a properly drawn hole', () => {
  const result = alignHoleEndpoints([0, 0], [0, 300], [[1, 0]], [[0, 298]], distance);
  assert.equal(result.reversed, false);
  assert.deepEqual(result.tee, [1, 0]);
  assert.deepEqual(result.pin, [0, 298]);
});

test('a reversed OSM way can be identified by a green without tee nodes', () => {
  const result = alignHoleEndpoints([0, 0], [0, 300], [], [[0, 0]], distance);
  assert.equal(result.reversed, true);
  assert.deepEqual(result.pin, [0, 0]);
  assert.deepEqual(result.tee, [0, 300]);
});

test('without nearby mapped evidence the recorded direction is preserved', () => {
  const result = alignHoleEndpoints([0, 0], [0, 300], [[300, 300]], [[300, 0]], distance);
  assert.equal(result.reversed, false);
  assert.deepEqual(result.tee, [0, 0]);
  assert.deepEqual(result.pin, [0, 300]);
});
