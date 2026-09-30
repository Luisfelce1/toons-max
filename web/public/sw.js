// v2: la version anterior servia index.html desde la cache (cache-first) y el navegador
// seguia usando la app vieja tras cada despliegue. Cambiar el nombre borra esa cache.
const CACHE_NAME = 'retrotoons-shell-v2';
const VIDEO_EXTENSIONS = /\.(mp4|webm|m3u8)(\?.*)?$/i;

// Misma logica que src/app/utils/sw-cache-policy.ts (mantener sincronizados).
function shouldBypassCache(url) {
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  if (path.startsWith('/api/')) return true;
  if (VIDEO_EXTENSIONS.test(path)) return true;
  return false;
}

self.addEventListener('install', () => {
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
  if (new URL(request.url).origin !== self.location.origin) return;
  if (shouldBypassCache(request.url)) return;

  // Paginas (index.html): red primero, para ver siempre la ultima version desplegada.
  // La cache solo se usa sin conexion.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copia));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Scripts, estilos, fuentes e iconos llevan hash en el nombre: cache primero.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      // Nunca guardar HTML en lugar de un recurso (el fallback SPA devuelve index.html
      // para rutas que no existen, p. ej. chunks de un despliegue anterior).
      const tipo = response.headers.get('content-type') ?? '';
      if (response.ok && !tipo.includes('text/html')) cache.put(request, response.clone());
      return response;
    })
  );
});
