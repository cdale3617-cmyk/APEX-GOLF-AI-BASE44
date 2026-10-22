/**
 * Offline support: course tiles a golfer has already seen stay available with
 * no signal, and the app shell reloads from cache when the network drops.
 */
const CACHE = 'apex-golf-v4';
const TILE_HOSTS = ['server.arcgisonline.com', 'tile.openstreetmap.org', 'api.openstreetmap.org'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/index.html']))
      .catch(() => null),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const oldCaches = keys.filter((key) => key.startsWith('apex-golf-') && key !== CACHE);
    await Promise.all(oldCaches.map((key) => caches.delete(key)));
    await self.clients.claim();
    if (!oldCaches.length) return;

    // Replace already-open copies of the crashed build, including installed apps.
    // Do not await navigation: its fetch waits for this activation to finish.
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((client) => {
      client.navigate(client.url).catch(() => null);
    });
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return hit ?? Response.error();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    // An online reload must request the latest app, not reuse stale browser HTML.
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put('/index.html', response.clone());
    return response;
  } catch {
    const hit = (await cache.match(request)) ?? (await cache.match('/index.html'));
    return hit ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (TILE_HOSTS.some((host) => url.hostname.endsWith(host))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (/\.(js|css|woff2?|png|svg|webp|jpg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
