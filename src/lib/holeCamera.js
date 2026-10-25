const validPoint = (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);

export const holeGeometryKey = (courseId, hole) =>
  JSON.stringify([courseId, hole?.number, hole?.tee, hole?.pin, hole?.layup]);

/**
 * Camera framing only: never modifies saved hole or marker coordinates.
 * @returns {{center: [number, number], zoom: number, pitch: number, bearing: number, maxZoom?: number, padding?: {top:number,bottom:number,left:number,right:number}} | null}
 */
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
  const padding = { top: Math.min(80, h * 0.12), bottom: Math.min(70, h * 0.1), left: Math.min(48, w * 0.1), right: Math.min(48, w * 0.1) };
  // Fit the actual points after rotation, NOT an axis-aligned geographical
  // rectangle. A diagonal hole's rectangle is much wider than the hole itself
  // when rotated hole-up, which previously zoomed narrow phone maps far out.
  const angle = (Number.isFinite(bearing) ? bearing : 0) * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const rotated = points.map(([lat, lng]) => {
    const x = (lng + 180) / 360;
    const clamped = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(Math.PI / 4 + clamped / 2)) / Math.PI) / 2;
    return [cos * x + sin * y, -sin * x + cos * y];
  });
  const xs = rotated.map((p) => p[0]), ys = rotated.map((p) => p[1]);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const x = cos * midX - sin * midY, y = sin * midX + cos * midY;
  const scale = Math.min(
    (w - padding.left - padding.right) / Math.max(1e-10, Math.max(...xs) - Math.min(...xs)),
    (h - padding.top - padding.bottom) / Math.max(1e-10, Math.max(...ys) - Math.min(...ys)),
  ) * (pitchOn ? 0.72 : 0.96);
  return {
    center: [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI],
    zoom: Math.max(0, Math.min(18.5, Math.log2(scale / 512))),
    padding,
    maxZoom: 18.5,
    pitch: pitchOn ? 40 : 0,
    bearing: Number.isFinite(bearing) ? bearing : 0,
  };
}
