import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHoleCamera, holeGeometryKey } from '../src/lib/holeCamera.js';

const hole = { tee: [-23.15, 150.73], layup: [-23.151, 150.734], pin: [-23.153, 150.731] };
test('selected-hole camera centres the actual points without modifying geometry', () => {
  const before = JSON.stringify(hole);
  const view = buildHoleCamera(hole);
  assert.ok(view.center[0] >= 150.73 && view.center[0] <= 150.734);
  assert.ok(view.center[1] >= -23.153 && view.center[1] <= -23.15);
  assert.ok(Number.isFinite(view.zoom));
  assert.equal(view.bounds, undefined);
  assert.equal(JSON.stringify(hole), before);
});
test('padding leaves usable map space on narrow and short phone panels', () => {
  for (const [width, height] of [[160, 240], [234, 600], [390, 260], [800, 600]]) {
    const { padding } = buildHoleCamera(hole, { width, height });
    assert.ok(padding.left + padding.right < width * 0.5);
    assert.ok(padding.top + padding.bottom < height * 0.5);
  }
});
test('3D bearing and pitch are part of the same framing operation', () => {
  const view = buildHoleCamera(hole, { pitchOn: true, bearing: 122 });
  assert.equal(view.pitch, 40);
  assert.equal(view.bearing, 122);
  assert.equal(buildHoleCamera(hole).pitch, 0);
});
test('unknown and estimated geometry does not frame an invented playable hole', () => {
  assert.equal(buildHoleCamera(null), null);
  assert.equal(buildHoleCamera({ ...hole, estimated: true }), null);
  assert.equal(buildHoleCamera({ ...hole, pin: [NaN, 150] }), null);
});
test('coincident endpoints use a safe point camera', () => {
  const view = buildHoleCamera({ tee: [-23.15, 150.73], pin: [-23.15, 150.73] });
  assert.deepEqual(view.center, [150.73, -23.15]);
  assert.equal(view.zoom, 17);
});
test('map frames selected hole geometry rather than delayed editable coordinates', () => {
  const map = readFileSync(new URL('../src/components/rangefinder/MapLibreHoleMap.jsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');
  assert.ok(page.includes('activeHole={hole}'));
  assert.ok(map.includes('buildHoleCamera(displayedHole'));
  assert.ok(page.includes('coordsHoleKey === activeGraphicsKey'));
  assert.ok(map.includes('[ready, activeHole, focus?.nonce, holeReady, courseCenter, pitchOn]'));
  assert.ok(map.includes('new ResizeObserver'));
});

test('diagonal phone holes fit the actual rotated route, not the wide bounding rectangle', () => {
  const diagonal = { tee: [-23.1, 150.7], layup: [-23.099, 150.701], pin: [-23.098, 150.702] };
  const view = buildHoleCamera(diagonal, { width: 234, height: 650, bearing: 42.6 });
  // The old geographical rectangle constrained zoom to the 234px width.
  assert.ok(view.zoom > 16.4, `Diagonal route remained zoomed out: ${view.zoom}`);
  assert.equal(view.bearing, 42.6);
  assert.equal(view.pitch, 0);
});

test('geometry keys distinguish course, hole and new mapping revisions', () => {
  assert.notEqual(holeGeometryKey('a', { ...hole, number: 1 }), holeGeometryKey('b', { ...hole, number: 1 }));
  assert.notEqual(holeGeometryKey('a', { ...hole, number: 1 }), holeGeometryKey('a', { ...hole, number: 2 }));
  assert.notEqual(holeGeometryKey('a', hole), holeGeometryKey('a', { ...hole, pin: [-23.16, 150.73] }));
});
