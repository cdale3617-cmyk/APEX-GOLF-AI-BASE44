const valid = (point) => Array.isArray(point) && point.length >= 2 &&
  Number.isFinite(point[0]) && Number.isFinite(point[1]);

/** Latitude/longitude bounds around this hole, including a dogleg target. */
export function holeGraphicsBounds(hole, paddingMetres = 65) {
  if (!hole || hole.estimated || !valid(hole.tee) || !valid(hole.pin)) return null;
  const points = [hole.tee, hole.pin, hole.layup].filter(valid);
  if (points.some(([lat, lng]) => Math.abs(lat) > 90 || Math.abs(lng) > 180)) return null;
  const lat = (hole.tee[0] + hole.pin[0]) / 2;
  const dy = Math.max(0, paddingMetres) / 111320;
  const dx = dy / Math.max(0.01, Math.cos(lat * Math.PI / 180));
  return {
    south: Math.max(-90, Math.min(...points.map((p) => p[0])) - dy),
    west: Math.max(-180, Math.min(...points.map((p) => p[1])) - dx),
    north: Math.min(90, Math.max(...points.map((p) => p[0])) + dy),
    east: Math.min(180, Math.max(...points.map((p) => p[1])) + dx),
  };
}

// Clip polygons rather than keeping a whole-course shape just because one
// vertex touches the current hole. Coordinates are GeoJSON [longitude, latitude].
function clipRing(ring, bounds) {
  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(valid)) return [];
  let points = ring.slice(0, -1);
  /** @type {Array<[number, number, boolean]>} */
  const edges = [[0, bounds.west, true], [0, bounds.east, false],
    [1, bounds.south, true], [1, bounds.north, false]];
  for (const [axis, limit, minimum] of edges) {
    const input = points;
    points = [];
    if (!input.length) break;
    const inside = (p) => minimum ? p[axis] >= limit : p[axis] <= limit;
    let previous = input[input.length - 1];
    for (const current of input) {
      if (inside(current) !== inside(previous)) {
        const t = (limit - previous[axis]) / (current[axis] - previous[axis]);
        points.push([previous[0] + t * (current[0] - previous[0]),
          previous[1] + t * (current[1] - previous[1])]);
      }
      if (inside(current)) points.push(current);
      previous = current;
    }
  }
  return points.length >= 3 ? [...points, points[0]] : [];
}

function clipPolygon(rings, bounds) {
  if (!Array.isArray(rings)) return null;
  const clipped = rings.map((ring) => clipRing(ring, bounds));
  return clipped[0]?.length ? clipped.filter((ring) => ring.length) : null;
}

/** Only the selected hole's bounded vector data is handed to the map. */
export function selectHoleGraphics(graphics, hole) {
  const bounds = holeGraphicsBounds(hole);
  if (!graphics || !bounds) return null;
  const selected = {};
  for (const [kind, collection] of Object.entries(graphics)) {
    const features = [];
    for (const feature of collection?.features ?? []) {
      const number = Number(feature.properties?.holeNumber ?? feature.properties?.ref);
      if (number > 0 && number !== Number(hole.number)) continue;
      const geometry = feature.geometry;
      if (!geometry) continue;
      // The selected hole's shot-plan line is already drawn from its tee/target/
      // pin. Do not overlay any other course centre-lines, including old packs
      // which lack hole-number properties.
      if (kind === 'hole') continue;
      if (geometry.type === 'Polygon') {
        const coordinates = clipPolygon(geometry.coordinates, bounds);
        if (coordinates) features.push({ ...feature, geometry: { type: 'Polygon', coordinates } });
      } else if (geometry.type === 'MultiPolygon') {
        const coordinates = geometry.coordinates.map((rings) => clipPolygon(rings, bounds)).filter(Boolean);
        if (coordinates.length) features.push({ ...feature, geometry: { type: 'MultiPolygon', coordinates } });
      }
    }
    selected[kind] = { type: 'FeatureCollection', features };
  }
  return selected;
}
