import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShotPlan } from '../src/lib/shotPlanGeometry.js';

test('the red pin is precisely the end of the green leg', () => {
  const initial = { tee: [-23.13, 150.74], layup: [-23.128, 150.742], pin: [-23.124, 150.745] };
  for (const coords of [initial, { ...initial, pin: [-23.126, 150.743] }, { ...initial, layup: [-23.129, 150.744] }]) {
    const result = buildShotPlan(coords);
    assert.equal(result.features.length, 5);
    const green = result.features.find(x => x.properties.leg === 'pin');
    const red = result.features.find(x => x.properties.key === 'pin');
    const yellow = result.features.find(x => x.properties.key === 'layup');
    const second = result.features.find(x => x.properties.leg === 'tee');
    assert.deepEqual(green.geometry.coordinates.at(-1), red.geometry.coordinates);
    assert.deepEqual(green.geometry.coordinates[0], yellow.geometry.coordinates);
    assert.deepEqual(second.geometry.coordinates.at(-1), yellow.geometry.coordinates);
  }
});

test('invalid points draw no stray segments', () => {
  assert.deepEqual(buildShotPlan({ tee: [0, 0], layup: [1, 1], pin: [NaN, 1] }).features, []);
});
