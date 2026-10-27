import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('browser-evidence', { recursive: true });

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
  ...(process.env.PLAYWRIGHT_VIDEO === '1' ? { recordVideo: { dir: 'browser-evidence', size: { width: 390, height: 844 } } } : {}),
});
await context.addInitScript(() => {
  if (localStorage.getItem('course-download-browser-test')) return;
  localStorage.clear();
  localStorage.setItem('apex_golf_courses_v1', JSON.stringify([
    { id: 'offline-test-course', name: 'Offline Test Course', location: 'Test Town', center: [-23.1, 150.7] },
  ]));
  localStorage.setItem('course-download-browser-test', 'yes');
});
const elements = [
  ...[0, 1].map((i) => ({ type: 'way', id: 100 + i,
    tags: { golf: 'hole', ref: String(i + 1), par: String(i ? 5 : 3) },
    geometry: i
      ? [{ lat: -23.094, lon: 150.702 }, { lat: -23.096, lon: 150.7 }]
      : [{ lat: -23.1, lon: 150.7 }, { lat: -23.098, lon: 150.702 }] })),
  { type: 'way', id: 200, tags: { golf: 'fairway' }, geometry: [
    { lat: -23.1, lon: 150.7 }, { lat: -23.097, lon: 150.7 },
    { lat: -23.097, lon: 150.703 }, { lat: -23.1, lon: 150.7 },
  ] },
];
const base = 'http://localhost:4173';
let offline = false, unavailable = false, mapRequestsOffline = 0;
const holeQueries = [];
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin === base && !url.pathname.startsWith('/api/')) return route.continue();
  if (offline) {
    if (/fetch-course-vector|getCourseHoles|overpass|arcgisonline|cartocdn/.test(route.request().url())) mapRequestsOffline++;
    return route.abort();
  }
  if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
  if (/arcgisonline.com|cartocdn.com/.test(url.hostname)) return route.fulfill({
    contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOQ0JMEAADBAGDVwUpfAAAAAElFTkSuQmCC', 'base64'),
  });
  if (unavailable && !url.pathname.includes('public-settings')) return route.fulfill({ status: 503, body: '{}' });
  const query = new URLSearchParams(route.request().postData() || '').get('data');
  if (query?.includes('[golf];way(')) holeQueries.push(query);
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    elements, courses: [{ id: 'offline-test-course', name: 'Offline Test Course', location: 'Test Town', center: [-23.1, 150.7] }], features: [],
  }) });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const go = (path) => page.goto(base + path, { waitUntil: 'domcontentloaded' });
