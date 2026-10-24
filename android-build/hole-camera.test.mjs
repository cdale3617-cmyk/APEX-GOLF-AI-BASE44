import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHoleCamera } from '../src/lib/holeCamera.js';

const hole = { tee: [-23.15, 150.73], layup: [-23.151, 150.734], pin: [-23.153, 150.731] };
test('selected-hole camera includes tee, target and green in longitude/latitude bounds', () => {
  const before = JSON.stringify(hole);
  const view = buildHoleCamera(hole);
  assert.deepEqual(view.bounds, [[150.73, -23.153], [150.734, -23.15]]);
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
  assert.match(page, /activeHole={hole}/);
  assert.match(map, /buildHoleCamera(activeHole/);
  assert.match(map, /[ready, activeHole, focus?.nonce, holeReady, courseCenter, pitchOn]/);
  assert.match(map, /new ResizeObserver/);
});
