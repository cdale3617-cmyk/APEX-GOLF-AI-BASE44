import { createDefaultScorecard } from './golfData.js';

/** Match by hole number, not array position (OSM may have sparse hole refs). */
export function applyCoursePars(scorecard, holes) {
  const previous = new Map(scorecard.map((card) => [card.hole, card]));
  return createDefaultScorecard(holes).map((card) => ({
    ...card,
    ...previous.get(card.hole),
    hole: card.hole,
    par: card.par,
  }));
}

export function hasRoundData(scorecard, shots, sessionId) {
  return scorecard.some((card) => card.score > 0)
    || shots.some((shot) => shot.roundSessionId === sessionId);
}
