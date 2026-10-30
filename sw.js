// SERVICE WORKER DEV v4.7.1
// Appens filer visas direkt från telefonen (snabb start, fungerar utan täckning).
// Ny version: höj CACHE_NAME → telefonen hämtar allt nytt i bakgrunden och appen
// visar "Ny version – tryck för att uppdatera". Deploy-workflowen höjer den automatiskt i prod.
const CACHE_NAME = 'lpv-dev-v4.7.1-b6';
const RUNTIME_CACHE = 'lpv-runtime';   // CDN-bibliotek och Drive-bilder
const TILE_CACHE = 'lpv-tiles';        // kartbitar för Snöjour
const MAX_TILES = 1500;
const MAX_RUNTIME = 200;

// Bibliotek från andra sajter som behövs utan täckning (kartan i Snöjour, QR i admin)
const RUNTIME_PRECACHE = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './avatar_onboarding.js',
  './manifest.json',
  './icon.png',
  './sms.html',
  './sno.js',
  './snojour.html',
  './snozoner.html',
  './planering.html',
  './offerter.html',
  './linjer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' = förbi webbläsarens HTTP-cache så att vi verkligen får nya filer
      Promise.all(APP_SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)))
    ),
    caches.open(RUNTIME_CACHE).then((cache) =>
      Promise.all(RUNTIME_PRECACHE.map((url) => cache.match(url).then((hit) => hit || cache.add(url)).catch(() => null)))
    )
  ]));
});

self.addEventListener('activate', (event) => {
  const keep = [CACHE_NAME, RUNTIME_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Appen ber om att byta till den nya versionen när användaren tryckt på uppdatera-rutan
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone()).then(() => trimCache(cacheName, max));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Backend (Apps Script) och allt som inte är GET går alltid direkt till nätet
  if (request.method !== 'GET' || url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) return;

  // Sidor: visa sparad version direkt (oavsett ?user=&key=-parametrar), annars nätet
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true })
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Appens egna filer: från cachen, nätet bara om filen saknas
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request)));
    return;
  }

  // Kartbitar: sparas så att kartan fungerar utan täckning
  if (url.hostname === 'server.arcgisonline.com') {
    event.respondWith(cacheFirst(request, TILE_CACHE, MAX_TILES).catch(() => new Response('', { status: 504 })));
    return;
  }

  // Versionslåsta bibliotek (Leaflet, QR) och Drive-bilder
  if (['unpkg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'drive.google.com'].includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE, MAX_RUNTIME).catch(() => fetch(request)));
  }
});
