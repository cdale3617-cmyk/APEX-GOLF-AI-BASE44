const MATCH_RADIUS_METERS = 2500;
const EARTH_RADIUS_METERS = 6371000;

function normalizedName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function validCenter(center) {
  return Array.isArray(center) && center.length === 2 && center.every(Number.isFinite);
}

function distanceMeters(a, b) {
  if (!validCenter(a) || !validCenter(b)) return Number.POSITIVE_INFINITY;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);
  const dLat = radians(b[0] - a[0]);
  const dLng = radians(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function sameCourse(a, b) {
  if (a.osmId && b.osmId && String(a.osmId) === String(b.osmId) && a.osmType === b.osmType) return true;
  const name = normalizedName(a.name);
  return Boolean(name && name === normalizedName(b.name) && distanceMeters(a.center, b.center) <= MATCH_RADIUS_METERS);
}

function courseSources(course) {
  if (Array.isArray(course.sources)) return course.sources.filter(Boolean);
  return course.source ? [course.source] : [];
}

/** Merge duplicate provider records without collapsing same-named courses far apart. */
export function mergeCourseSources(...groups) {
  const merged = [];
  for (const course of groups.flat()) {
    if (!course?.id || !course.name || !validCenter(course.center)) continue;
    const index = merged.findIndex((existing) => sameCourse(existing, course));
    if (index < 0) {
      merged.push({ ...course, sources: [...new Set(courseSources(course))] });
      continue;
    }

    const existing = merged[index];
    const mapRecord = course.osmId ? course : existing.osmId ? existing : null;
    const preferredLocation = existing.location && existing.location !== 'Nearby course'
      ? existing.location
      : course.location || existing.location || '';
    merged[index] = {
      ...existing,
      ...course,
      id: existing.id || course.id,
      name: existing.name || course.name,
      location: preferredLocation,
      center: mapRecord?.center || existing.center || course.center,
      apiId: existing.apiId ?? course.apiId,
      osmId: course.osmId ?? existing.osmId,
      osmType: course.osmType ?? existing.osmType,
      bbox: course.bbox ?? existing.bbox,
      sources: [...new Set([...courseSources(existing), ...courseSources(course)])],
    };
  }
  return merged;
}
