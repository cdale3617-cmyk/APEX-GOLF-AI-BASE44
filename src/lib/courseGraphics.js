/**
 * Golf course graphics from OpenStreetMap.
 *
 * A map graphics engine draws the course as turf shapes — fairway, green,
 * fringe, bunkers, water — instead of a bare satellite photo with dots on it.
 * Those shapes all exist in OSM, so this reads them once and hands back
 * ready-to-draw GeoJSON per feature kind.
 */

import { fetchCloudElements } from '@/lib/cloudCourses';

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const TIMEOUT_MS = 15000;

const collection = (features = []) => ({ type: 'FeatureCollection', features });

const ringOf = (geometry) => {
  const ring = geometry.map((point) => [point.lon, point.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return ring.length >= 4 ? [ring] : null;
};

const lineOf = (geometry) => geometry.map((point) => [point.lon, point.lat]);

function kindOf(tags = {}) {
  if (tags.golf === 'green') return 'green';
  if (tags.golf === 'fairway') return 'fairway';
  if (tags.golf === 'rough') return 'rough';
  if (tags.golf === 'bunker') return 'bunker';
  if (tags.golf === 'tee') return 'tee';
  if (tags.golf === 'water_hazard' || tags.natural === 'water') return 'water';
  if (tags.golf === 'hole') return 'hole';
  return null;
}

async function ask(endpoint, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) throw new Error(`Course map responded ${response.status}`);
    const payload = await response.json();
    return payload.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/** Mirrors are throttled per client, so they are asked one at a time. */
async function run(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await ask(endpoint, query);
    } catch {
      /* next mirror */
    }
  }
  throw new Error('The course map is not answering right now.');
}

/** Every drawn course feature around a course centre, grouped by kind. */
export async function fetchCourseGraphics(course) {
  const [lat, lng] = course.center;
  const cloud = await fetchCloudElements(course);
  const elements = cloud?.some((element) => element.geometry?.length && element.tags?.golf)
    ? cloud
    : await run(`[out:json][timeout:30];
(
  way(around:1500,${lat},${lng})[golf=fairway];
  way(around:1500,${lat},${lng})[golf=green];
  way(around:1500,${lat},${lng})[golf=bunker];
  way(around:1500,${lat},${lng})[golf=rough];
  way(around:1500,${lat},${lng})[golf=tee];
  way(around:1500,${lat},${lng})[golf=hole];
  way(around:1500,${lat},${lng})[golf=water_hazard];
  way(around:1500,${lat},${lng})[natural=water];
);
out geom tags;`);

  const buckets = { rough: [], fairway: [], tee: [], green: [], bunker: [], water: [], hole: [] };

  elements.forEach((element) => {
    const kind = kindOf(element.tags);
    if (!kind || !element.geometry || element.geometry.length < 2) return;

    let geometry = null;
    if (kind === 'hole') {
      if (element.geometry.length > 1) {
        geometry = { type: 'LineString', coordinates: lineOf(element.geometry) };
      }
    } else {
      const rings = ringOf(element.geometry);
      if (rings) geometry = { type: 'Polygon', coordinates: rings };
    }
    if (!geometry) return;

    buckets[kind].push({
      type: 'Feature',
      properties: { name: element.tags?.name ?? '' },
      geometry,
    });
  });

  return Object.fromEntries(Object.entries(buckets).map(([kind, features]) => [kind, collection(features)]));
}