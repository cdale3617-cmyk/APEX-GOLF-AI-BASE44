// APEX Golf AI — Cloudflare R2 course read service
// R2 binding required: COURSES_BUCKET -> apex-golf-course-data
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" }
});
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" } });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.COURSES_BUCKET) return json({ error: "R2 binding missing" }, 500);
    const { pathname } = new URL(request.url);
    if (pathname === "/") return json({ app: "APEX Golf AI", status: "online", endpoints: ["/health", "/courses", "/courses/ID"] });
    if (pathname === "/health") {
      try { await env.COURSES_BUCKET.list({ limit: 1 }); return json({ status: "connected" }); }
      catch { return json({ error: "R2 unavailable" }, 503); }
    }
    if (pathname === "/courses") {
      const courses = []; let cursor;
      do {
        const page = await env.COURSES_BUCKET.list({ prefix: "courses/", limit: 1000, ...(cursor ? { cursor } : {}) });
        courses.push(...page.objects.filter(x => /^courses\/[a-zA-Z0-9_-]{1,100}\.json$/.test(x.key)).map(x => ({ id: x.key.slice(8, -5), size: x.size })));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return json({ count: courses.length, courses });
    }
    const match = /^\/courses\/([a-zA-Z0-9_-]{1,100})$/.exec(pathname);
    if (match) {
      const object = await env.COURSES_BUCKET.get(`courses/${match[1]}.json`);
      if (!object) return json({ error: "Course not found" }, 404);
      return new Response(object.body, { headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "public, max-age=300" } });
    }
    return json({ error: "Not found" }, 404);
  }
};
