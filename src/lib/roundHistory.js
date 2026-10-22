/**
 * Finished rounds live on this device, newest first, so the golfer can look
 * back at how a round actually went instead of trusting memory.
 */
import { computeRoundStats, strokesGained } from '@/lib/golfData';

const KEY = 'apex_golf_rounds_v1';
const MAX_ROUNDS = 40;

export function loadRounds() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(rounds) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rounds));
  } catch {
    /* storage blocked — the history still works for this session */
  }
  return rounds;
}

export function buildRound({ scorecard, courseName, shots, roundSessionId }) {
  const stats = computeRoundStats(scorecard);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    courseName: courseName ?? 'Manual round',
    holes: stats.holes,
    shots: shots.length,
    // Snapshot each scored hole and each logged shot for later review.
    scorecard: scorecard.filter((h) => h.score > 0).map(({ hole, par, score, putts, penalties, fir, gir }) => ({
      hole, par, score, putts, penalties, fir, gir,
    })),
    shotDetails: shots.map(({ id, date, clubId, clubName, distance, holeNumber }) => ({
      id, date, clubId, clubName, distance, holeNumber,
    })),
    roundSessionId,
    stats,
    strokes: strokesGained(stats),
  };
}

export function addRound(round) {
  const existing = loadRounds();
  // A second Save updates this round rather than adding another card.
  // Reset Scorecard creates a new session, even on the same course.
  const previous = round.roundSessionId
    ? existing.find((entry) => entry.roundSessionId === round.roundSessionId)
    : null;
  if (previous) {
    const updated = { ...round, id: previous.id, date: previous.date };
    return persist([updated, ...existing.filter((entry) => entry.id !== previous.id)].slice(0, MAX_ROUNDS));
  }
  return persist([round, ...existing].slice(0, MAX_ROUNDS));
}

export function removeRound(id) {
  return persist(loadRounds().filter((round) => round.id !== id));
}