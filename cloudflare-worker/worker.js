// Read-only public course cache. Writes and cache generation stay administrative.
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'x-content-type-options': 'nosniff',
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
const normalized = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const validCenter = (point) => Array.isArray(point) && point.length === 2
  && point.every((number) => typeof number === 'number' && Number.isFinite(number))
  && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/') return json({
      service: 'APEX Golf Courses', status: 'running', storage: 'Cloudflare R2',
      apiVersion: 1, endpoints: ['/health', '/api/search', '/api/fetch-course-vector', '/courses'],
    });
    if (!env.COURSES_BUCKET) return json({ error: 'R2 binding missing' }, 503);
    const bucket = env.COURSES_BUCKET;
    try {
      if (pathname === '/health') {
        await bucket.list({ limit: 1 });
        return json({ status: 'connected', apiVersion: 1 });
      }
      if (pathname === '/api/search') {
        const query = url.searchParams.get('query')?.trim() ?? '';
        if (!query || query.length > 100) return json({ error: 'query must contain 1–100 characters' }, 400);
        // A maintained manifest avoids scanning/fetching every R2 object per query.
        const object = await bucket.get('courses/index.json');
        if (!object) return json({ error: 'Search index is not configured' }, 503);
        const payload = await object.json();
        const courses = Array.isArray(payload) ? payload : payload.courses;
        if (!Array.isArray(courses)) return json({ error: 'Invalid search index' }, 503);
        const terms = normalized(query).split(/\s+/);
        return json(courses.filter((course) => validId(course?.id) && typeof course.name === 'string'
          && validCenter(course.center) && terms.every((term) => normalized(course.name + ' ' + (course.location ?? '')).includes(term)))
          .slice(0, 30).map(({ id, name, location, center, bbox, osmId, osmType }) => ({
            id, name, location, center, bbox, osmId, osmType,
          })));
      }
      if (pathname === '/courses') {
        const cursor = url.searchParams.get('cursor');
        if (cursor && cursor.length > 1024) return json({ error: 'Invalid cursor' }, 400);
        const page = await bucket.list({ prefix: 'courses/', limit: 1000, ...(cursor ? { cursor } : {}) });
        const courses = page.objects.filter((object) => /^courses\/[a-zA-Z0-9_-]{1,100}\.json$/.test(object.key)
          && object.key !== 'courses/index.json').map((object) => ({ id: object.key.slice(8, -5), size: object.size }));
        return json({ count: courses.length, courses, cursor: page.truncated ? page.cursor : null });
      }
      const match = /^\/courses\/([a-zA-Z0-9_-]{1,100})$/.exec(pathname);
      const vector = pathname === '/api/fetch-course-vector';
      const id = vector ? url.searchParams.get('id') : match?.[1];
      if (!match && !vector) return json({ error: 'Endpoint not found' }, 404);
      if (!validId(id) || id === 'index') return json({ error: 'Invalid course id' }, 400);
      // Coordinates are hints only: object identity comes exclusively from the id.
      if (vector && ['lat', 'lng'].some((key) => url.searchParams.has(key))) {
        const lat = url.searchParams.get('lat');
        const lng = url.searchParams.get('lng');
        if (!lat?.trim() || !lng?.trim() || !validCenter([Number(lat), Number(lng)])) return json({ error: 'Invalid coordinates' }, 400);
      }
      const object = await bucket.get(`courses/${id}.json`);
      if (!object) return json({ error: 'Course not cached; use the mapped-course providers' }, 404);
      const payload = await object.json();
      if (vector) {
        const elements = Array.isArray(payload) ? payload : payload.elements;
        if (!Array.isArray(elements)) return json({ error: 'Cached course has no OSM elements' }, 422);
        return json({ elements });
      }
      return json(payload);
    } catch {
      return json({ error: 'Course cache is temporarily unavailable' }, 503);
    }
  },
};
