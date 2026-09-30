// Lomo's Miscellaneous - Service Worker
// Network-first: always tries the live files, falls back to the cache when offline.
const CACHE = 'lomo-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(a => c.add(a).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => key !== CACHE && caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const opts = e.request.mode === 'navigate' ? undefined : { cache: 'no-cache' };
  e.respondWith(
    fetch(e.request, opts)
      .then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
