export const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const DEFAULT_ENV = { windSpeed: 12, windDir: 'NE', temp: 75, elevDelta: 12 };

export const DEFAULT_CADDIE = {
  personality: 'veteran',
  pitch: 1,
  speed: 1,
  volume: 1,
  voiceName: null,
};

export const PERSONALITIES = {
  veteran: {
    name: 'Tour Veteran',
    prefix: 'Alright boss. ',
    tone: 'Calm, strategic and focused on course management.',
  },
  analyst: {
    name: 'Data Analyst',
    prefix: 'According to the numbers, ',
    tone: 'Mathematical, precision-driven and statistics heavy.',
  },
  friendly: {
    name: 'Friendly Coach',
    prefix: 'Great shot opportunity here! ',
    tone: 'Encouraging, relaxed and supportive.',
  },
  hype: {
    name: 'Hype Caddie',
    prefix: "Let's send this into orbit! ",
    tone: 'High energy, aggressive, maximum hype.',
  },
  sergeant: {
    name: 'Drill Sergeant',
    prefix: 'No excuses! ',
    tone: 'Strict, precise, demanding perfection.',
  },
};

export const MISS_PROFILES = [
  { value: 'Push/Fade', label: 'Fade / Push' },
  { value: 'Straight', label: 'Straight' },
  { value: 'Pull/Draw', label: 'Draw / Pull' },
];

export const DEFAULT_CLUBS = [
  { id: 'dr', name: 'Driver', carry: 280, miss: 'Push/Fade', active: true },
  { id: '3w', name: '3-Wood', carry: 245, miss: 'Straight', active: true },
  { id: '5w', name: '5-Wood', carry: 225, miss: 'Push/Fade', active: true },
  { id: '4i', name: '4-Iron', carry: 205, miss: 'Straight', active: true },
  { id: '5i', name: '5-Iron', carry: 192, miss: 'Straight', active: true },
  { id: '6i', name: '6-Iron', carry: 180, miss: 'Pull/Draw', active: true },
  { id: '7i', name: '7-Iron', carry: 168, miss: 'Straight', active: true },
  { id: '8i', name: '8-Iron', carry: 155, miss: 'Straight', active: true },
  { id: '9i', name: '9-Iron', carry: 142, miss: 'Straight', active: true },
  { id: 'pw', name: 'P-Wedge', carry: 130, miss: 'Straight', active: true },
  { id: 'gw', name: 'G-Wedge', carry: 118, miss: 'Straight', active: true },
  { id: 'sw', name: 'S-Wedge', carry: 102, miss: 'Straight', active: true },
  { id: 'lw', name: 'L-Wedge', carry: 88, miss: 'Straight', active: true },
  { id: 'pt', name: 'Putter', carry: 0, miss: 'Straight', active: true },
];

export const DEFAULT_COORDS = {
  tee: [28.3755, -81.5494],
  layup: [28.377, -81.548],
  pin: [28.3782, -81.547],
};

export function createDefaultScorecard() {
  return Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    par: i % 3 === 0 ? 5 : i % 2 === 0 ? 3 : 4,
    score: 0,
    putts: 0,
    penalties: 0,
    fir: true,
    gir: true,
  }));
}

