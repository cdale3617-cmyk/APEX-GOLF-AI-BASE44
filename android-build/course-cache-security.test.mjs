import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCourseInput, courseCacheKey, readSmallJson, createLookupLimiter } from '../base44/functions/getCourseHoles/validation.js';

const input = { center: [-23.1, 150.7], bbox: [-23.11, -23.09, 150.69, 150.71], osmId: 123, osmType: 'way' };
test('valid course query accepts geographic coordinates and bounded identities', () => {
  assert.deepEqual(parseCourseInput(input), { bbox: input.bbox, center: input.center, osmId: 123, osmType: 'way' });
});
test('invalid identities and broad/inconsistent bounds are rejected', () => {
  for (const body of [
    {}, [], null, { center: [null, 0] }, { center: [NaN, 0] }, { center: [91, 0] },
    { center: ['1', 0] }, { bbox: [-90, 90, -180, 180] }, { bbox: [2, 1, 3, 4] },
    { osmId: -1, osmType: 'way' }, { osmId: 1, osmType: 'node' },
    { ...input, center: [0, 0] },
  ]) assert.throws(() => parseCourseInput(body));
});
test('arbitrary course keys cannot alias different geometry in the shared cache', async () => {
  const a = await courseCacheKey(parseCourseInput({ ...input, courseKey: 'victim' }));
  const b = await courseCacheKey(parseCourseInput({ ...input, courseKey: 'attacker' }));
  const c = await courseCacheKey(parseCourseInput({ center: [0, 0], courseKey: 'victim' }));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^v2:[a-f0-9]{64}$/);
});
test('body parser rejects malformed JSON and excessive streamed bodies', async () => {
  await assert.rejects(readSmallJson(new Request('https://test/', { method: 'POST', body: '{' })), /Invalid JSON/);
  await assert.rejects(readSmallJson(new Request('https://test/', { method: 'POST', body: 'x'.repeat(8193) })), /too large/);
});
test('lookup limiter is bounded per user and expires old windows', () => {
  let now = 0;
  const take = createLookupLimiter({ limit: 2, maxUsers: 1, windowMs: 10, now: () => now });
  assert.equal(take('a'), true);
  assert.equal(take('a'), true);
  assert.equal(take('a'), false);
  assert.equal(take('b'), false);
  now = 11;
  assert.equal(take('b'), true);
});
test('authentication and validation precede every privileged cache access', () => {
  const source = readFileSync(new URL('../base44/functions/getCourseHoles/entry.ts', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('export default'));
  assert.ok(handler.indexOf('base44.auth.me()') < handler.indexOf('asServiceRole'));
  assert.ok(handler.indexOf('parseCourseInput') < handler.indexOf('asServiceRole'));
  assert.ok(handler.includes('status: 401'));
  assert.ok(handler.includes('status: 429'));
});
