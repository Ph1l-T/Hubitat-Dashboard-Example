const CACHE_NAME = 'eletrize-cache-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  // Ícones principais usados na navegação
  '/images/icons/icon-home.svg',
  '/images/icons/icon-music.svg',
  '/images/icons/icon-confort.svg',
  '/images/icons/icon-scenes.svg',
  '/images/icons/icon-watch.svg',
  // Fontes usadas pelo layout
  '/fonts/raleway/Raleway-200.woff2',
  '/fonts/raleway/Raleway-300.woff2',
  '/fonts/raleway/Raleway-400.woff2',
  '/fonts/raleway/Raleway-500.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // não cacheia POST/PUT/etc

  const url = new URL(req.url);

  // Somente mesmas origens (evita problemas com Hubitat/cloud)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            // Guarda no cache apenas respostas OK
            if (res && res.ok) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Promise.reject('offline'));

        // Estratégia: cache primeiro se existir, senão rede
        return cached || networkFetch;
      })
    );
  }
});

