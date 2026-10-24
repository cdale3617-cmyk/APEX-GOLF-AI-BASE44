import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare-worker/worker.js';

const course = { id: 'osm-way-123', name: 'Yeppoon Golf Club', location: 'Queensland', center: [-23.1, 150.7] };
const geometry = { elements: [{ type: 'way', id: 1, tags: { golf: 'hole' }, geometry: [{ lat: -23.1, lon: 150.7 }] }] };
const files = new Map([['courses/index.json', [course]], ['courses/osm-way-123.json', geometry]]);
const env = { COURSES_BUCKET: {
  get: async (key) => files.has(key) ? { json: async () => files.get(key) } : null,
  list: async () => ({ objects: [...files.keys()].map((key) => ({ key, size: 100 })), truncated: false }),
} };
const call = (path, options) => worker.fetch(new Request('https://cache.test' + path, options), env);
test('Worker implements frontend course search and vector contracts', async () => {
  const search = await call('/api/search?query=yeppoon');
  assert.equal(search.status, 200);
  assert.deepEqual(await search.json(), [course]);
  const vector = await call('/api/fetch-course-vector?id=osm-way-123&lat=-23.1&lng=150.7');
  assert.deepEqual(await vector.json(), geometry);
  assert.equal((await call('/health')).status, 200);
});
test('cache misses, invalid identifiers and unavailable indexes are explicit', async () => {
  assert.equal((await call('/api/fetch-course-vector?id=missing')).status, 404);
  assert.equal((await call('/api/fetch-course-vector?id=..%2Fsecret')).status, 400);
  assert.equal((await call('/api/fetch-course-vector?id=osm-way-123&lat=&lng=')).status, 400);
  assert.equal((await call('/api/search?query=')).status, 400);
  const index = files.get('courses/index.json');
  files.delete('courses/index.json');
  try { assert.equal((await call('/api/search?query=yeppoon')).status, 503); }
  finally { files.set('courses/index.json', index); }
});
test('Worker is read-only, CORS-aware, and excludes its manifest from inventory', async () => {
  assert.equal((await call('/courses', { method: 'POST', body: '{}' })).status, 405);
  const options = await call('/api/search', { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-origin'), '*');
  const listing = await (await call('/courses')).json();
  assert.deepEqual(listing.courses.map((row) => row.id), ['osm-way-123']);
});
