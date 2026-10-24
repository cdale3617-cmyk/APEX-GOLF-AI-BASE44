import { mergeCourseSources } from './courseSearchResults.js';

const PLACE_TYPES = new Set(['city', 'town', 'suburb', 'village', 'municipality', 'hamlet', 'locality']);

export function withTimeout(promise, ms, message, onTimeout) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        onTimeout?.();
        reject(new Error(message));
      }, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function toCourse(row) {
  const displayName = String(row.display_name || row.name || '');
  const bbox = Array.isArray(row.boundingbox) ? row.boundingbox.map(Number) : null;
  const center = bbox?.length === 4
    ? [(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2]
    : [Number(row.lat), Number(row.lon)];
  return {
    id: 'osm-' + row.osm_type + '-' + row.osm_id,
    name: row.name || displayName.split(',')[0] || 'Golf course',
    location: displayName.split(',').slice(1, 3).join(',').trim(),
    center,
    bbox,
    osmType: row.osm_type,
    osmId: row.osm_id,
    sources: ['openstreetmap'],
  };
}

/** Combine provider responses and attach nearby OSM course IDs to matching cards. */
export async function findGolfCourses(term, { searchCloud = async (_query) => [], searchDatabase, searchPlaces, searchNearby, nearbyTimeoutMs = 6000 }) {
  const query = String(term ?? '').trim();
  if (!query) return { courses: [], warnings: [] };

  const warnings = [];
  const [cloudResult, databaseResult, placesResult] = await Promise.allSettled([
    Promise.resolve().then(() => searchCloud(query)),
    Promise.resolve().then(() => searchDatabase(query)),
    Promise.resolve().then(() => searchPlaces(query)),
  ]);
  const fromDatabase = databaseResult.status === 'fulfilled' && Array.isArray(databaseResult.value) ? databaseResult.value : [];
  const fromCloud = cloudResult.status === 'fulfilled' && Array.isArray(cloudResult.value) ? cloudResult.value : [];
  if (cloudResult.status === 'rejected') warnings.push('Course cache is unavailable; showing other providers.');
  const rows = placesResult.status === 'fulfilled' && Array.isArray(placesResult.value) ? placesResult.value : [];
  if (databaseResult.status === 'rejected') warnings.push('Course-card search is unavailable; showing mapped results where possible.');
  if (placesResult.status === 'rejected') warnings.push('Place search is unavailable; nearby results may be incomplete.');

  const mapped = rows
    .filter((row) => row.category === 'leisure' && row.type === 'golf_course' && row.osm_id)
    .map(toCourse);
  const place = rows.find((row) => row.category === 'place' && PLACE_TYPES.has(row.type)
    && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)));
  let nearby = [];
  if (place && typeof searchNearby === 'function') {
    const nearbyController = new AbortController();
    try {
      nearby = await withTimeout(
        Promise.resolve().then(() => searchNearby(Number(place.lat), Number(place.lon), nearbyController.signal)),
        nearbyTimeoutMs,
        'Nearby search timed out.',
        () => nearbyController.abort(),
      );
      if (!Array.isArray(nearby)) nearby = [];
    } catch (error) {
      warnings.push(error?.message === 'Nearby search timed out.'
        ? 'Nearby course search timed out; showing the results already found.'
        : 'Nearby course search is unavailable; showing the results already found.');
    }
  }

  const courses = mergeCourseSources(fromCloud, fromDatabase, mapped, nearby);
  const area = place ? {
    id: 'place-' + (place.osm_id ?? query.toLowerCase().replace(/\s+/g, '-')),
    kind: 'place',
    name: 'View ' + (place.display_name || query).split(',')[0] + ' area',
    location: 'Town map • choose a golf course below',
    center: [Number(place.lat), Number(place.lon)],
  } : null;
  return { courses: [...courses.slice(0, area ? 9 : 10), ...(area ? [area] : [])], warnings };
}
