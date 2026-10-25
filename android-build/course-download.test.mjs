import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflinePack, validateOfflinePack } from '../src/lib/offlineCourseStorage.js';
import { downloadOfflineCourse } from '../src/lib/courseDownload.js';

const course = { id: 'test-course', name: 'Download Test Course', center: [-23, 150] };
const holes = [
  { number: 3, par: 3, yards: 150, tee: [-23, 150], layup: [-23.001, 150], pin: [-23.002, 150] },
  { number: 9, par: 5, yards: 500, tee: [-23.003, 150], layup: [-23.004, 150], pin: [-23.005, 150] },
];
const graphics = { green: { type: 'FeatureCollection', features: [] } };

test('offline packs preserve actual hole numbers and pars without inventing missing holes', () => {
  const pack = createOfflinePack(course, holes, graphics);
  assert.deepEqual(pack.holes.map((h) => [h.number, h.par]), [[3, 3], [9, 5]]);
  assert.equal(pack.id, course.id);
  assert.equal(validateOfflinePack(pack), pack);
});

test('offline packs reject empty, estimated, duplicated or invalid hole data', () => {
  for (const invalid of [
    [], [{ ...holes[0], estimated: true }], [holes[0], holes[0]],
    [{ ...holes[0], pin: [999, 150] }], [{ ...holes[0], par: 2 }],
  ]) assert.throws(() => createOfflinePack(course, invalid));
});

test('offline packs reject mismatched identity and invalid feature collections', () => {
  assert.throws(() => validateOfflinePack({ ...createOfflinePack(course, holes), id: 'another-course' }));
  assert.throws(() => createOfflinePack(course, holes, { green: { type: 'Polygon', features: [] } }));
});

test('downloads report actual phases and become ready only after verified persistence', async () => {
  const steps = [], calls = [];
  const pack = await downloadOfflineCourse(course, {
    loadHoles: async () => { calls.push('holes'); return holes; },
    loadGraphics: async () => { calls.push('graphics'); return graphics; },
    save: async (value) => { calls.push('save'); assert.deepEqual(steps, [1, 2, 3]); return value; },
    onProgress: (stage) => steps.push(stage.step),
  });
  assert.deepEqual(calls, ['holes', 'graphics', 'save']);
  assert.deepEqual(steps, [1, 2, 3, 4]);
  assert.equal(pack.graphics, graphics);
});

test('unmapped courses fail before graphics lookup or persistence', async () => {
  await assert.rejects(downloadOfflineCourse(course, {
    loadHoles: async () => [],
    loadGraphics: async () => assert.fail('must not fetch graphics'),
    save: async () => assert.fail('must not save'),
  }), /No mapped holes/);
});

test('unavailable graphics still allow an honestly labelled hole-only download', async () => {
  const pack = await downloadOfflineCourse(course, {
    loadHoles: async () => holes,
    loadGraphics: async () => { throw new Error('provider unavailable'); },
    save: async (value) => value,
  });
  assert.equal(pack.graphics, null);
});

test('failed refresh leaves the previous download untouched', async () => {
  const previous = createOfflinePack(course, holes);
  let saved = previous;
  await assert.rejects(downloadOfflineCourse(course, {
    loadHoles: async () => { throw new Error('offline'); },
    loadGraphics: async () => graphics,
    save: async (value) => { saved = value; return value; },
  }), /offline/);
  assert.equal(saved, previous);
});

test('blocked storage never reports a completed download', async () => {
  const steps = [];
  await assert.rejects(downloadOfflineCourse(course, {
    loadHoles: async () => holes, loadGraphics: async () => graphics,
    save: async () => { throw new Error('storage full'); },
    onProgress: (stage) => steps.push(stage.step),
  }), /storage full/);
  assert.deepEqual(steps, [1, 2, 3]);
});

test('concurrent downloads cannot race to replace the same course', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const job = downloadOfflineCourse(course, {
    loadHoles: () => pending, loadGraphics: async () => null, save: async (value) => value,
  });
  await assert.rejects(downloadOfflineCourse(course, {
    loadHoles: async () => holes, loadGraphics: async () => null,
  }), /already running/);
  release(holes);
  await job;
});
