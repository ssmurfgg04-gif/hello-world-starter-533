/**
 * Service Worker for the OSINT Platform.
 *
 * Implements a stale-while-revalidate caching strategy for map tiles and
 * static assets, enabling offline resilience and faster subsequent loads.
 */

const CACHE_NAME = 'osint-platform-v2';

/** URL patterns to cache using stale-while-revalidate. */
const TILE_PATTERNS = [
  /basemaps\.cartocdn\.com/,
  /tiles\.stadiamaps\.com/,
  /tile\.openstreetmap\.org/,
];

/** Static assets to precache on install. */
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ---------------------------------------------------------------------------
// Install: precache critical assets
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate: clean old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch: stale-while-revalidate for tiles, network-first for everything else
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isTile = TILE_PATTERNS.some((pattern) => pattern.test(url));

  if (isTile) {
    // Stale-while-revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => cached);

          return cached || fetchPromise;
        }),
      ),
    );
  }
  // For non-tile requests, let the browser handle normally
});
