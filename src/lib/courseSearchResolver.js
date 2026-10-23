/**
 * Chooses real online course results. Providers are injected so failed lookups
 * and town-to-course discovery can be regression-tested without network calls.
 * No demonstration or preinstalled courses are added here.
 */
const rowsOf = (result) =>
  result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];

const isGolfCourse = (row) => row?.category === 'leisure' && row?.type === 'golf_course';

export async function resolveCourseSearch(term, providers) {
  const query = String(term ?? '').trim();
  if (!query) return [];

  const golfQuery = /\b(?:golf|links|country club)\b/i.test(query) ? query : query + ' golf course';
  const [placeResult, golfResult, databaseResult] = await Promise.allSettled([
    providers.searchPlaces(query),
    providers.searchGolf(golfQuery),
    providers.searchDatabase(query),
  ]);
  const places = rowsOf(placeResult);
  const golfPlaces = rowsOf(golfResult);
  const databaseCourses = rowsOf(databaseResult);

  let place = places.find((row) =>
    !isGolfCourse(row) && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)),
  ) ?? null;

  const matchesNearPlace = (row) =>
    isGolfCourse(row) &&
    (!place || providers.distanceYards(
      [Number(place.lat), Number(place.lon)],
      [Number(row.lat), Number(row.lon)],
    ) < 60000);

  const named = [
    ...databaseCourses,
    ...places.filter(isGolfCourse).map(providers.toCourse),
    ...golfPlaces.filter(matchesNearPlace).map(providers.toCourse),
  ]
    .filter((course) => course?.name && course?.id && Array.isArray(course.center)
      && course.center.length === 2 && course.center.every(Number.isFinite))
    .filter((course, index, all) => all.findIndex((other) => other.id === course.id) === index)
    .slice(0, 10);

  // The public place index can be temporarily unavailable in an Android
  // WebView. A city-only geocoder can still locate a town before OSM course lookup.
  if (!place && !named.length) {
    // Try a shorter club-name lookup and independent town geocoding together.
    // Either can locate the correct area without an API key on the phone.
    const [shortNameResult, townResult] = await Promise.allSettled([
      providers.findTownByCourseName?.(query) ?? Promise.resolve(null),
      providers.findTown(query),
    ]);
    place = (shortNameResult.status === 'fulfilled' ? shortNameResult.value : null)
      || (townResult.status === 'fulfilled' ? townResult.value : null);
  }

  const area = place ? {
    id: 'place-' + (place.osm_id ?? query.toLowerCase().replace(/\s+/g, '-')),
    kind: 'place',
    name: 'View ' + (place.display_name || query).split(',')[0] + ' area',
    location: 'Town map • choose a golf course below',
    center: [Number(place.lat), Number(place.lon)],
  } : null;

  if (named.length) return area ? [area, ...named] : named;

  if (!place) {
    if (placeResult.status === 'rejected' && golfResult.status === 'rejected') {
      throw new Error('Online course search is not responding. Check your connection and try again.');
    }
    return [];
  }

  // Nearby OSM course discovery is only needed when the name searches returned
  // no club. Return the town map promptly if a public map mirror is unavailable.
  let nearby = [];
  try {
    nearby = await providers.searchNearby(Number(place.lat), Number(place.lon));
  } catch {
    // The town can still be displayed, but the UI will explain the missing clubs.
  }
  return [area, ...nearby.filter((course) => course?.id && course?.name)];
}
