import test from 'node:test';
import assert from 'node:assert/strict';
import { answerVoiceQuery } from '../src/lib/voiceEngine.js';
import { toDisplayDistance, distanceUnitSpoken } from '../src/lib/units.js';

const base = {
  clubs: [{ name: '7 Iron', carry: 150, average: 148, samples: 3, active: true }],
  distances: { direct: 200, playsLike: 210, seg1: 100, seg2: 100, wind: { label: 'crosswind', yards: 0 } },
  env: { windSpeed: 0, windDir: 'N', temp: 70 },
  stats: { holes: 0 }, strokes: [], bpm: 76, shots: [], holeNumber: 1,
  briefing: () => 'Briefing', 
};

for (const units of ['metric', 'imperial']) {
  test('Caddie distances follow selected '+units+' units', () => {
    const ctx = { ...base, units };
    const expected = units === 'metric' ? 'metres' : 'yards';
    for (const question of ['How far to the pin?', 'What is my layup split?', 'How far does my 7 Iron carry?']) {
      const reply = answerVoiceQuery(question, ctx);
      assert.ok(reply?.includes(expected), question + ': ' + reply);
      assert.equal(reply.includes(units === 'metric' ? 'yards' : 'metres'), false, reply);
    }
    assert.equal(distanceUnitSpoken(units), expected);
    assert.equal(toDisplayDistance(100, units), units === 'metric' ? 91 : 100);
  });
}