export function haversineYards(from, to) {
  const R = 6371000;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((to[1] - from[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const meters = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(meters * 1.09361);
}

const COMPASS_BEARINGS = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/** Compass bearing in degrees, from one coordinate to another. */
export function bearingBetween(from, to) {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLon = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

/**
 * How the wind actually hits this shot. A wind is named for where it blows
 * FROM, so wind from the shot's own bearing is straight into your face, and a
 * wind from the opposite bearing pushes the ball along.
 */
export function windOnShot(env, bearingDeg) {
  const speed = env.windSpeed || 0;
  if (!Number.isFinite(bearingDeg)) {
    return { yards: Math.round(speed * 0.48), label: 'wind', angle: null };
  }
  const source = COMPASS_BEARINGS[env.windDir] ?? 0;
  const off = ((((source - bearingDeg) % 360) + 540) % 360) - 180;
  const yards = Math.round(speed * 0.7 * Math.cos((off * Math.PI) / 180));
  const abs = Math.abs(off);
  return { yards, label: abs <= 45 ? 'headwind' : abs >= 135 ? 'tailwind' : 'crosswind', angle: off };
}

export function playsLikeYards(rawYards, env, bearingDeg) {
  let adjusted = rawYards;
  adjusted += windOnShot(env, bearingDeg).yards;
  adjusted += env.elevDelta / 3;
  const tempDiff = 70 - env.temp;
  if (tempDiff > 0) adjusted += (tempDiff / 10) * 2;
  return Math.round(adjusted);
}

export function adjustmentSummary(env, bearingDeg) {
  const wind = windOnShot(env, bearingDeg);
  const elev = Math.round(env.elevDelta / 3);
  const tempDiff = 70 - env.temp;
  const temp = tempDiff > 0 ? Math.round((tempDiff / 10) * 2) : 0;
  const parts = [];
  if (wind.yards) parts.push(`${wind.yards > 0 ? '+' : ''}${wind.yards} ${wind.label}`);
  if (elev) parts.push(`${elev > 0 ? '+' : ''}${elev} elev`);
  if (temp) parts.push(`+${temp} cold`);
  return parts.length ? parts.join(' • ') : 'No adjustment';
}

export function recommendClub(clubs, targetYards) {
  const active = clubs.filter((c) => c.active && c.carry > 0);
  if (!active.length) {
    return { club: { name: 'No club', carry: 0 }, reason: 'No active clubs in your bag.' };
  }
  let best = active[0];
  for (const club of active) {
    if (Math.abs(club.carry - targetYards) < Math.abs(best.carry - targetYards)) best = club;
  }
  const gap = Math.round(best.carry - targetYards);
  const carry =
    gap === 0 ? 'Exact carry match' : `${Math.abs(gap)} yds ${gap > 0 ? 'past the number' : 'short of the number'}`;
  let aim = 'Straight miss profile, take dead aim at the flag.';
  if (best.miss === 'Push/Fade') aim = 'Aim 3-5 yds left for your fade miss profile.';
  if (best.miss === 'Pull/Draw') aim = 'Aim 3-5 yds right for your draw miss profile.';
  return { club: best, reason: `${carry}. ${aim}` };
}

// How much the stated carry still weighs against the shots you have logged.
const SHOT_PRIOR_WEIGHT = 3;
// Only recent swings describe the club you are swinging today.
const RECENT_SHOT_WINDOW = 12;

/**
 * Self-correcting carries. Each club's recommended distance blends the carry you
 * typed in with a recency-weighted average of the shots logged for it — the last
 * few dozen swings count most, so a club follows your game as it changes.
 * No shots → the stated carry is untouched. More shots → more trust in reality.
 */
export function applyLearnedCarries(clubs, shots) {
  const byClub = {};
  for (const shot of shots) {
    // Walk-to-ball GPS records TOTAL ground travel (possibly including roll).
    // Never use them as carry-learning samples.
    if (shot.kind === 'gps-total') continue;
    const distance = Number(shot.distance);
    if (!shot.clubId || !(distance > 0)) continue;
    if (!byClub[shot.clubId]) byClub[shot.clubId] = [];
    byClub[shot.clubId].push(distance);
  }

  return clubs.map((club) => {
    const logged = byClub[club.id] ?? [];
    if (!logged.length || club.carry <= 0) {
      return { ...club, samples: 0, average: null, delta: 0 };
    }

    // Shots arrive newest first: keep the latest window, newest weighing most.
    const recent = logged.slice(0, RECENT_SHOT_WINDOW);
    let weighted = 0;
    let weights = 0;
    recent.forEach((distance, index) => {
      const weight = recent.length - index;
      weighted += distance * weight;
      weights += weight;
    });

    const average = Math.round(weighted / weights);
    const trust = recent.length / (recent.length + SHOT_PRIOR_WEIGHT);
    const carry = Math.round(club.carry * (1 - trust) + average * trust);

    return {
      ...club,
      samples: logged.length,
      average,
      carry,
      delta: carry - club.carry,
    };
  });
}

export function computeRoundStats(scorecard) {
  const played = scorecard.filter((h) => h.score > 0);
  // Penalty strokes are real strokes, so they belong in the total.
  const score = played.reduce((sum, h) => sum + h.score + (h.penalties ?? 0), 0);
  const par = played.reduce((sum, h) => sum + h.par, 0);
  const putts = played.reduce((sum, h) => sum + h.putts, 0);
  const fir = played.filter((h) => h.fir).length;
  const gir = played.filter((h) => h.gir).length;
  const holes = played.length || 1;
  return {
    holes: played.length,
    score,
    par,
    diff: score - par,
    putts,
    firPct: played.length ? Math.round((fir / holes) * 100) : 0,
    girPct: played.length ? Math.round((gir / holes) * 100) : 0,
    avgPutts: played.length ? putts / holes : 0,
  };
}

export function strokesGained(stats) {
  if (!stats.holes) return [0, 0, 0, 0];
  const offTee = (stats.firPct / 100 - 0.6) * 2.5;
  const approach = (stats.girPct / 100 - 0.6) * 3;
  const putting = (1.8 - stats.avgPutts) * 2;
  const aroundGreen = (approach + putting) * -0.3;
  return [offTee, approach, aroundGreen, putting].map((v) => Number(v.toFixed(2)));
}

export function formatRelativeToPar(diff) {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function exportScorecardCsv(scorecard) {
  const header = 'Hole,Par,Score,Putts,FIR,GIR,Penalties\n';
  const rows = scorecard
    .map((h) => `${h.hole},${h.par},${h.score},${h.putts},${h.fir ? 1 : 0},${h.gir ? 1 : 0},${h.penalties ?? 0}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Apex_Golf_Round_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const STROKE_LABELS = ['Off the tee', 'Approach', 'Around the green', 'Putting'];

/** Biggest carry hole in the bag, so the caddie can flag it. */
export function largestGap(clubs) {
  const active = clubs.filter((club) => club.active && club.carry > 0).sort((a, b) => b.carry - a.carry);
  let worst = null;
  for (let i = 0; i < active.length - 1; i += 1) {
    const gap = Math.round(active[i].carry - active[i + 1].carry);
    if (!worst || gap > worst.gap) worst = { from: active[i].name, to: active[i + 1].name, gap };
  }
  return worst;
}

/** The strokes-gained category costing the most shots. */
export function weakestArea(strokes) {
  if (!Array.isArray(strokes) || !strokes.length) return null;
  const index = strokes.reduce((lowest, value, i) => (value < strokes[lowest] ? i : lowest), 0);
  return { label: STROKE_LABELS[index] ?? 'Overall', value: strokes[index] };
}