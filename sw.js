/* ============================================================
   LAUGRASTOK v2.0 — Service Worker
   Cache offline intelligent + mise à jour propre
   ============================================================ */

/* ---------- CONFIGURATION ---------- */
const CACHE_VERSION = 'laugrastok-v2.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Fichiers indispensables à l'app (l'app shell)
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './games.js',
  './manifest.json',
  './icon.png'
];

// Domaines autorisés à être mis en cache à la volée
const CACHEABLE_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ============================================================
   1. INSTALLATION : pré-cache de l'app shell
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pré-cache des fichiers essentiels...');
        // addAll échoue si UN seul fichier manque → on ajoute un par un
        return Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Impossible de cacher ${url} :`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ============================================================
   2. ACTIVATION : nettoyage des anciens caches
   ============================================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith('laugrastok-') &&
                             key !== STATIC_CACHE &&
                             key !== RUNTIME_CACHE)
            .map((key) => {
              console.log('[SW] Suppression ancien cache :', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ============================================================
   3. FETCH : stratégie par type de requête
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que le GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore les requêtes non-http (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Ne JAMAIS cacher les données utilisateur dynamiques
  // (les médias base64 sont dans localStorage, pas dans le réseau,
  //  mais on protège au cas où)
  if (url.pathname.includes('/api/') || url.searchParams.has('no-cache')) {
    return;
  }

  /* -------- A) Navigation (HTML) : Network First, fallback cache -------- */
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, STATIC_CACHE, './index.html'));
    return;
  }

  /* -------- B) Google Fonts : Cache First -------- */
  if (CACHEABLE_ORIGINS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  /* -------- C) Ressources de l'app (CSS, JS, icône) : Cache First -------- */
  if (url.origin === self.location.origin) {
    // Si c'est un fichier statique connu → Cache First
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|json)$/i.test(url.pathname);
    if (isStaticAsset) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    // Sinon (routes inconnues) → Network First
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  /* -------- D) Le reste : Network First, fallback cache -------- */
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

/* ============================================================
   4. STRATÉGIES DE CACHE
   ============================================================ */

/**
 * Cache First :
 * On regarde d'abord dans le cache, sinon on va sur le réseau
 * et on stocke la réponse pour la prochaine fois.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // On ne cache que les réponses valides
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Hors ligne et pas en cache
    return offlineFallback(request);
  }
}

/**
 * Network First :
 * On essaie le réseau d'abord, sinon on regarde dans le cache.
 * Idéal pour le HTML et le contenu qui change souvent.
 */
async function networkFirst(request, cacheName, fallbackUrl = null) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return offlineFallback(request);
  }
}

/* ============================================================
   5. FALLBACK HORS-LIGNE
   ============================================================ */
function offlineFallback(request) {
  // Si c'est une image → renvoyer un SVG "hors ligne"
  if (request.destination === 'image') {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#9ba1b3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        <path d="m3 3 18 18"/>
      </svg>`,
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  // Sinon, réponse texte simple
  return new Response(
    'Hors ligne — LaugraStok fonctionne sans réseau pour tes idées déjà enregistrées ✨',
    {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    }
  );
}

/* ============================================================
   6. MESSAGES (pour forcer une mise à jour depuis l'app)
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    );
  }
});

console.log('%c⚙️ Service Worker LaugraStok chargé', 'color:#10a37f;font-weight:bold');