const checkHoleView = (minimumSpan = 0.45) => page.waitForFunction((fraction) => {
  const map = document.querySelector('[data-testid="play-map-panel"]')?.getBoundingClientRect();
  if (!map) return false;
  const points = ['tee', 'layup', 'pin'].map((key) => {
    const rect = document.querySelector(`.maplibregl-marker[data-marker-key="${key}"]`)?.getBoundingClientRect();
    return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
  });
  const attribution = document.querySelector('.maplibregl-ctrl-attrib')?.getBoundingClientRect();
  return document.querySelector('[data-rendered-plan-points]')?.getAttribute('data-rendered-plan-points') === '3' &&
    (!attribution || points.every((p) => p && (p.x < attribution.left || p.x > attribution.right ||
      p.y < attribution.top || p.y > attribution.bottom))) &&
    points.every((p) => p && p.x > map.left + 10 && p.x < map.right - 10 &&
    p.y > map.top + 10 && p.y < map.bottom - 10) &&
    points[0].y - points[2].y > map.height * fraction;
}, minimumSpan).catch(async (error) => {
  console.log('HOLE_VIEW_DIAGNOSTICS', JSON.stringify(await page.evaluate(() => ({
    map: document.querySelector('[data-testid="play-map-panel"]')?.getBoundingClientRect().toJSON(),
    canvas: document.querySelector('.maplibregl-canvas')?.getBoundingClientRect().toJSON(),
    renderedPlanPoints: document.querySelector('[data-rendered-plan-points]')?.getAttribute('data-rendered-plan-points'),
    markers: [...document.querySelectorAll('.maplibregl-marker')].map((el) => ({
      label: el.getAttribute('aria-label'), title: el.getAttribute('title'), rect: el.getBoundingClientRect().toJSON(),
    })),
  }))));
  throw error;
});
page.on('console', (message) => {
  if (message.type() === 'error') console.log('BROWSER_CONSOLE_ERROR', message.text());
});
const stored = () => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('apex-offline-courses', 1);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result, tx = db.transaction('packs', 'readonly');
    const get = tx.objectStore('packs').get('offline-test-course');
    get.onsuccess = () => resolve(get.result);
    tx.oncomplete = () => db.close();
  };
}));
try {
  // The live search flow must work without downloading an offline pack first.
  await go('/play?choose=1');
  await page.getByPlaceholder('Search golf course or city…').fill('Offline Test Course');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await page.getByRole('button', { name: /^Offline Test Course/ }).first().click();
  await page.getByText(/Hole 1\/2/).first().waitFor();
  assert.equal(await stored(), undefined);
  await page.waitForFunction(() => document.querySelector('[data-testid="play-map-panel"]')?.getAttribute('data-vector-features') === '1');
  await page.waitForFunction(() => document.querySelector('[data-testid="hole-map-canvas"]')?.getAttribute('data-map-ready') === 'true');
  await page.locator('.maplibregl-ctrl-attrib summary').click();
  await page.waitForFunction(() => document.querySelector('.maplibregl-ctrl-attrib')?.hasAttribute('open'));
  const credits = page.locator('.maplibregl-ctrl-attrib-inner');
  assert.equal(await credits.isVisible(), true);
  const creditText = await credits.innerText();
  for (const name of ['Esri', 'OpenStreetMap', 'CARTO']) assert.ok(creditText.includes(name));
  await page.locator('.maplibregl-ctrl-attrib summary').click();
  await page.waitForFunction(() => !document.querySelector('.maplibregl-ctrl-attrib')?.hasAttribute('open'));
  for (const [width, height] of [[390, 844], [320, 640], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => {
      const area = document.querySelector('[data-testid="live-round-layout"]')?.getBoundingClientRect();
      const map = document.querySelector('[data-testid="play-map-panel"]')?.getBoundingClientRect();
      const controls = document.querySelector('[data-testid="play-controls-panel"]')?.getBoundingClientRect();
      return area && map && controls && Math.abs(map.width / area.width - 0.6) < 0.005 &&
        Math.abs(controls.width / area.width - 0.4) < 0.005 && Math.abs(controls.left - map.right) < 2 &&
        Math.abs(map.height - area.height) < 2 && Math.abs(controls.height - area.height) < 2;
    });
    await checkHoleView();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.getByTestId('play-controls-panel').evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
    if (width === 390 || width === 844) {
      const layoutShot = await page.screenshot({ path: `browser-evidence/play-${width}x${height}.png` });
      if (width === 390 && process.env.PLAYWRIGHT_VIDEO) {
        const encoded = layoutShot.toString('base64');
        for (let i = 0; i < encoded.length; i += 16000) console.log('BROWSER_PHONE_PNG_CHUNK ' + encoded.slice(i, i + 16000));
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Next hole', exact: true }).first().click();
  await page.getByText(/Hole 2\/2/).first().waitFor();
  await checkHoleView();
  assert.equal(await page.getByTestId('play-map-panel').getAttribute('data-vector-features'), '0');
  await page.getByRole('button', { name: 'Previous hole', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="play-map-panel"]')?.getAttribute('data-vector-features') === '1');
  await checkHoleView();
  await page.getByRole('button', { name: 'Switch to 3D view' }).click();
  await checkHoleView(0.2);
  await page.getByRole('button', { name: 'Switch to flat view' }).click();
  await checkHoleView();
  // A restored, user-edited plan must be framed too, not the old mapped points.
  await page.evaluate(() => localStorage.setItem('apex_shot_plans_v1', JSON.stringify({
    'offline-test-course/1': {
      tee: [-23.099, 150.701], layup: [-23.098, 150.702], pin: [-23.097, 150.703],
    },
  })));
  await go('/play');
  await checkHoleView();
  assert.equal(await page.getByPlaceholder('Search golf course or city…').count(), 0);
  await page.evaluate(() => localStorage.removeItem('apex_shot_plans_v1'));
  await go('/play');
  await checkHoleView();
  assert.ok(holeQueries.length >= 2);
  assert.ok(holeQueries.every((query) => !query.includes('around:1500')));
  console.log('PASS reference-matching left60/right40 full-height layout at four sizes; full tee-target-green camera, reversed-hole navigation, 3D, restored plans and hidden search');

  await go('/courses');
  await page.getByLabel('Search courses or towns').fill('Test Town');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await page.getByRole('button', { name: 'Download Offline Test Course' }).waitFor();
  await page.getByRole('button', { name: 'Download Offline Test Course' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  const first = await stored();
  assert.deepEqual(first.holes.map((hole) => hole.par), [3, 5]);
  assert.equal(first.graphics.fairway.features.length, 1);
  console.log('PASS downloaded, verified mapped holes and vector features');

  offline = true;
  await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }));
  await go('/courses');
  await page.getByText('Offline mode', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Update', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByText(/Hole 1\/2/).first().waitFor();
  await page.getByRole('button', { name: 'Next hole', exact: true }).first().click();
  await page.getByText(/Hole 2\/2/).first().waitFor();
  await go('/scorecard');
  await page.getByLabel('Hole 1 par', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-label="Hole 1 par"]')?.value === '3');
  assert.equal(await page.getByLabel('Hole 2 par', { exact: true }).inputValue(), '5');
  await page.getByLabel('Hole 1 score', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  assert.equal(mapRequestsOffline, 0);
  console.log('PASS offline reopen, hole navigation, actual pars and score saving without map requests');

  await go('/courses');
  await page.getByRole('button', { name: 'Update', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Update', exact: true }).isDisabled(), true);
  offline = false; unavailable = true;
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
    window.dispatchEvent(new Event('online'));
  });
  await page.getByText('Your offline course library', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal((await stored()).savedAt, first.savedAt);
  unavailable = false;
  await page.evaluate(() => {
    window.restoreOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = () => { throw new DOMException('Storage blocked for test', 'SecurityError'); };
  });
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await page.getByText('Storage blocked for test', { exact: true }).waitFor();
  await page.evaluate(() => { IDBFactory.prototype.open = window.restoreOpen; });
  assert.equal((await stored()).savedAt, first.savedAt);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove download for Offline Test Course' }).click();
  await page.getByText('Offline download removed. Saved rounds and favourites are unchanged.', { exact: true }).waitFor();
  assert.equal(await stored(), undefined);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('apex_golf_rounds_v1')).length), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS refresh failure, storage failure, removal preserving saved rounds and phone layout');
} finally {
  // CI contains only mocked course data. Emit the small screenshot in chunks
  // as well as the video artifact so failed visual checks can be inspected
  // through the read-only logs API (which caps artifact responses at 1 MB).
  const finalShot = await page.screenshot({ path: 'browser-evidence/final-state.png' }).catch(() => null);
  if (process.env.PLAYWRIGHT_VIDEO && finalShot) {
    const encoded = finalShot.toString('base64');
    for (let i = 0; i < encoded.length; i += 16000) console.log('BROWSER_FINAL_PNG_CHUNK ' + encoded.slice(i, i + 16000));
  }
  await context.close();
  await browser.close();
}
