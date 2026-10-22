/**
 * Real golf course geometry from OpenStreetMap.
 *
 * Holes are mapped in OSM as `golf=hole` ways that run from the tee to the green,
 * usually tagged with `ref` (hole number) and `par`. We read that geometry so the
 * TEE / LAY / PIN markers sit on the actual hole instead of a made-up offset.
 */

import { haversineYards } from '@/lib/golfData';
import { base44 } from '@/api/base44Client';

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const OVERPASS_TIMEOUT_MS = 10000;

const asPoint = (node) => [node.lat, node.lon];

const centroid = (geometry) => [
  geometry.reduce((sum, point) => sum + point.lat, 0) / geometry.length,
  geometry.reduce((sum, point) => sum + point.lon, 0) / geometry.length,
];

const along = (from, to, ratio) => [
  from[0] + (to[0] - from[0]) * ratio,
  from[1] + (to[1] - from[1]) * ratio,
];

const parFor = (yards) => (yards < 240 ? 3 : yards < 480 ? 4 : 5);

const nearestYards = (points, point) =>
  points.reduce((best, candidate) => Math.min(best, haversineYards(candidate, point)), Number.POSITIVE_INFINITY);

function askOverpass(endpoint, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  return fetch(endpoint, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Course data responded ${response.status}`);
      const payload = await response.json();
      return payload.elements ?? [];
    })
    .finally(() => clearTimeout(timer));
}

/**
 * Asks the mirrors in turn and takes the first answer. They throttle per client,
 * so a burst of parallel requests is exactly what gets a golfer blocked.
 */
async function runOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await askOverpass(endpoint, query);
    } catch {
      /* next mirror */
    }
  }
  throw new Error('The course map is not answering right now. Try again in a moment.');
}

/** The app's own course cache: one lookup there serves every golfer. */
async function sharedCourseElements(course) {
  try {
    const response = await base44.functions.invoke('getCourseHoles', {
      courseKey: course.id,
      name: course.name,
      center: course.center,
      bbox: course.bbox ?? null,
      osmType: course.osmType ?? null,
      osmId: course.osmId ?? null,
    });
    const elements = response?.data?.elements;
    if (Array.isArray(elements) && elements.length) return elements;
  } catch {
    /* fall back to asking the map mirrors directly */
  }
  return null;
}

const toCourse = (row) => {
  const bbox = row.boundingbox?.map(Number);
  const center = bbox
    ? [(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2]
    : [Number(row.lat), Number(row.lon)];
  return {
    id: `osm-${row.osm_type}-${row.osm_id}`,
    name: row.name || row.display_name.split(',')[0],
    location: row.display_name.split(',').slice(1, 3).join(',').trim(),
    center,
    bbox,
    osmType: row.osm_type,
    osmId: row.osm_id,
  };
};

/**
 * Every mapped course around a searched place, nearest first — so a town or
 * suburb search lists the courses there rather than one guessed course.
 */
async function coursesNear(lat, lng) {
  const elements = await runOverpass(`[out:json][timeout:40];
(
  way(around:25000,${lat},${lng})[leisure=golf_course];
  relation(around:25000,${lat},${lng})[leisure=golf_course];
);
out center tags;`);

  return elements
    .filter((element) => element.tags?.name && element.center)
    .map((element) => ({
      element,
      yards: haversineYards([lat, lng], [element.center.lat, element.center.lon]),
    }))
    .sort((a, b) => a.yards - b.yards)
    .slice(0, 10)
    .map(({ element }) => ({
      id: `osm-${element.type === 'relation' ? 'relation' : 'way'}-${element.id}`,
      name: element.tags.name,
      location: element.tags['addr:city'] || element.tags['addr:suburb'] || 'Nearby course',
      center: [element.center.lat, element.center.lon],
      osmType: element.type,
      osmId: element.id,
    }));
}

/** The course database gives proper course names, locations and hole cards. */
async function databaseCourses(query) {
  try {
    const response = await base44.functions.invoke('getGolfCourseInfo', { action: 'search', term: query });
    const rows = response?.data?.courses ?? [];
    return rows.map((row) => ({
      id: `gca-${row.id}`,
      apiId: row.id,
      name: row.name,
      location: row.location,
      center: [row.lat, row.lng],
    }));
  } catch {
    return [];
  }
}

/** Card par and yardage per hole, cached for the whole app. */
async function cardHoles(apiId) {
  try {
    const response = await base44.functions.invoke('getGolfCourseInfo', { action: 'course', apiId });
    const holes = response?.data?.holes;
    return Array.isArray(holes) ? holes : [];
  } catch {
    return [];
  }
}

/** The card knows the par of each hole better than a length guess does. */
function withCardPars(holes, card) {
  if (!card.length) return holes;
  const byNumber = new Map(card.map((hole) => [hole.number, hole]));
  return holes.map((hole) => {
    const row = byNumber.get(hole.number);
    return row?.par ? { ...hole, par: row.par } : hole;
  });
}

/** Course search: the course database, mapped courses, then everything near a place. */
export async function searchGolfCourses(term) {
  const query = term.trim();
  if (!query) return [];

  const [fromDatabase, rows] = await Promise.all([
    databaseCourses(query),
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Course search unavailable');
        return response.json();
      })
      .catch(() => []),
  ]);

  const mapped = rows
    .filter((row) => row.category === 'leisure' && row.type === 'golf_course')
    .map(toCourse);

  const named = [...fromDatabase, ...mapped]
    .filter((course, index, list) => {
      const key = course.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return list.findIndex((other) => other.name.toLowerCase().replace(/[^a-z0-9]/g, '') === key) === index;
    })
    .slice(0, 10);
  // A town is not a golf course. Offer a clearly labelled map-location result
  // so entering "Yeppoon" moves the satellite map even without hole data.
  const place = rows.find((row) =>
    !(row.category === 'leisure' && row.type === 'golf_course') &&
    Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)),
  );
  const area = place ? {
    id: `place-${place.osm_id ?? query.toLowerCase().replace(/\s+/g, '-')}`,
    kind: 'place',
    name: `View ${(place.display_name || query).split(',')[0]} area`,
    location: 'Town map • choose a golf course below',
    center: [Number(place.lat), Number(place.lon)],
  } : null;
  if (named.length) return [...(area ? [area] : []), ...named];

  if (!place) return [];

  // Overpass mirrors can be slow. Give the player the town map within 6 s
  // rather than leaving the previously selected course frozen indefinitely.
  const nearby = await Promise.race([
    coursesNear(Number(place.lat), Number(place.lon)).catch(() => []),
    new Promise((resolve) => setTimeout(() => resolve([]), 6000)),
  ]);
  return [...(area ? [area] : []), ...nearby];
}

function holesFromGreens(elements, course) {
  const tees = elements
    .filter((element) => element.tags?.golf === 'tee')
    .map((element) => (element.geometry ? centroid(element.geometry) : asPoint(element)));

  // Greens are often mapped without a hole number: keep the numbered ones in
  // order and let the rest follow, rather than dropping them.
  const greens = elements
    .filter((element) => element.tags?.golf === 'green' && element.geometry?.length)
    .map((element) => ({
      ref: Number.parseInt(element.tags.ref, 10),
      pin: centroid(element.geometry),
    }))
    .sort((a, b) => (Number.isFinite(a.ref) ? a.ref : 99) - (Number.isFinite(b.ref) ? b.ref : 99));

  // No hole lines mapped: pair each green with the closest tee that is still free.
  const usedTees = new Set();
  return greens
    .map((green, index) => {
      const tee = tees
        .map((point, teeIndex) => ({ point, index: teeIndex, yards: haversineYards(point, green.pin) }))
        .filter((option) => !usedTees.has(option.index))
        .sort((a, b) => a.yards - b.yards)[0];
      if (!tee) return null;
      usedTees.add(tee.index);
      const number = Number.isFinite(green.ref) ? green.ref : index + 1;
      return buildHole(number, null, tee.point, green.pin, course);
    })
    .filter(Boolean);
}

// Realistic hole lengths as a fraction of the space each hole gets, so a laid
// out course still reads like a mix of par 3s, 4s and 5s.
const LENGTH_RATIOS = [0.46, 0.52, 0.3, 0.64, 0.48, 0.54, 0.32, 0.66, 0.44, 0.5, 0.31, 0.5, 0.47, 0.62, 0.33, 0.5, 0.49, 0.63];

/**
 * Many courses have no hole-by-hole mapping in OSM. Rather than leaving the
 * golfer with a full-course overview, lay 18 holes out across the course
 * bounds so hole-to-hole navigation, distances and pars all still work.
 */
function estimatedHoles(course) {
  const [lat, lng] = course.center;
  const [south, north, west, east] =
    course.bbox?.length === 4 ? course.bbox : [lat - 0.008, lat + 0.008, lng - 0.011, lng + 0.011];

  const padLat = (north - south) * 0.08;
  const padLng = (east - west) * 0.08;
  const bottom = south + padLat;
  const top = north - padLat;
  const left = west + padLng;
  const right = east - padLng;

  const rows = 6;
  const cols = 3;
  const rowH = (top - bottom) / rows;
  const colW = (right - left) / cols;
  if (!(rowH > 0 && colW > 0)) return [];

  const yardsPerLat = 121000;
  const yardsPerLng = yardsPerLat * Math.cos((lat * Math.PI) / 180);
  const runNorthSouth = rowH * yardsPerLat >= colW * yardsPerLng;

  const holes = [];
  for (let i = 0; i < 18; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const y0 = bottom + row * rowH;
    const x0 = left + col * colW;
    const ratio = LENGTH_RATIOS[i];
    const down = row % 2 === 1;

    // Each hole starts on the edge of its patch and runs inward, alternating
    // direction so the sheet reads like a course, not 18 parallel lines.
    const teeLat = down ? y0 + rowH : y0;
    const teeLng = col % 2 === 0 ? x0 : x0 + colW;
    const dLat = runNorthSouth ? (down ? -rowH : rowH) * ratio : (down ? -rowH : rowH) * 0.12;
    const dLng = runNorthSouth ? (col % 2 === 0 ? colW : -colW) * 0.12 : (col % 2 === 0 ? colW : -colW) * ratio;

    const hole = buildHole(i + 1, null, [teeLat, teeLng], [teeLat + dLat, teeLng + dLng], course);
    if (hole) holes.push({ ...hole, estimated: true });
  }
  return holes;
}

function buildHole(number, par, tee, pin, course) {
  const yards = Math.round(haversineYards(tee, pin));
  if (!Number.isFinite(yards) || yards < 40) return null;
  return {
    courseId: course.id,
    courseName: course.name,
    number,
    par: par || parFor(yards),
    yards,
    tee,
    layup: along(tee, pin, 0.58),
    pin,
  };
}

function parseHoles(elements, course) {
  const tees = elements
    .filter((element) => element.tags?.golf === 'tee')
    .map((element) => (element.geometry ? centroid(element.geometry) : asPoint(element)));

  const holeWays = elements.filter(
    (element) => element.type === 'way' && element.tags?.golf === 'hole' && element.geometry?.length > 1,
  );
  if (!holeWays.length) return holesFromGreens(elements, course);

  const midPoint = (way) => centroid(way.geometry);
  const fromCenter = (way) => haversineYards(course.center, midPoint(way));

  // One relation can hold several layouts (a club's East and West courses), so
  // split them by the layout name their holes carry: "Stadium 4", "Valley 7"…
  const layouts = new Map();
  holeWays.forEach((way) => {
    const label = (way.tags?.name || way.tags?.description || '').replace(/\s*\d+\s*$/, '').trim();
    const key = label || 'unnamed';
    if (!layouts.has(key)) layouts.set(key, []);
    layouts.get(key).push(way);
  });

  let layout = [...layouts.values()].sort((a, b) => b.length - a.length)[0];
  if (layouts.size > 1) {
    const hint = `${course.name} ${course.location ?? ''} ${course.layout ?? ''}`.toLowerCase();
    const named = [...layouts.entries()].find(
      ([key]) => key !== 'unnamed' && key.length > 3 && hint.includes(key.toLowerCase()),
    );
    layout = named
      ? named[1]
      : [...layouts.values()].sort(
          (a, b) =>
            a.reduce((sum, way) => sum + fromCenter(way), 0) / a.length -
            b.reduce((sum, way) => sum + fromCenter(way), 0) / b.length,
        )[0];
  }

  const refs = layout.map((way) => Number.parseInt(way.tags?.ref, 10));
  const duplicated = new Set(refs.filter(Number.isFinite)).size !== refs.length;

  // Duplicate numbers mean two courses share this area: take the holes closest
  // to the course the golfer picked.
  const ordered = [...layout].sort(
    duplicated
      ? (a, b) => fromCenter(a) - fromCenter(b)
      : (a, b) => (Number(a.tags?.ref) || 0) - (Number(b.tags?.ref) || 0),
  );

  const seen = new Set();
  const holes = [];
  ordered.forEach((way) => {
    const path = way.geometry;
    let tee = [path[0].lat, path[0].lon];
    let pin = [path[path.length - 1].lat, path[path.length - 1].lon];

    // Hole ways are drawn tee to green, but trust the mapped tee boxes if a way
    // happens to be drawn the other way round.
    if (tees.length && nearestYards(tees, pin) < nearestYards(tees, tee)) {
      [tee, pin] = [pin, tee];
    }

    const parsed = Number.parseInt(way.tags?.ref, 10);
    const number = Number.isFinite(parsed) ? parsed : holes.length + 1;
    if (seen.has(number)) return;
    seen.add(number);

    const hole = buildHole(number, Number(way.tags?.par), tee, pin, course);
    if (hole) holes.push(hole);
  });

  return holes.sort((a, b) => a.number - b.number);
}

/** Hole positions from the map: mapped geometry, or a laid-out estimate. */
async function geometryHoles(course) {
  // Every golfer shares one course lookup, so the map servers are asked once
  // per course rather than once per device.
  const shared = await sharedCourseElements(course);
  if (shared?.length) {
    const holes = parseHoles(shared, course);
    if (holes.length) return holes;
  }

  // A searched course comes with its exact map bounds: that lookup is far
  // cheaper for the map server than an area or radius search, so try it first.
  const bbox = course.bbox;
  const boundsQuery = bbox
    ? `[out:json][timeout:25];
(
  way[golf=hole](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way[golf=green](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way[golf=tee](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  node[golf=tee](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
);
out geom tags;`
    : null;

  const areaQuery = course.osmId
    ? `[out:json][timeout:25];
${course.osmType === 'relation' ? `relation(${course.osmId})` : `way(${course.osmId})`};
map_to_area->.a;
(
  way(area.a)[golf=hole];
  way(area.a)[golf=green];
  way(area.a)[golf=tee];
  node(area.a)[golf=tee];
);
out geom tags;`
    : null;

  const aroundQuery = `[out:json][timeout:25];
(
  way(around:2200,${course.center[0]},${course.center[1]})[golf=hole];
  way(around:2200,${course.center[0]},${course.center[1]})[golf=green];
  way(around:2200,${course.center[0]},${course.center[1]})[golf=tee];
  node(around:2200,${course.center[0]},${course.center[1]})[golf=tee];
);
out geom tags;`;

  const queries = [boundsQuery, areaQuery, aroundQuery].filter(Boolean);
  for (const query of queries) {
    try {
      const holes = parseHoles(await runOverpass(query), course);
      if (holes.length) return holes;
    } catch {
      /* try the next lookup */
    }
  }

  // Nothing mapped hole by hole (or the map servers are down): lay the holes
  // out across the course so the golfer can still play hole to hole.
  return estimatedHoles(course);
}

/** Every hole of a course, with real pars from the course card when known. */
export async function fetchHoles(course) {
  const holes = await geometryHoles(course);
  if (!course.apiId || !holes.length) return holes;
  return withCardPars(holes, await cardHoles(course.apiId));
}