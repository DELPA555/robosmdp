/* Robos MDP — Service Worker (PWA offline)
   Estrategia:
   - Firebase/Firestore/Google (ads, analytics): network-first, NO se cachean (datos en vivo).
   - Navegación (documentos HTML): network-first con fallback offline a la landing cacheada.
     (network-first en vez de cache-first para que el sitio NO quede congelado en una versión
      vieja entre deploys; igual funciona offline desde cache.)
   - Resto de assets estáticos (imágenes/CSS/JS/fuentes): cache-first con runtime caching.
*/
const CACHE_NAME = 'robosmdp-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/rastreo.html',
  '/foro.html',
  '/manifest.json',
  '/assets/logo-robos.png',
  '/assets/logo-basura.png',
  '/assets/logo-pozos.png',
  '/assets/banner-robos.jpg',
  '/assets/banner-basura.jpg',
  '/assets/banner-pozos.jpg',
];

// Hosts de datos en tiempo real / terceros que NO se cachean.
const NO_CACHE_HOSTS = [
  'firestore.googleapis.com', 'firebaseio.com', 'firebaseinstallations.googleapis.com',
  'firebase', 'googlesyndication.com', 'doubleclick.net', 'google-analytics.com',
  'googletagmanager.com', 'analytics.google.com', 'adservice.google',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache resiliente: si algún asset falla (404/red), no aborta la instalación.
    await Promise.allSettled(ASSETS.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNoCache(url) {
  return NO_CACHE_HOSTS.some((h) => url.hostname.includes(h));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Datos en vivo (Firebase/Google): network-first, sin cachear.
  if (isNoCache(url)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Navegación (documentos): network-first con fallback offline a la landing.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch (_) {
        return (await caches.match(req))
          || (await caches.match('/index.html'))
          || (await caches.match('/'))
          || Response.error();
      }
    })());
    return;
  }

  // Resto de assets: cache-first con runtime caching.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.status === 200 && (net.type === 'basic' || net.type === 'cors')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
      }
      return net;
    } catch (_) {
      // Último recurso offline: la landing cacheada.
      return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
    }
  })());
});
