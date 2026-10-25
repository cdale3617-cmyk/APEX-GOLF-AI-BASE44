import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { holeGraphicsBounds, selectHoleGraphics } from '../src/lib/holeGraphics.js';

const hole = { number: 1, tee: [-23.1, 150.7], pin: [-23.098, 150.702], layup: [-23.099, 150.703] };
const polygon = (ring, properties = {}) => ({
  type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [ring] },
});
const collection = (...features) => ({ type: 'FeatureCollection', features });
const wide = [[150.69, -23.11], [150.71, -23.11], [150.71, -23.09], [150.69, -23.09], [150.69, -23.11]];

test('selected-hole bounds cover its dogleg but do not invent estimated geometry', () => {
  const box = holeGraphicsBounds(hole);
  assert.ok(box.east > hole.layup[1] && box.south < hole.tee[0]);
  assert.equal(holeGraphicsBounds({ ...hole, estimated: true }), null);
  assert.equal(holeGraphicsBounds({ ...hole, pin: [NaN, 0] }), null);
});

test('whole-course polygons are clipped to the active hole without mutating downloads', () => {
  const graphics = { fairway: collection(polygon(wide)) };
  const original = JSON.stringify(graphics);
  const selected = selectHoleGraphics(graphics, hole);
  const box = holeGraphicsBounds(hole);
  assert.equal(selected.fairway.features.length, 1);
  const ring = selected.fairway.features[0].geometry.coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  for (const [lng, lat] of ring) {
    assert.ok(lng >= box.west - 1e-9 && lng <= box.east + 1e-9);
    assert.ok(lat >= box.south - 1e-9 && lat <= box.north + 1e-9);
  }
  assert.equal(JSON.stringify(graphics), original);
});

test('off-hole polygons and explicitly numbered neighbouring features are excluded', () => {
  const distant = wide.map(([lng, lat]) => [lng + 0.1, lat + 0.1]);
  const selected = selectHoleGraphics({ green: collection(
    polygon(distant), polygon(wide, { holeNumber: 2 }), polygon(wide, { holeNumber: 1 }),
  ) }, hole);
  assert.equal(selected.green.features.length, 1);
  assert.equal(selected.green.features[0].properties.holeNumber, 1);
});

test('old downloaded hole lines cannot overlay the active shot plan', () => {
  const selected = selectHoleGraphics({ hole: collection({
    type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[150.7, -23.1], [150.702, -23.098]] },
  }) }, hole);
  assert.equal(selected.hole.features.length, 0);
  assert.equal(selectHoleGraphics(null, hole), null);
});

test('switching to a distant hole empties the previous artwork', () => {
  const graphics = { fairway: collection(polygon(wide)) };
  assert.equal(selectHoleGraphics(graphics, hole).fairway.features.length, 1);
  const next = { number: 2, tee: [-23.08, 150.72], pin: [-23.078, 150.722] };
  assert.equal(selectHoleGraphics(graphics, next).fairway.features.length, 0);
});

test('live play uses a cancellable hole-scoped request and clears every old map layer', () => {
  const page = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/lib/courseGraphics.js', import.meta.url), 'utf8');
  const liveFetch = source.slice(source.indexOf('export async function fetchHoleGraphics'));
  const map = readFileSync(new URL('../src/components/rangefinder/MapLibreHoleMap.jsx', import.meta.url), 'utf8');
  assert.ok(page.includes('fetchHoleGraphics(course, hole, { signal: controller.signal })'));
  assert.ok(page.includes('controller.abort()'));
  assert.ok(page.includes('holeGraphics?.key === activeGraphicsKey'));
  assert.ok(!liveFetch.includes('fetchCloudElements') && !liveFetch.includes('around:1500'));
  assert.ok(liveFetch.includes('way(${box})[golf]'));
  assert.ok(map.includes('source.setData(graphics?.[id] ?? EMPTY)'));
});
