/**
 * GPS quality gates for on-course distances.
 *
 * [lat, lon] is used internally. Web Geolocation accuracy is in metres.
 * A phone position is never allowed to rewrite mapped tee/green coordinates.
 */
export const MAX_ACCURACY_METRES = 45;
export const MAX_FIX_AGE_MS = 30000;
export const MAX_COURSE_DISTANCE_METRES = 1500;

export const selectShotOrigin = (fix, mode, tee) =>
  mode === 'live' && fix?.coords ? fix.coords : tee;

export const isCoordinate = (value) =>
  Array.isArray(value) && value.length === 2 &&
  Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
  Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;

export function metresBetween(a, b) {
  if (!isCoordinate(a) || !isCoordinate(b)) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const k = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) *
    Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(k)));
}

/** Keep only good, recent, high-accuracy Geolocation fixes. */
export function checkGpsPosition(position, now = Date.now()) {
  const coords = position?.coords;
  const point = [Number(coords?.latitude), Number(coords?.longitude)];
  const accuracy = Number(coords?.accuracy);
  const timestamp = Number(position?.timestamp);
  if (!isCoordinate(point) || !Number.isFinite(accuracy) || accuracy < 0) {
    return { accepted: false, reason: 'invalid' };
  }
  if (!Number.isFinite(timestamp) || timestamp <= 0 ||
      timestamp > now + 5000 || now - timestamp > MAX_FIX_AGE_MS) {
    return { accepted: false, reason: 'stale' };
  }
  if (accuracy > MAX_ACCURACY_METRES) {
    return { accepted: false, reason: 'weak', accuracy };
  }
  return {
    accepted: true,
    fix: { coords: point, accuracy, timestamp },
  };
}

/** A selected course far from the user must remain an explicitly labelled preview. */
export function courseGpsMode(fix, hole, now = Date.now()) {
  if (hole?.estimated) return 'unverified';
  if (!hole || !fix || !isCoordinate(fix.coords)) return 'preview';
  if (now - fix.timestamp > MAX_FIX_AGE_MS ||
      fix.timestamp > now + 5000 ||
      fix.accuracy > MAX_ACCURACY_METRES) return 'preview';
  const positions = [hole.tee, hole.layup, hole.pin].filter(isCoordinate);
  if (!positions.length) return 'preview';
  return Math.min(...positions.map((point) => metresBetween(fix.coords, point))) <=
    MAX_COURSE_DISTANCE_METRES ? 'live' : 'preview';
}
