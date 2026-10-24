# Course cache API contract

The frontend and this read-only Worker share these version-1 routes:

- `GET /health`: checks the `COURSES_BUCKET` binding.
- `GET /api/search?query=Yeppoon`: returns up to 30 course records.
- `GET /api/fetch-course-vector?id=osm-way-123&lat=-23.1&lng=150.7`: returns `{ elements: [...] }`, or 404 for a cache miss. No caller-triggered writes.
- `GET /courses?cursor=...` and `GET /courses/ID`: administrative inventory compatibility; pagination is explicit.

R2 search manifest: `courses/index.json`, containing an array (or `{ "courses": [...] }`) of `{ id, name, location, center: [latitude, longitude], bbox?, osmId?, osmType? }`. IDs contain only letters, digits, `_`, and `-`, maximum 100 characters. Geometry objects live at `courses/ID.json`, containing an OSM element array or `{ "elements": [...] }`. Only trusted administrators maintain these objects and the manifest.

A missing index returns 503, not a misleading successful empty search. A missing geometry object is a cache miss; the frontend continues to its existing mapped-course providers. The Worker never invents geometry or accepts public writes.

`wrangler.jsonc` records the expected Worker and R2 binding. Before any deployment, **export/back up the currently deployed Worker and verify its bindings, storage format, index, and account**. The previously deployed source was not available during the repository review; this implementation is a tested replacement contract, not a recovered copy of that source. Do not overwrite a working deployment without that comparison and deployment approval.

Run `npm test` from the repository root for the mocked-R2 API contract tests. No tests write to live Cloudflare storage.
