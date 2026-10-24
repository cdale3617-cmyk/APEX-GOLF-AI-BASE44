/**
 * An unofficial relative-to-par estimate, not a WHS Handicap Index.
 * No course rating, slope, PCC or authorized handicap-system integration.
 * Scores are scaled to 18 holes, then the best rounds of the most recent 20
 * are averaged using the standard table.
 */

const TABLE = [
  { min: 3, max: 3, take: 1, adjust: -2 },
  { min: 4, max: 4, take: 1, adjust: -1 },
  { min: 5, max: 5, take: 1, adjust: 0 },
  { min: 6, max: 6, take: 2, adjust: -1 },
  { min: 7, max: 8, take: 2, adjust: 0 },
  { min: 9, max: 11, take: 3, adjust: 0 },
  { min: 12, max: 14, take: 4, adjust: 0 },
  { min: 15, max: 16, take: 5, adjust: 0 },
  { min: 17, max: 18, take: 6, adjust: 0 },
  { min: 19, max: 19, take: 7, adjust: 0 },
  { min: 20, max: Infinity, take: 8, adjust: 0 },
];

/** Rounds of nine holes or more count; shorter ones are too noisy. */
function differentialOf(round) {
  const holes = round?.stats?.holes ?? 0;
  if (holes < 9) return null;
  return (round.stats.diff ?? 0) * (18 / holes);
}

export function handicapIndex(rounds = []) {
  const recent = rounds.slice(0, 20);
  const differentials = recent.map(differentialOf).filter((value) => value !== null);
  const bestRound = differentials.length ? Math.min(...differentials) : null;

  if (differentials.length < 3) {
    return {
      index: null,
      counted: differentials.length,
      recent: recent.length,
      bestRound,
      needed: 3 - differentials.length,
      selected: 0,
    };
  }

  const row = TABLE.find((entry) => differentials.length >= entry.min && differentials.length <= entry.max);
  const best = [...differentials].sort((a, b) => a - b).slice(0, row.take);
  const average = best.reduce((sum, value) => sum + value, 0) / best.length;

  return {
    index: Number((average + row.adjust).toFixed(1)),
    counted: differentials.length,
    recent: recent.length,
    bestRound: Number(bestRound.toFixed(1)),
    needed: 0,
    selected: row.take,
  };
}

/** Handicaps are written as a number, with plus handicaps below scratch. */
export function formatHandicap(index) {
  if (index === null || index === undefined || Number.isNaN(index)) return '—';
  if (index < 0) return `+${Math.abs(index).toFixed(1)}`;
  return index.toFixed(1);
}