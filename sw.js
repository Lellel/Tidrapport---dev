const CACHE_NAME = 'tidrapport-prod-v2.4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icon.png'
];

importScripts('./config.js');

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ==========================================
// BACKGROUND SYNC (AUTO-SYNK UTANFÖR APPEN)
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-drafts') {
    console.log('[SW] Nätverk tillbaka! Kör Background Sync...');
    event.waitUntil(syncDrafts());
  }
});

async function syncDrafts() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LPV_Tidrapport_DB', 1);

    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['drafts'], 'readonly');
      const store = transaction.objectStore('drafts');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = async () => {
        const drafts = getAllRequest.result || [];
        const draftsToSend = drafts.filter(d => d.start && d.end);
        
        if (draftsToSend.length === 0) return resolve();

        console.log(`[SW] Hittade ${draftsToSend.length} färdiga offline-pass att auto-synka.`);

        try {
          const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              token: CONFIG.API_TOKEN,
              action: 'batchReports',
              pass: draftsToSend
            })
          });
          
          const result = await res.json();
          if (result && result.status === 'success') {
            console.log(`[SW] Auto-synk lyckades för ${draftsToSend.length} pass! Raderar från valvet...`);
            
            for (const draft of draftsToSend) {
              await deleteDraftFromDB(db, draft.id);
            }
            
            const clients = await self.clients.matchAll();
            clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
          }
        } catch (error) {
          console.error('[SW] Auto-synk misslyckades pga nätverk. Testar igen nästa gång.', error);
        }
        resolve();
      };
    };

    request.onerror = (err) => reject(err);
  });
}

function deleteDraftFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');
    const deleteRequest = store.delete(id);
    deleteRequest.onsuccess = () => resolve();
    deleteRequest.onerror = (e) => reject(e);
  });
}
