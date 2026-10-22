import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CADDIE_TURNS, appendCaddieTurn, answerCaddieTurn,
  formatCaddieTranscript, loadCaddieHistory, saveCaddieHistory,
} from '../src/lib/caddieHistory.js';

const example = { id: 'q1', question: 'How far to the pin?', at: '2026-10-23T04:40:00.000Z', courseName: 'Capricorn', holeNumber: 3 };

test('voice question and spoken answer remain in one conversation exchange', () => {
  const asked = appendCaddieTurn([], example);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].question, 'How far to the pin?');
  assert.equal(asked[0].answer, '');
  assert.equal(asked[0].courseName, 'Capricorn');
  const replied = answerCaddieTurn(asked, 'q1', 'Playing 145 metres.');
  assert.equal(replied[0].answer, 'Playing 145 metres.');
  assert.equal(asked[0].answer, '', 'previous history must not be mutated');
  assert.match(formatCaddieTranscript(replied), /YOU: How far to the pin?/);
  assert.match(formatCaddieTranscript(replied), /CADDIE: Playing 145 metres\./);
});

test('conversation stays limited to the newest 150 exchanges', () => {
  let history = [];
  for (let i = 0; i < MAX_CADDIE_TURNS + 25; i += 1) {
    history = appendCaddieTurn(history, { ...example, id: 'q' + i, question: 'Question ' + i });
  }
  assert.equal(history.length, MAX_CADDIE_TURNS);
  assert.equal(history[0].id, 'q25');
  assert.equal(history.at(-1).id, 'q174');
});

test('history saves and reloads from local storage without an account', () => {
  let value = '';
  const old = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
  };
  try {
    const history = answerCaddieTurn(appendCaddieTurn([], example), 'q1', 'Take the seven iron.');
    assert.equal(saveCaddieHistory(history), true);
    assert.deepEqual(loadCaddieHistory(), history);
    assert.equal(saveCaddieHistory([]), true);
    assert.deepEqual(loadCaddieHistory(), []);
  } finally {
    if (old === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = old;
  }
});

test('bad or unavailable browser storage never crashes the Caddie', () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => '{malformed',
    setItem: () => { throw new Error('quota'); },
  };
  try {
    assert.deepEqual(loadCaddieHistory(), []);
    assert.equal(saveCaddieHistory([]), false);
  } finally {
    if (old === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = old;
  }
});
