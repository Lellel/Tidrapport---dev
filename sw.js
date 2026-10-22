// SERVICE WORKER DEV v4.7.1 - FORCE FLUSH
const CACHE_NAME = 'lpv-cache-v4.7.1-killswitch';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Släpp igenom POST-anrop och externa anrop (Google Apps Script) direkt till nätverket
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }
  // Hämta alltid färskt från nätverket under DEV
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
