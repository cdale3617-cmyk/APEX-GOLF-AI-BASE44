import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

/**
 * Real course card data from GolfCourseAPI: proper course names and locations
 * for search, plus the hole-by-hole par for each hole.
 *
 * Geometry still comes from OpenStreetMap (getCourseHoles) — this only fills in
 * what the map is missing or gets wrong. Lookups are cached so one golfer's
 * search serves the whole app.
 */

const API_BASE = 'https://api.golfcourseapi.com/v1';

async function callApi(path, key) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Key ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 429) throw new Error('The course database is busy. Try again in a moment.');
  if (!response.ok) throw new Error(`The course database responded ${response.status}`);
  return response.json();
}

/**
 * The database matches on the course's own name, so "Royal Melbourne Golf Club"
 * finds nothing while "Royal Melbourne" finds the East and West cards. Ask with
 * the full name first, then once more with the club wording stripped.
 */
const CLUB_WORDING = /\b(golf\s+club|golf\s+links|golf\s+course|golf\s+resort|country\s+club|golf\s+association)\b/gi;

function queryVariants(term) {
  const variants = [term];
  const stripped = term.replace(CLUB_WORDING, ' ').replace(/\s+/g, ' ').trim();
  if (stripped && stripped.toLowerCase() !== term.toLowerCase()) variants.push(stripped);
  return variants;
}

async function searchCourses(term, key) {
  let lastError = null;
  for (const variant of queryVariants(term)) {
    try {
      const payload = await callApi(`/search?search_query=${encodeURIComponent(variant)}`, key);
      const courses = normalizeSearch(payload);
      if (courses.length) return courses;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

function normalizeSearch(payload) {
  const rows = Array.isArray(payload?.courses) ? payload.courses : [];
  return rows
    .map((course) => ({
      id: String(course.id ?? ''),
      name: course.course_name || course.club_name || '',
      clubName: course.club_name ?? '',
      location:
        [course.location?.city, course.location?.state].filter(Boolean).join(', ') ||
        course.location?.country ||
        '',
      lat: Number(course.location?.latitude ?? course.latitude),
      lng: Number(course.location?.longitude ?? course.longitude),
    }))
    .filter((course) => course.id && course.name && Number.isFinite(course.lat) && Number.isFinite(course.lng));
}

/**
 * The card holes from a mid-length tee set: pars are the same off every tee, and
 * a middle tee is the fairest yardage reference. Holes arrive in playing order.
 */
function cardHoles(course) {
  const male = (course?.tees?.male ?? []).filter((set) => Array.isArray(set.holes) && set.holes.length);
  const female = (course?.tees?.female ?? []).filter((set) => Array.isArray(set.holes) && set.holes.length);
  const sets = male.length ? male : female;
  if (!sets.length) return null;

  const full = sets.filter((set) => set.holes.length >= 9);
  const pool = full.length ? full : sets;
  const byLength = [...pool].sort((a, b) => (Number(a.total_yards) || 0) - (Number(b.total_yards) || 0));
  const tee = byLength[Math.floor((byLength.length - 1) / 2)];

  const holes = tee.holes.map((hole, index) => ({
    number: index + 1,
    par: Number(hole.par) || null,
    yards: Number(hole.yardage) || null,
  }));

  return holes.length ? { teeName: tee.tee_name ?? '', holes } : null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const key = secrets.get('GOLF_COURSE_API_KEY');
    if (!key) return Response.json({ error: 'The course database key is not set.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    if (body?.action === 'course') {
      const apiId = String(body?.apiId ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      if (!apiId) return Response.json({ error: 'apiId is required' }, { status: 400 });

      const courseKey = `gca-${apiId}`;
      const cached = await base44.asServiceRole.entities.CourseInfo.filter({ course_key: courseKey });
      const hit = cached?.[0];
      if (hit?.holes?.length) {
        return Response.json({ holes: hit.holes, teeName: hit.tee_name ?? '', cached: true });
      }

      const payload = await callApi(`/courses/${apiId}`, key);
      const card = cardHoles(payload?.course);
      if (!card) return Response.json({ holes: [], teeName: '', cached: false });

      await base44.asServiceRole.entities.CourseInfo.create({
        course_key: courseKey,
        name: String(payload.course?.course_name ?? payload.course?.club_name ?? '').slice(0, 160),
        tee_name: card.teeName,
        holes: card.holes,
        fetched_at: new Date().toISOString(),
      });

      return Response.json({ holes: card.holes, teeName: card.teeName, cached: false });
    }

    const term = String(body?.term ?? '').trim().slice(0, 80);
    if (!term) return Response.json({ courses: [] });

    const courses = await searchCourses(term, key);
    return Response.json({ courses });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}