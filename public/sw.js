const VERSION = '1.2.0';
const PREFIJO = 'videoteca';
const nom = n => PREFIJO + '-' + n + '-' + VERSION;
const CACHE_APP = nom('app');
const CACHE_DATA = nom('datos');
const CACHE_MEDIA = nom('media');
const CACHE_CDN = nom('cdn');

const PRECACHE = [
  '/', '/index.html', '/peliculas.html', '/juegos.html', '/config.html', '/reportes.html', '/etiquetas.html',
  '/style.css', '/manifest.json', '/menu-navegacion.js', '/pb-sesion.js',
  '/assets/want.jpg', '/assets/martian.png', '/assets/martian.svg',
  '/assets/movies.webp', '/assets/playing.jpg',
  '/assets/dice_1.png', '/assets/dice_2.png',
  '/assets/dice_1_blanco.png', '/assets/dice_2_blanco.png'
];

const MAX_MEDIA = 800;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    await Promise.allSettled(PRECACHE.map(async url => {
      try {
        const res = await fetch(url);
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
      } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const vigentes = [CACHE_APP, CACHE_DATA, CACHE_MEDIA, CACHE_CDN];
    const claves = await caches.keys();
    await Promise.all(claves
      .filter(k => k.startsWith(PREFIJO) && !vigentes.includes(k))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function guardar(cache, request, response) {
  try {
    if (response && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone());
    }
  } catch (_) {}
}

async function redPrimeroCache(request, cacheName, fallbackIndex) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) await guardar(cache, request, res);
    else if (res && res.type === 'opaque') await guardar(cache, request, res);
    return res;
  } catch (_) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (fallbackIndex) {
      const idx = await cache.match('/index.html');
      if (idx) return idx;
    }
    return Response.error();
  }
}

async function mediaCachePrimero(request) {
  const cache = await caches.open(CACHE_MEDIA);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) {
      try { await cache.put(request, res.clone()); } catch (_) {}
      try {
        const claves = await cache.keys();
        if (claves.length > MAX_MEDIA) {
          await Promise.all(claves.slice(0, claves.length - MAX_MEDIA).map(k => cache.delete(k)));
        }
      } catch (_) {}
    }
    return res;
  } catch (_) {
    const placeholder = await caches.match('/assets/want.jpg');
    if (placeholder) return placeholder;
    return Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.host === 'pb.infocatsoluciones.com') {
    // El canal realtime (SSE) es un stream infinito: nunca debe pasar por caché,
    // porque clonar/guardar la respuesta bloquearía la conexión.
    if (url.pathname === '/api/realtime' || req.headers.get('accept') === 'text/event-stream') return;
    e.respondWith(redPrimeroCache(req, CACHE_DATA, false));
    return;
  }
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(redPrimeroCache(req, CACHE_APP, true));
      return;
    }
    e.respondWith(redPrimeroCache(req, CACHE_APP, false));
    return;
  }
  if (req.destination === 'image') {
    e.respondWith(mediaCachePrimero(req));
    return;
  }
  if (req.destination === 'style' || req.destination === 'font') {
    e.respondWith(redPrimeroCache(req, CACHE_CDN, false));
    return;
  }
});
