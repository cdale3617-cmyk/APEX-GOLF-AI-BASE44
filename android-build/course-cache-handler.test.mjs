import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { courseCacheKey, parseCourseInput } from '../base44/functions/getCourseHoles/validation.js';

// Exercise the real handler with only its SDK boundary replaced by a fixture.
// No Base44 account, network calls, credentials or production writes are used.
const url = new URL('../base44/functions/getCourseHoles/entry.ts', import.meta.url);
const source = (await readFile(url, 'utf8'))
  .replace(/^import \{ createClientFromRequest \} from 'npm:@base44\/sdk@[^']+';/m,
    'const createClientFromRequest = () => globalThis.__courseHandlerTestClient;')
  .replace("'./validation.js'", JSON.stringify(new URL('../base44/functions/getCourseHoles/validation.js', import.meta.url).href));
const handler = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const request = (body) => new Request('https://fixture.invalid/getCourseHoles', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
});
const denyService = (user) => ({
  auth: { me: async () => user },
  get asServiceRole() { assert.fail('shared service must not be accessed'); },
});

test('handler rejects unsupported methods before SDK access', async () => {
  globalThis.__courseHandlerTestClient = null;
  const response = await handler(new Request('https://fixture.invalid', { method: 'GET' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});

test('handler requires authentication before shared-cache access', async () => {
  globalThis.__courseHandlerTestClient = denyService(null);
  assert.equal((await handler(request({ center: [-23, 150] }))).status, 401);
});

test('handler validates location before privileged cache lookup', async () => {
  globalThis.__courseHandlerTestClient = denyService({ id: 'validation-fixture' });
  assert.equal((await handler(request({ center: [999, 150] }))).status, 400);
});

test('handler rejects oversized streamed bodies before shared-cache access', async () => {
  globalThis.__courseHandlerTestClient = denyService({ id: 'size-fixture' });
  assert.equal((await handler(request(' '.repeat(9000)))).status, 413);
});

test('handler reads only the canonical validated cache key and returns a cache hit', async () => {
  const input = { courseKey: 'victim-course', center: [-23, 150] };
  const expected = await courseCacheKey(parseCourseInput(input));
  const elements = [{ type: 'way', id: 123, tags: { golf: 'hole' } }];
  globalThis.__courseHandlerTestClient = {
    auth: { me: async () => ({ id: 'cache-fixture' }) },
    asServiceRole: { entities: { CourseMap: {
      filter: async (query) => {
        assert.deepEqual(query, { course_key: expected });
        assert.notEqual(query.course_key, input.courseKey);
        return [{ elements }];
      },
      create: async () => assert.fail('a cache hit must not create a record'),
    } } },
  };
  const response = await handler(request(input));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { elements, cached: true });
});

test('handler masks internal service errors', async () => {
  globalThis.__courseHandlerTestClient = {
    auth: { me: async () => ({ id: 'error-fixture' }) },
    asServiceRole: { entities: { CourseMap: { filter: async () => { throw new Error('internal connection details'); } } } },
  };
  const response = await handler(request({ center: [-23, 150] }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /internal connection/);
});
