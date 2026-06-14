const CACHE_NAME = 'respen-tv-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// Tahap instalasi Service Worker: Mengunci dan menyimpan aset inti dalam cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Sukses melakukan caching aset inti');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Tahap aktivasi: Membuang cache yang lama jika ada pembaruan versi
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intersepsi Request Jaringan: Mengutamakan cache, atau beralih ke jaringan jika tidak tersedia (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Hindari caching untuk request API, proxy, atau streaming video m3u8/ts (harus real-time melalui jaringan)
  if (req.url.includes('/api/') || req.url.includes('.m3u8') || req.url.includes('.ts') || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Berikan respon instan dari cache, lalu update cache di background untuk request berikutnya
        fetch(req).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {/* Abaikan galat jaringan offline */});
        
        return cachedResponse;
      }

      // Jika tidak ada di cache, lakukan fetch standar melalui jaringan
      return fetch(req).then((networkResponse) => {
        // Hanya simpan respon sukses yang bertipe 'basic' dari origin kita
        if (networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika offline sepenuhnya dan memuat halaman utama, berikan fallback index.html dari cache jika disajikan
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
