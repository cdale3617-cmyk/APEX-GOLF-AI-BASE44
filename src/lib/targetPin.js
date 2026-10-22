/** Explicitly approximate front/centre/back pin choices; do not mutate green outlines. */
const R = 6371000;
const rad = (n) => (n * Math.PI) / 180;
const deg = (n) => (n * 180) / Math.PI;
export function offsetTarget(tee, pin, metres) {
  if (!Array.isArray(tee) || !Array.isArray(pin) ||
      ![...tee, ...pin].every(Number.isFinite) || !Number.isFinite(metres)) return pin;
  const metresClamped = Math.max(-25, Math.min(25, metres));
  if (!metresClamped) return [...pin];
  const lat1 = rad(tee[0]), lat2 = rad(pin[0]);
  const dLon = rad(pin[1] - tee[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  if (Math.abs(x) + Math.abs(y) < 1e-12) return [...pin];
  const bearing = Math.atan2(y, x);
  const arc = metresClamped / R;
  const shiftedLat = Math.asin(Math.sin(lat2) * Math.cos(arc) +
    Math.cos(lat2) * Math.sin(arc) * Math.cos(bearing));
  const shiftedLon = rad(pin[1]) + Math.atan2(
    Math.sin(bearing) * Math.sin(arc) * Math.cos(lat2),
    Math.cos(arc) - Math.sin(lat2) * Math.sin(shiftedLat),
  );
  return [deg(shiftedLat), ((deg(shiftedLon) + 540) % 360) - 180];
}