/**
 * Golf course graphics from OpenStreetMap.
 *
 * A map graphics engine draws the course as turf shapes — fairway, green,
 * fringe, bunkers, water — instead of a bare satellite photo with dots on it.
 * Those shapes all exist in OSM, so this reads them once and hands back
 * ready-to-draw GeoJSON per feature kind.
 */

import { fetchCloudElements } from '@/lib/cloudCourses';
import { getOfflinePack } from './offlineCourseStorage.js';
import { holeGraphicsBounds, selectHoleGraphics } from './holeGraphics.js';

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

async function ask(endpoint, query, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
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
    signal?.removeEventListener('abort', abort);
  }
}

/** Mirrors are throttled per client, so they are asked one at a time. */
async function run(query, signal = undefined) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Hole map request cancelled', 'AbortError');
    try {
      return await ask(endpoint, query, signal);
    } catch {
      /* next mirror */
    }
  }
  throw new Error('The course map is not answering right now.');
}

/** Every drawn course feature around a course centre, grouped by kind. */
export async function fetchCourseGraphics(course, { refresh = false } = {}) {
  if (!refresh) {
    try {
      const downloaded = await getOfflinePack(course.id);
      // A hole-only pack deliberately avoids pretending unavailable vector data exists.
      if (downloaded) return downloaded.graphics;
    } catch { /* Use online mapping if offline storage is unavailable. */ }
  }
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

  return graphicsFromElements(elements);
}

function graphicsFromElements(elements) {
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
      properties: { name: element.tags?.name ?? '', holeNumber: Number(element.tags?.ref) || null },
      geometry,
    });
  });

  return Object.fromEntries(Object.entries(buckets).map(([kind, features]) => [kind, collection(features)]));
}

/** Live play never requests the whole course's vector artwork. */
export async function fetchHoleGraphics(course, hole, { signal = undefined } = {}) {
  const bounds = holeGraphicsBounds(hole);
  if (!course?.id || !bounds || signal?.aborted) return null;
  try {
    const downloaded = await getOfflinePack(course.id);
    if (signal?.aborted) return null;
    if (downloaded) return selectHoleGraphics(downloaded.graphics, hole);
  } catch { /* Storage may be unavailable; online play can still fetch this hole. */ }
  if (signal?.aborted) return null;
  // Offline hole-only play must not attempt any remote providers.
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const box = [bounds.south, bounds.west, bounds.north, bounds.east].join(',');
  const elements = await run(`[out:json][timeout:15];
(way(${box})[golf];way(${box})[natural=water];);
out geom tags;`, signal);
  if (signal?.aborted) return null;
  return selectHoleGraphics(graphicsFromElements(elements), hole);
}