/* Pulse Grid — service worker : jeu 100 % jouable hors ligne.
   Change VERSION à chaque mise en ligne pour forcer la mise à jour du cache. */
const VERSION = 'pulse-grid-5.2.0';
const CORE = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'privacy.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-64.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pulse-grid-') && key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord (démarrage instantané, même sans réseau), mise à jour en arrière-plan.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      const refresh = fetch(request).then(response => {
        if (response && response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
        return response;
      }).catch(() => cached);
      if (cached) return cached;
      return refresh.then(response => response || (request.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
