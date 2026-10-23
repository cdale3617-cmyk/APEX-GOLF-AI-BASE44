import test from 'node:test';
import assert from 'node:assert/strict';
import { answerVoiceQuery } from '../src/lib/voiceEngine.js';
import { fromDisplayDistance, toDisplayDistance } from '../src/lib/units.js';

const context = {
  units: 'metric',
  clubs: [{ id: '8i', name: '8-Iron', carry: 148, active: true }],
  distances: {
    seg1: 160, seg2: 105, playsLike: 265,
    wind: { label: 'headwind', yards: 8 },
  },
  env: { windSpeed: 12, windDir: 'NE', temp: 77 },
  shots: [], stats: { holes: 0 }, briefing: () => 'Club advice',
};

test('metric caddie advice never announces yard or Fahrenheit values', () => {
  for (const question of ['How far to the pin?', 'What is the layup?', 'How far does my 8 iron carry?', 'What is the wind and weather?']) {
    const answer = answerVoiceQuery(question, context);
    assert.ok(answer, question);
    assert.doesNotMatch(answer, /\byards?\b|\byds?\b|fahrenheit|miles per hour/i);
  }
  assert.match(answerVoiceQuery('How far to the pin?', context), /242 metres/);
  assert.match(answerVoiceQuery('What is the wind and weather?', context), /km\/h/);
});

test('yard entries round-trip through metric shot logger conversion', () => {
  assert.equal(fromDisplayDistance(135, 'metric'), 148);
  assert.equal(toDisplayDistance(148, 'metric'), 135);
  assert.equal(fromDisplayDistance(148, 'imperial'), 148);
  assert.equal(toDisplayDistance(148, 'imperial'), 148);
});

test('imperial caddie advice still uses yards when selected', () => {
  const answer = answerVoiceQuery('How far to the pin?', { ...context, units: 'imperial' });
  assert.match(answer, /265 yards/);
});
