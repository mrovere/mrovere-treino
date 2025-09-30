const CACHE_NAME = 'treino-cache-v1';
const URLS_TO_CACHE = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta Firestore/Auth/analytics/etc.
  if (url.origin.includes('firebase') || url.protocol === 'chrome-extension:') return;

  // Cache-first para raiz e manifest; network-first para o resto estático
  if (url.pathname === '/' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return r;
      }))
    );
  } else if (event.request.method === 'GET' && url.origin === location.origin) {
    event.respondWith(
      fetch(event.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return r;
      }).catch(() => caches.match(event.request))
    );
  }
});
