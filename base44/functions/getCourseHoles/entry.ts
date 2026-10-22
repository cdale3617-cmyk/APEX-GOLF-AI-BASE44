import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Hole-by-hole course geometry, cached for the whole app.
 *
 * OpenStreetMap is the source: the main map API is asked first because it
 * answers a bounding box immediately, with the Overpass mirrors as back-up.
 */

const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const GOLF_FEATURES = ['hole', 'green', 'tee'];
const OSM_HEADERS = { Accept: 'application/xml', 'User-Agent': 'ApexGolfAI/1.0 (course mapping)' };

const attr = (token, name) => {
  const match = new RegExp(`${name}="([^"]*)"`).exec(token);
  return match ? match[1] : null;
};

/** Turns OSM XML into the same shape Overpass returns. */
function parseOsmXml(xml) {
  const nodes = new Map();
  const ways = [];
  let current = null;

  for (const token of xml.match(/<[^>]+>/g) ?? []) {
    const opening = /^<\s*([a-zA-Z]+)/.exec(token);
    if (!opening) continue;
    const name = opening[1];

    if (token.startsWith('</')) {
      current = null;
      continue;
    }

    if (name === 'node') {
      const node = {
        type: 'node',
        id: Number(attr(token, 'id')),
        lat: Number(attr(token, 'lat')),
        lon: Number(attr(token, 'lon')),
        tags: {},
      };
      nodes.set(node.id, node);
      current = token.endsWith('/>') ? null : node;
      continue;
    }

    if (name === 'way') {
      const way = { type: 'way', id: Number(attr(token, 'id')), nodes: [], tags: {} };
      ways.push(way);
      current = token.endsWith('/>') ? null : way;
      continue;
    }

    if (name === 'nd') {
      const ref = attr(token, 'ref');
      if (current?.nodes && ref) current.nodes.push(Number(ref));
      continue;
    }

    if (name === 'tag') {
      const key = attr(token, 'k');
      if (current?.tags && key) current.tags[key] = attr(token, 'v') ?? '';
    }
  }

  const elements = [];
  for (const way of ways) {
    const geometry = way.nodes
      .map((id) => nodes.get(id))
      .filter(Boolean)
      .map((node) => ({ lat: node.lat, lon: node.lon }));
    if (geometry.length) elements.push({ type: 'way', id: way.id, tags: way.tags, geometry });
  }
  for (const node of nodes.values()) {
    if (Object.keys(node.tags).length) {
      elements.push({ type: 'node', id: node.id, lat: node.lat, lon: node.lon, tags: node.tags });
    }
  }
  return elements;
}

/** The main map API answers a course-sized bounding box straight away. */
async function areaElements(bbox) {
  const [south, north, west, east] = bbox;
  const response = await fetch(
    `https://api.openstreetmap.org/api/0.6/map?bbox=${west},${south},${east},${north}`,
    { headers: OSM_HEADERS, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(`Course map responded ${response.status}`);
  return parseOsmXml(await response.text());
}

async function askMirror(endpoint, query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: '*/*' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Course map responded ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.elements) ? payload.elements : [];
}

async function runOverpass(query) {
  for (const endpoint of MIRRORS) {
    try {
      const elements = await askMirror(endpoint, query);
      if (elements.length) return elements;
    } catch {
      /* next mirror */
    }
  }
  return [];
}

/** Keeps only the hole geometry, so the cached record stays small. */
function golfElements(elements) {
  return elements
    .filter((element) => GOLF_FEATURES.includes(element?.tags?.golf))
    .map((element) => ({
      type: element.type,
      id: element.id,
      tags: element.tags ?? {},
      ...(element.geometry ? { geometry: element.geometry } : {}),
      ...(element.lat !== undefined ? { lat: element.lat, lon: element.lon } : {}),
    }));
}

function buildQueries(center, osmType, osmId) {
  const queries = [];
  if (osmId) {
    queries.push(`[out:json][timeout:25];
${osmType === 'relation' ? `relation(${osmId})` : `way(${osmId})`};
map_to_area->.a;
(
  way(area.a)[golf=hole];
  way(area.a)[golf=green];
  way(area.a)[golf=tee];
  node(area.a)[golf=tee];
);
out geom tags;`);
  }
  if (center) {
    queries.push(`[out:json][timeout:25];
(
  way(around:2200,${center[0]},${center[1]})[golf=hole];
  way(around:2200,${center[0]},${center[1]})[golf=green];
  way(around:2200,${center[0]},${center[1]})[golf=tee];
  node(around:2200,${center[0]},${center[1]})[golf=tee];
);
out geom tags;`);
  }
  return queries;
}

async function lookup(courseKey, name, bbox, center, osmType, osmId, base44) {
  const candidates = [];

  if (bbox) {
    try {
      candidates.push(golfElements(await areaElements(bbox)));
    } catch {
      /* fall through to the mirrors */
    }
  }

  if (!candidates.some((elements) => elements.length)) {
    for (const query of buildQueries(center, osmType, osmId)) {
      const elements = golfElements(await runOverpass(query));
      candidates.push(elements);
      if (elements.length) break;
    }
  }

  const elements = candidates.find((candidate) => candidate.length) ?? [];
  if (!elements.length) return [];

  const holeCount = elements.filter((element) => element.tags.golf === 'hole').length;
  await base44.asServiceRole.entities.CourseMap.create({
    course_key: courseKey,
    name: String(name ?? '').slice(0, 160),
    hole_count: holeCount,
    elements,
    fetched_at: new Date().toISOString(),
  });
  return elements;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const courseKey = String(body?.courseKey ?? '').slice(0, 120);
    if (!courseKey) return Response.json({ error: 'courseKey is required' }, { status: 400 });

    // One lookup per course serves every golfer from then on.
    const cached = await base44.asServiceRole.entities.CourseMap.filter({ course_key: courseKey });
    const hit = cached?.[0];
    if (hit?.elements?.length) return Response.json({ elements: hit.elements, cached: true });

    const bbox = Array.isArray(body?.bbox) && body.bbox.length === 4 ? body.bbox.map(Number) : null;
    const center = Array.isArray(body?.center) && body.center.length === 2 ? body.center.map(Number) : null;
    const osmId = body?.osmId ? Number(body.osmId) : null;
    if (!bbox && !center && !osmId) return Response.json({ elements: [], cached: false });

    const elements = await lookup(courseKey, body?.name, bbox, center, body?.osmType, osmId, base44);
    return Response.json({ elements, cached: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}