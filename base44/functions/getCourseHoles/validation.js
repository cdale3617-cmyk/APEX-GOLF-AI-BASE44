export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
export function parseCourseInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected a JSON object');
  const { bbox = null, center = null, osmId = null, osmType = null } = body;
  if (bbox !== null) {
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(finite)) throw new InputError('Invalid bounding box');
    const [south, north, west, east] = bbox;
    if (south < -90 || north > 90 || west < -180 || east > 180 || south >= north || west >= east
      || north - south > 0.15 || east - west > 0.15 || (north - south) * (east - west) > 0.01) {
      throw new InputError('Bounding box must describe a small golf-course area');
    }
  }
  if (center !== null) {
    if (!Array.isArray(center) || center.length !== 2 || !center.every(finite)
      || Math.abs(center[0]) > 90 || Math.abs(center[1]) > 180) throw new InputError('Invalid course center');
    if (bbox && (center[0] < bbox[0] || center[0] > bbox[1] || center[1] < bbox[2] || center[1] > bbox[3])) {
      throw new InputError('Course center must be within its bounding box');
    }
  }
  if (osmId !== null && (!Number.isSafeInteger(osmId) || osmId <= 0 || !['way', 'relation'].includes(osmType))) {
    throw new InputError('Invalid OpenStreetMap identity');
  }
  if (!bbox && !center && !osmId) throw new InputError('A course location or OpenStreetMap identity is required');
  return { bbox, center, osmId, osmType: osmId ? osmType : null };
}

/** Cache the complete validated query, never a caller's arbitrary course key. */
export async function courseCacheKey(input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'v2:' + [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function readSmallJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('JSON body is required');
  let bytes = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) { await reader.cancel(); throw new InputError('Request body too large', 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try { return JSON.parse(text); }
    catch { throw new InputError('Invalid JSON'); }
  } finally { reader.releaseLock(); }
}

/** Per-instance protection; supplement with platform-wide limits in production. */
export function createLookupLimiter({ limit = 6, windowMs = 60000, maxUsers = 1000, now = Date.now } = {}) {
  const users = new Map();
  return (userId) => {
    const time = now();
    for (const [id, entry] of users) if (entry.until <= time) users.delete(id);
    const entry = users.get(userId);
    if (entry && entry.count >= limit) return false;
    if (!entry && users.size >= maxUsers) return false;
    users.set(userId, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? time + windowMs });
    return true;
  };
}
