/**
 * Match the ends of an OSM golf=hole line to surveyed tee boxes and greens.
 * OSM ways are not guaranteed to be digitised in playing direction.
 * All coordinates are [latitude, longitude]; distance returns yards.
 */
const valid = (point) => Array.isArray(point) && point.length === 2
  && point.every(Number.isFinite);

function closest(points, point, distance) {
  return points.filter(valid)
    .map((candidate) => ({ point: candidate, yards: distance(candidate, point) }))
    .sort((a, b) => a.yards - b.yards)[0] ?? null;
}

export function alignHoleEndpoints(start, end, teePoints, greenPoints, distance) {
  const tees = (teePoints ?? []).filter(valid);
  const greens = (greenPoints ?? []).filter(valid);
  if (!valid(start) || !valid(end)) return { tee: start, pin: end, reversed: false };

  const teeAtStart = closest(tees, start, distance)?.yards ?? Infinity;
  const teeAtEnd = closest(tees, end, distance)?.yards ?? Infinity;
  const greenAtStart = closest(greens, start, distance)?.yards ?? Infinity;
  const greenAtEnd = closest(greens, end, distance)?.yards ?? Infinity;

  // A positive score supports start=tee/end=green; a negative score
  // supports the reverse. Ignore unrelated distant turf features.
  let score = 0;
  let evidence = 0;
  if (Math.min(teeAtStart, teeAtEnd) < 110) {
    score += Math.min(teeAtEnd, 150) - Math.min(teeAtStart, 150);
    evidence += 1;
  }
  if (Math.min(greenAtStart, greenAtEnd) < 110) {
    score += Math.min(greenAtStart, 150) - Math.min(greenAtEnd, 150);
    evidence += 1;
  }
  const reversed = evidence > 0 && score < -24;
  let tee = reversed ? end : start;
  let pin = reversed ? start : end;

  // Snap only to nearby surveyed features, never to an arbitrary adjacent
  // hole elsewhere on the course.
  const nearestTee = closest(tees, tee, distance);
  const nearestGreen = closest(greens, pin, distance);
  if (nearestTee && nearestTee.yards <= 35) tee = nearestTee.point;
  if (nearestGreen && nearestGreen.yards <= 45) pin = nearestGreen.point;

  return { tee, pin, reversed };
}
