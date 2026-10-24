import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDefaultScorecard, computeRoundStats, strokesGained } from '../src/lib/golfData.js';
import { applyCoursePars, hasRoundData } from '../src/lib/roundLifecycle.js';
import { addRound, buildRound, loadRounds } from '../src/lib/roundHistory.js';
import { handicapIndex } from '../src/lib/handicap.js';

const holes = [{ number: 1, par: 3 }, { number: 4, par: 5 }];
const card = () => createDefaultScorecard(holes).map((row) => ({ ...row, score: row.par + 1 }));
const saved = (courseId, session = 'session-a') => buildRound({
  scorecard: card(), courseId, courseName: courseId, roundSessionId: session, shots: [],
});
function storage() {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('fresh and reset cards preserve real course hole numbers and pars', () => {
  const fresh = createDefaultScorecard(holes);
  assert.deepEqual(fresh.map(({ hole, par }) => [hole, par]), [[1, 3], [4, 5]]);
  assert.ok(fresh.every((row) => row.score === 0 && row.fir === null && row.gir === null && row.putts === null));
  const previous = [{ hole: 4, par: 4, score: 6 }, { hole: 1, par: 4, score: 3 }];
  assert.deepEqual(applyCoursePars(previous, holes).map(({ hole, par, score }) => [hole, par, score]), [[1, 3, 3], [4, 5, 6]]);
});
test('round data detection includes shots before a score is entered', () => {
  assert.equal(hasRoundData(createDefaultScorecard(), [{ roundSessionId: 'a' }], 'a'), true);
  assert.equal(hasRoundData(createDefaultScorecard(), [{ roundSessionId: 'a' }], 'b'), false);
});
test('repeat save updates the same round but different courses cannot reuse its identity', () => {
  storage();
  addRound(saved('course-a'));
  const id = loadRounds()[0].id;
  addRound(saved('course-a'));
  assert.equal(loadRounds().length, 1);
  assert.equal(loadRounds()[0].id, id);
  assert.throws(() => addRound(saved('course-b')), /new round/);
  assert.equal(loadRounds()[0].courseName, 'course-a');
  addRound(saved('course-b', 'session-b'));
  assert.equal(loadRounds().length, 2);
});
test('blocked storage reports failure rather than falsely claiming a save', () => {
  storage();
  globalThis.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => addRound(saved('course-a')), /could not be saved/);
});
test('FIR excludes par threes and unrecorded outcomes; unknown is not a miss', () => {
  const stats = computeRoundStats([
    { hole: 1, par: 3, score: 3, fir: true, gir: true, putts: 1 },
    { hole: 2, par: 4, score: 4, fir: true, gir: null, putts: null },
    { hole: 3, par: 5, score: 6, fir: null, gir: false, putts: 3 },
  ]);
  assert.equal(stats.firPct, 100);
  assert.equal(stats.firRecorded, 1);
  assert.equal(stats.girPct, 50);
  assert.equal(stats.avgPutts, 2);
  assert.equal(stats.puttsRecorded, 2);
  assert.deepEqual(strokesGained(computeRoundStats(card())), [0, 0, 0, 0]);
});
test('handicap estimate exposes the actual best-round sample size', () => {
  const rounds = Array.from({ length: 10 }, (_, i) => ({ stats: { holes: 18, diff: i + 1 } }));
  assert.equal(handicapIndex(rounds).selected, 3);
  assert.equal(handicapIndex(rounds.slice(0, 3)).selected, 1);
});
test('provider requires confirmation and successful persistence before a course switch', () => {
  const source = readFileSync(new URL('../src/lib/GolfContext.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('if (stats.holes && !saveRound())'));
  assert.ok(source.includes('setScorecard(createDefaultScorecard(holes))'));
  assert.ok(source.includes('setRoundSessionId(newRoundSessionId())'));
});
