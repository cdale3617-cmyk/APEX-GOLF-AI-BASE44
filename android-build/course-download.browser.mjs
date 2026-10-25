import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
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
    geometry: [{ lat: -23.1 + i * 0.004, lon: 150.7 }, { lat: -23.098 + i * 0.004, lon: 150.702 }] })),
  { type: 'way', id: 200, tags: { golf: 'fairway' }, geometry: [
    { lat: -23.1, lon: 150.7 }, { lat: -23.097, lon: 150.7 },
    { lat: -23.097, lon: 150.703 }, { lat: -23.1, lon: 150.7 },
  ] },
];
const base = 'http://localhost:4173';
let offline = false, unavailable = false, mapRequestsOffline = 0;
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin === base && !url.pathname.startsWith('/api/')) return route.continue();
  if (offline) {
    if (/fetch-course-vector|getCourseHoles|overpass|arcgisonline|cartocdn/.test(route.request().url())) mapRequestsOffline++;
    return route.abort();
  }
  if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
  if (/arcgisonline.com|cartocdn.com/.test(url.hostname)) return route.fulfill({
    contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
  });
  if (unavailable && !url.pathname.includes('public-settings')) return route.fulfill({ status: 503, body: '{}' });
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements, courses: [], features: [] }) });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const go = (path) => page.goto(base + path, { waitUntil: 'domcontentloaded' });
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
  await context.close();
  await browser.close();
}
