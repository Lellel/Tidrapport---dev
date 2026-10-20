// ==============================================================================
// LPV TIDRAPPORT - SERVICE WORKER (sw.js)
// ==============================================================================
const CACHE_NAME = 'tidrapport-v6';

// Filer som ska finnas tillgängliga offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './app.js',
  './manifest.json'
];

// 1. Installera och cacha alla nödvändiga filer
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Aktivera och rensa bort gamla versioner ur minnet
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Nätverk först (för att alltid visa senaste koden), fallback till cache offline
self.addEventListener('fetch', (event) => {
  // Ignorera anrop mot Google Apps Script (hanteras av appens egen utkorg)
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
