/**
 * A single GeoJSON collection owns both the shot lines AND the dots. In
 * particular, the visible red pin uses the exact same coordinate as the
 * final green-line vertex, so their projections cannot disagree.
 * Coordinates from the rest of the app are [latitude, longitude].
 */
const valid = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const position = (p) => [p[1], p[0]];
const line = (a, b, leg) => ({
  type: 'Feature',
  properties: { leg },
  geometry: { type: 'LineString', coordinates: [position(a), position(b)] },
});
const dot = (p, key) => ({
  type: 'Feature',
  properties: { key },
  geometry: { type: 'Point', coordinates: position(p) },
});

export function buildShotPlan(coords) {
  if (!coords || !valid(coords.tee) || !valid(coords.layup) || !valid(coords.pin)) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: [
      line(coords.tee, coords.layup, 'tee'),
      line(coords.layup, coords.pin, 'pin'),
      dot(coords.tee, 'tee'),
      dot(coords.layup, 'layup'),
      dot(coords.pin, 'pin'),
    ],
  };
}
