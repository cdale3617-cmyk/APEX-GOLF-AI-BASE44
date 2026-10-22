/**
 * Spoken grammar for on-course control: hole navigation and voice score entry.
 * Pure functions — the provider decides what to do with each intent.
 */

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
};

const WORD_PATTERN = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`);

const PUTT_PHRASE = /\b(?:no|zero|one|two|three|four|five|six|\d{1,2})\s+putts?\b/g;
const PUTT_TRAILING = /\bputts?\s+(?:of\s+|was\s+|were\s+|is\s+)?(?:\d{1,2}|one|two|three|four|five|six)\b/g;
const HOLE_PHRASE = new RegExp(
  `\\bhole\\s+(?:number\\s+)?(?:\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})\\b`,
  'g',
);

const QUESTION_WORDS = /\b(what|whats|how|hows|which|when|where|why|who|tell|explain|report|check|show|give|recap|read)\b/;

const SCORE_TERMS = [
  { re: /\balbatross\b|\bdouble eagle\b/, toPar: -3 },
  { re: /\beagle\b/, toPar: -2 },
  { re: /\bbirdie\b/, toPar: -1 },
  { re: /\btriple bogey\b|\btriple\b/, toPar: 3 },
  { re: /\bdouble bogey\b|\bdouble\b/, toPar: 2 },
  { re: /\bbogey\b/, toPar: 1 },
];

const FILLER = new Set([
  'i',
  'a',
  'an',
  'the',
  'was',
  'with',
  'and',
  'for',
  'on',
  'made',
  'make',
  'shot',
  'took',
  'take',
  'got',
  'had',
  'scored',
  'score',
  'carded',
  'card',
  'logged',
  'log',
  'wrote',
  'write',
  'it',
  's',
  'that',
  'thats',
  'this',
  'so',
  'up',
  'there',
]);

/** Reads a number out of a spoken phrase, digits or words. */
export function spokenNumber(text) {
  const digits = String(text).match(/\b(\d{1,2})\b/);
  if (digits) return Number(digits[1]);
  const word = String(text).match(WORD_PATTERN);
  return word ? NUMBER_WORDS[word[1]] : null;
}

function parsePutts(text) {
  // "putts 2" / "putts were two" wins over "two putts", so "score 4 putts 2" reads right.
  const after = text.match(/\bputts?\s+(?:of\s+|was\s+|were\s+|is\s+)?(\d{1,2}|one|two|three|four|five|six)\b/);
  if (after) return spokenNumber(after[1]);
  const before = text.match(PUTT_PHRASE);
  if (before) {
    const count = spokenNumber(before[0]);
    if (count !== null) return count;
  }
  return null;
}

function parseFlags(text) {
  const patch = {};
  if (/\bfairway\b|\bfir\b/.test(text)) {
    patch.fir = !/\b(miss|missed|rough|left|right|wide|blocked)\b/.test(text);
  }
  if (/\bgreen\b|\bgir\b/.test(text)) {
    patch.gir = !/\b(miss|missed|short|long|left|right|over|wide)\b/.test(text);
  }
  return patch;
}

/** Turns "made a five with two putts, missed the fairway" into a scorecard patch. */
export function parseScorePatch(text, par = 4) {
  const patch = {};

  const putts = parsePutts(text);
  if (putts !== null) patch.putts = putts;
  Object.assign(patch, parseFlags(text));

  let score = null;
  for (const term of SCORE_TERMS) {
    if (term.re.test(text)) {
      score = par + term.toPar;
      break;
    }
  }
  if (score === null && /\b(?:even par|level par|par)\b/.test(text)) score = par;

  if (score === null) {
    const cleaned = text
      .replace(PUTT_TRAILING, ' ')
      .replace(PUTT_PHRASE, ' ')
      .replace(HOLE_PHRASE, ' ')
      .replace(/\b(?:on|for)\s+(?:this|the|that)\s+hole\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const tokens = cleaned.split(' ').filter((word) => word && !FILLER.has(word));
    if (tokens.length === 1) {
      const value = spokenNumber(tokens[0]);
      if (value !== null && value >= 1 && value <= 15) score = value;
    }
  }

  if (score !== null) patch.score = score;
  return patch;
}

/** Human summary of a score draft, used in the caddie's reply and the voice dock. */
export function describeScorePatch(patch = {}) {
  const parts = [];
  if (patch.score) parts.push(`${patch.score}`);
  if (patch.putts !== undefined && patch.putts !== null) {
    parts.push(`${patch.putts} putt${patch.putts === 1 ? '' : 's'}`);
  }
  if (patch.fir === true) parts.push('fairway hit');
  if (patch.fir === false) parts.push('fairway missed');
  if (patch.gir === true) parts.push('green hit');
  if (patch.gir === false) parts.push('green missed');
  return parts.length ? parts.join(', ') : 'nothing to log';
}

function parseHoleNumber(text) {
  const match = text.match(/\bhole\s+(?:number\s+)?([a-z0-9]+)\b/);
  if (!match) return null;
  const number = spokenNumber(match[1]);
  return number && number >= 1 && number <= 18 ? number : null;
}

function parseNav(text) {
  if (/\b(front nine|front side|first hole)\b/.test(text)) return { hole: 1 };
  if (/\b(back nine|back side)\b/.test(text)) return { hole: 10 };

  if (
    /\b(next|following)\s+(hole|tee)\b/.test(text) ||
    /\bnext\b/.test(text) ||
    /\bmove on\b/.test(text) ||
    /\bkeep going\b/.test(text) ||
    /\bgo ahead\b/.test(text)
  ) {
    return { delta: 1 };
  }

  if (
    /\b(previous|last|prior)\s+(hole|tee)\b/.test(text) ||
    /\bgo back\b/.test(text) ||
    /\bback a hole\b/.test(text) ||
    /\bback one\b/.test(text)
  ) {
    return { delta: -1 };
  }

  const skip = text.match(/\b(?:skip|jump|move)\s+(?:ahead\s+|forward\s+|up\s+)?([a-z]+|\d{1,2})\b/);
  if (skip) {
    const count = spokenNumber(skip[1]);
    if (count) return { delta: count };
  }

  const back = text.match(/\bback\s+([a-z]+|\d{1,2})\b/);
  if (back) {
    const count = spokenNumber(back[1]);
    if (count) return { delta: -count };
  }

  if (/\bback\b/.test(text)) return { delta: -1 };
  return null;
}

/**
 * Reads a spoken command into one intent:
 * hole navigation, a scorecard patch, commit/undo/clear, or null (a question).
 */
export function parseVoiceIntent(raw, { par = 4 } = {}) {
  const text = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;
  if (QUESTION_WORDS.test(text)) return null;

  if (/\bundo\b|\bscratch that\b|\btake that back\b/.test(text)) return { kind: 'undo' };
  if (/\brepeat\b|\bsay that again\b|\bsay again\b/.test(text)) return { kind: 'repeat' };
  if (/\bcancel\b|\bclear it\b|\bnever mind\b|\bforget it\b/.test(text)) return { kind: 'clear' };
  if (
    /\blog it\b|\blog that\b|\blog the hole\b|\blog this hole\b|\bsave it\b|\bsave the hole\b|\bsave hole\b|\block it in\b|\bthat s it\b|\bthats it\b|\bhole done\b|\bdone\b/.test(
      text,
    )
  ) {
    return { kind: 'commit' };
  }

  const holeNumber = parseHoleNumber(text);
  const patch = parseScorePatch(text, par);
  const nav = parseNav(text);

  if (patch.score !== undefined) return { kind: 'score', hole: holeNumber, patch, commit: true };
  if (Object.keys(patch).length) return { kind: 'score', hole: holeNumber, patch, commit: false };
  if (holeNumber) return { kind: 'hole', hole: holeNumber };
  if (nav) return { kind: 'hole', ...nav };
  return null;
}

/** Answers anything that isn't a command. Returns null when the caddie has no answer. */
export function answerVoiceQuery(raw, ctx) {
  const text = String(raw).toLowerCase();
  const {
    clubs = [],
    distances,
    env,
    stats,
    strokes,
    bpm,
    lastSwing,
    shots = [],
    holeNumber,
    briefing,
  } = ctx;

  const spoken = text.replace(/[^a-z0-9]/g, '');
  const namedClub = clubs.find((club) => spoken.includes(club.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

  if (namedClub && /far|carry|hit|distance|go/.test(text)) {
    return namedClub.samples > 0
      ? `${namedClub.name} carries ${namedClub.carry} yards, averaging ${namedClub.average} across ${namedClub.samples} logged shots.`
      : `${namedClub.name} carries ${namedClub.carry} yards. Log some shots and I will sharpen that number.`;
  }

  if (/bag|gap|gapping/.test(text)) {
    const sorted = clubs.filter((club) => club.active && club.carry > 0).sort((a, b) => b.carry - a.carry);
    let worst = null;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const gap = Math.round(sorted[i].carry - sorted[i + 1].carry);
      if (!worst || gap > worst.gap) worst = { from: sorted[i].name, to: sorted[i + 1].name, gap };
    }
    return worst
      ? `Your biggest gap is ${worst.gap} yards between ${worst.from} and ${worst.to}.`
      : 'Your bag is gapped tight from top to bottom.';
  }

  if (/average|logged|shots/.test(text)) {
    const learned = clubs.filter((club) => club.samples > 0);
    return learned.length
      ? `From ${shots.length} logged shots: ${learned
          .slice(0, 4)
          .map((club) => `${club.name} carrying ${club.carry}, averaging ${club.average}`)
          .join(', ')}.`
      : 'No real shots logged yet. Log a few on the GPS screen and I will tighten your numbers.';
  }

  if (/putt/.test(text)) {
    return stats.holes
      ? `${stats.putts} putts over ${stats.holes} holes, ${stats.avgPutts.toFixed(1)} per hole.`
      : 'No holes logged yet.';
  }

  if (/strokes|gained|leak|weak/.test(text)) {
    const labels = ['Off the tee', 'Approach', 'Around the green', 'Putting'];
    const index = (strokes || []).reduce((lowest, value, i) => (value < strokes[lowest] ? i : lowest), 0);
    return stats.holes
      ? `Biggest leak is ${labels[index].toLowerCase()} at ${strokes[index]} strokes gained. Off the tee ${strokes[0]}, approach ${strokes[1]}, around the green ${strokes[2]}, putting ${strokes[3]}.`
      : 'Log some holes first and I will break down your strokes gained.';
  }

  if (/tempo|rhythm|bpm/.test(text)) {
    return `Tempo target is ${bpm} beats per minute, a three to one backswing to downswing ratio.`;
  }

  if (/swing|turn|shoulder/.test(text)) {
    return lastSwing?.peakShoulder
      ? `Your last recorded swing peaked at ${lastSwing.peakShoulder} degrees of shoulder turn.`
      : 'No swing recorded yet. Hit record on the Swing page and I will read your numbers back.';
  }

  if (/layup|split/.test(text)) {
    return `The layup is ${distances.seg1} yards then ${distances.seg2} yards to the pin.`;
  }

  if (/what hole|which hole|hole number/.test(text)) {
    return holeNumber ? `You are on hole ${holeNumber} of 18.` : 'No hole is loaded right now.';
  }

  if (/club|hit|recommend|plan|brief|everything|update|status/.test(text)) return briefing();

  if (/far|distance|pin/.test(text)) return `The pin is playing like ${distances.playsLike} yards.`;

  if (/weather|wind/.test(text)) {
    const windText =
      distances.wind.label === 'crosswind'
        ? `Wind is ${env.windSpeed} miles per hour from the ${env.windDir}, a crosswind.`
        : `Wind is ${env.windSpeed} miles per hour from the ${env.windDir}, a ${distances.wind.label} worth ${Math.abs(distances.wind.yards)} yards.`;
    return `${windText} Temperature is ${env.temp} degrees.`;
  }

  if (/score|round|card/.test(text)) {
    return stats.holes
      ? `You are ${stats.diff === 0 ? 'even' : stats.diff > 0 ? `${stats.diff} over` : `${Math.abs(stats.diff)} under`} through ${stats.holes} holes with ${stats.putts} putts.`
      : 'No holes logged yet.';
  }

  return null;
}