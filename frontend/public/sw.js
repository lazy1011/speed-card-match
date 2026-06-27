const CACHE = 'card-games-v1';

// Cache static navigation pages on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(['/', '/bluff', '/guess-who']).catch(() => {})
    )
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: always try the network, fall back to cache
self.addEventListener('fetch', e => {
  // Skip socket.io and cross-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('socket.io')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for HTML/JS/CSS
        if (res.ok && ['document', 'script', 'style'].includes(e.request.destination)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
