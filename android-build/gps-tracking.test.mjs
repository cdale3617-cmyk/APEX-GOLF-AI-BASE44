import test from 'node:test';
import assert from 'node:assert/strict';
import { checkGpsPosition, courseGpsMode, metresBetween } from '../src/lib/gpsTracking.js';

const hole = {
  tee: [-23.1348, 150.7436],
  layup: [-23.1340, 150.7450],
  pin: [-23.133, 150.7465],
};
const now = 1800000000000;
const position = (latitude, longitude, accuracy = 7, timestamp = now) => ({
  coords: { latitude, longitude, accuracy }, timestamp,
});

test('good GPS fix is accepted without modifying course markers', () => {
  const before = structuredClone(hole);
  const data = checkGpsPosition(position(-23.1348, 150.7437), now);
  assert.equal(data.accepted, true);
  assert.equal(courseGpsMode(data.fix, hole, now), 'live');
  assert.deepEqual(hole, before);
});

test('reject unreliable GPS signal before using it for shot numbers', () => {
  assert.equal(checkGpsPosition(position(-23.1348, 150.7436, 180), now).reason, 'weak');
  assert.equal(checkGpsPosition(position(-23.1348, 150.7436, 7, now-50000), now).reason, 'stale');
  assert.equal(checkGpsPosition(position(181, 150.7436), now).reason, 'invalid');
});

test('remote GPS positions cannot overwrite preview distances at another course', () => {
  const qld = checkGpsPosition(position(-27.4698, 153.0251), now).fix;
  assert.equal(courseGpsMode(qld, hole, now), 'preview');
  assert.ok(metresBetween(qld.coords, hole.tee) > 100000);
});

test('estimated hole never counts as on-course GPS guidance', () => {
  const fix = checkGpsPosition(position(-23.1348, 150.7436), now).fix;
  assert.equal(courseGpsMode(fix, { ...hole, estimated: true }, now), 'unverified');
  assert.equal(courseGpsMode(fix, hole, now+60000), 'preview');
});

test('GPS shot origin switches between the live fix and the mapped tee', async () => {
  const { selectShotOrigin } = await import('../src/lib/gpsTracking.js');
  const tee = [-23.1348, 150.7436];
  const fix = { coords: [-23.1339, 150.7441], accuracy: 6, timestamp: now };
  assert.deepEqual(selectShotOrigin(fix, 'live', tee), fix.coords);
  assert.deepEqual(selectShotOrigin(fix, 'preview', tee), tee);
  assert.deepEqual(selectShotOrigin(null, 'preview', tee), tee);
});
