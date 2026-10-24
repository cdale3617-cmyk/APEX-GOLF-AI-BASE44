const validPoint = (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);

/** Camera framing only: never modifies saved hole or marker coordinates. */
export function buildHoleCamera(hole, { width = 390, height = 600, pitchOn = false, bearing = 0 } = {}) {
  if (!hole || hole.estimated || !validPoint(hole.tee) || !validPoint(hole.pin)) return null;
  const points = [hole.tee, hole.layup, hole.pin].filter(validPoint);
  const lats = points.map((point) => point[0]);
  const lngs = points.map((point) => point[1]);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  if (north - south + east - west < 0.00004) {
    return { center: [hole.tee[1], hole.tee[0]], zoom: 17, pitch: 0, bearing: 0 };
  }
  const w = Number.isFinite(width) && width > 0 ? width : 390;
  const h = Number.isFinite(height) && height > 0 ? height : 600;
  return {
    bounds: [[west, south], [east, north]],
    padding: { top: Math.min(90, h * 0.15), bottom: Math.min(70, h * 0.12), left: Math.min(64, w * 0.12), right: Math.min(64, w * 0.12) },
    maxZoom: 18.5,
    pitch: pitchOn ? 40 : 0,
    bearing: pitchOn && Number.isFinite(bearing) ? bearing : 0,
  };
}
