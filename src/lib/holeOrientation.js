/**
 * OSM hole lines are not guaranteed to follow their tee-to-green direction.
 * Use independently mapped tee boxes and greens when present. A 25-yard
 * confidence margin avoids flipping a valid hole for a nearby next-hole tee.
 * All coordinates are [latitude, longitude].
 */
export function shouldReverseHole(start, end, tees, greens, distanceYards) {
  const nearest = (places, point) => places.reduce(
    (best, candidate) => Math.min(best, distanceYards(candidate, point)), Infinity,
  );
  const margin = 25;
  const teeStart = nearest(tees, start);
  const teeEnd = nearest(tees, end);
  const greenStart = nearest(greens, start);
  const greenEnd = nearest(greens, end);

  if (tees.length && greens.length) {
    return teeEnd + greenStart + margin < teeStart + greenEnd;
  }
  if (tees.length) return teeEnd + margin < teeStart;
  if (greens.length) return greenStart + margin < greenEnd;
  return false; // no evidence: retain the surveyed way direction
}
