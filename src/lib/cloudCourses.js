/**
 * Optional Cloudflare R2-backed course data.
 * Uses the existing APEX Worker; if its endpoints are not available, callers
 * retain their established Base44 / OpenStreetMap fallbacks.
 */
const API = 'https://apex-golf-courses.dale-copeland53.workers.dev';

async function getJson(path, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(API + path, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const finite = (value) => Number.isFinite(Number(value));
const validCenter = (center) =>
  Array.isArray(center) && center.length === 2 &&
  finite(center[0]) && finite(center[1]) &&
  Math.abs(Number(center[0])) <= 90 && Math.abs(Number(center[1])) <= 180;

export async function searchCloudCourses(term) {
  const query = term.trim();
  if (!query) return [];
  const payload = await getJson('/api/search?query=' + encodeURIComponent(query));
  const rows = Array.isArray(payload) ? payload : payload?.courses ?? payload?.results;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && typeof row.name === 'string')
    .map((row) => {
      const center = row.center ?? [row.lat ?? row.latitude, row.lng ?? row.longitude];
      if (!validCenter(center)) return null;
      return {
        id: String(row.id ?? 'r2-' + row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
        name: row.name,
        location: String(row.location ?? ''),
        center: center.map(Number),
        ...(Array.isArray(row.bbox) ? { bbox: row.bbox } : {}),
        ...(row.osmId ? { osmId: row.osmId, osmType: row.osmType } : {}),
      };
    }).filter(Boolean).slice(0, 30);
}

/** Normalize Overpass 'out body; >; out skel' ways into 'out geom' format. */
function normalizeElements(payload) {
  const elements = Array.isArray(payload) ? payload : payload?.elements;
  if (!Array.isArray(elements)) return null;
  const nodes = new Map(elements.filter((el) => el.type === 'node' && finite(el.lat) && finite(el.lon))
    .map((el) => [el.id, { lat: Number(el.lat), lon: Number(el.lon) }]));
  return elements.map((el) => {
    if (el.geometry?.length || !Array.isArray(el.nodes)) return el;
    const geometry = el.nodes.map((id) => nodes.get(id)).filter(Boolean);
    return geometry.length > 1 ? { ...el, geometry } : el;
  });
}

export async function fetchCloudElements(course) {
  if (!validCenter(course?.center)) return null;
  const [lat, lng] = course.center;
  const id = encodeURIComponent(String(course.id ?? 'course-' + lat + '-' + lng));
  const payload = await getJson(
    '/api/fetch-course-vector?lat=' + encodeURIComponent(lat) +
    '&lng=' + encodeURIComponent(lng) + '&id=' + id, 14000,
  );
  const elements = normalizeElements(payload);
  return elements?.length ? elements : null;
}
