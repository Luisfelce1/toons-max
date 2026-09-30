const CACHE_NAME = 'retrotoons-shell-v1';
const VIDEO_EXTENSIONS = /\.(mp4|webm|m3u8)(\?.*)?$/i;

// Misma logica que src/app/utils/sw-cache-policy.ts (mantener sincronizados).
function shouldBypassCache(url) {
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  if (path.startsWith('/api/')) return true;
  if (VIDEO_EXTENSIONS.test(path)) return true;
  return false;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (shouldBypassCache(request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
