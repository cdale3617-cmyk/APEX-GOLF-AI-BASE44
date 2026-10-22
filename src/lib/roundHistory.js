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

export function buildRound({ scorecard, courseName, shots }) {
  const stats = computeRoundStats(scorecard);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    courseName: courseName ?? 'Manual round',
    holes: stats.holes,
    shots: shots.length,
    stats,
    strokes: strokesGained(stats),
  };
}

export function addRound(round) {
  return persist([round, ...loadRounds()].slice(0, MAX_ROUNDS));
}

export function removeRound(id) {
  return persist(loadRounds().filter((round) => round.id !== id));
}