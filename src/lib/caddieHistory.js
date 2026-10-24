// Spoken question / answer text history is stored on this device only.
// Never persist audio, GPS fixes, or browser microphone streams here.
export const MAX_CADDIE_TURNS = 150;
const KEY = 'apex_caddie_text_history_v1';

export function appendCaddieTurn(history, { id, question, at = null, courseName, holeNumber }) {
  const clean = String(question || '').trim().slice(0, 1000);
  if (!clean) return history;
  const turn = {
    id: String(id),
    question: clean,
    answer: '',
    at: at || new Date().toISOString(),
    courseName: String(courseName || '').slice(0, 120),
    holeNumber: Number.isInteger(holeNumber) ? holeNumber : null,
  };
  return [...(Array.isArray(history) ? history : []), turn].slice(-MAX_CADDIE_TURNS);
}

export function answerCaddieTurn(history, id, answer) {
  return history.map((turn) => (
    turn.id === id ? { ...turn, answer: String(answer || '').slice(0, 4000) } : turn
  ));
}

export function loadCaddieHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((turn) => (
      turn && typeof turn.id === 'string' && typeof turn.question === 'string'
      && typeof turn.answer === 'string' && typeof turn.at === 'string'
    )).slice(-MAX_CADDIE_TURNS);
  } catch {
    return [];
  }
}

export function saveCaddieHistory(history) {
  try {
    localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_CADDIE_TURNS)));
    return true;
  } catch {
    return false;
  }
}

export function formatCaddieTranscript(history) {
  const lines = ['APEX GOLF AI — CADDIE CONVERSATION', 'Spoken text transcript (not an audio recording)', ''];
  for (const turn of history) {
    const stamp = Number.isNaN(Date.parse(turn.at)) ? turn.at : new Date(turn.at).toLocaleString('en-AU');
    const location = [turn.courseName, turn.holeNumber ? 'Hole ' + turn.holeNumber : ''].filter(Boolean).join(' · ');
    lines.push(stamp + (location ? ' — ' + location : ''));
    lines.push('YOU: ' + turn.question);
    lines.push('CADDIE: ' + (turn.answer || '(No response captured)'));
    lines.push('');
  }
  return lines.join('\n');
}
