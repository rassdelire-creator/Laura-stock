/* ============================================================
   LAUGRASTOK v2.1 — Service Worker
   Cache offline intelligent
   ============================================================ */

const CACHE_VERSION = 'laugrastok-v2.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './actus.js',
  './sw-register.js',
  './manifest.json',
  './icon.png'
];

const FONT_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ✅ API externes : ne jamais mettre en cache */
const API_HOSTS = [
  'freenewsapi.ai',
  'api.open-meteo.com',
  'calendrier.api.gouv.fr',
  'worldcup26.ir',
  'geocoding-api.open-meteo.com'
];

/* ============================================================
   INSTALL
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pré-cache...');
        return Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Skip ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ============================================================
   ACTIVATE
   ============================================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('laugrastok-') &&
                           key !== STATIC_CACHE &&
                           key !== RUNTIME_CACHE)
          .map((key) => {
            console.log('[SW] Suppression ancien cache :', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ============================================================
   FETCH
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  /* Ne jamais cacher les API */
  if (API_HOSTS.includes(url.hostname)) {
    return;
  }

  /* Navigation (HTML) → Network First */
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, STATIC_CACHE, './index.html'));
    return;
  }

  /* Fonts → Cache First */
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  /* Fichiers statiques → Cache First */
  if (url.origin === self.location.origin) {
    const isStatic = /\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|json)$/i.test(url.pathname);
    if (isStatic) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

/* ============================================================
   STRATÉGIES
   ============================================================ */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return offlineFallback(request);
  }
}

function offlineFallback(request) {
  if (request.destination === 'image') {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#9ba1b3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="m3 3 18 18"/></svg>`,
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  return new Response('Hors ligne — LaugraStok fonctionne sans réseau pour tes idées déjà enregistrées ✨', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

/* ============================================================
   MESSAGES
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

console.log('%c⚙️ Service Worker LaugraStok chargé', 'color:#10a37f;font-weight:bold');