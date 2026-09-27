const CACHE = 'lomo-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => 
      c.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon-192.png',
        './icon-512.png',
        './credit-ledger-enhanced.js'
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE && caches.delete(key)))
    )
  );
  self.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
