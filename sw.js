const CACHE_NAME = 'tidrapport-dev-v3.3-avatar-upload';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icon.png'
];

importScripts('./config.js');

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => {
    return Promise.all(keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
