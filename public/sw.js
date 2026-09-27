/*
 * Service Worker — permite ABRIR la app sin señal (sótanos, zonas sin cobertura).
 * - Nunca guarda datos de pacientes ni respuestas de la API (/api/*).
 * - La página principal se pide primero a la red (siempre la versión más nueva)
 *   y sólo si no hay conexión se usa la copia guardada.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `hr-app-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './manifest.json']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hr-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return; // datos clínicos: siempre en vivo
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('hospital_master_db.json')) return;

  // Navegación: red primero (4 s), copia guardada si no hay señal
  if (req.mode === 'navigate') {
    event.respondWith(
      Promise.race([fetch(req), timeout(4000)])
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match(req)))
    );
    return;
  }

  // Código compilado (nombre con huella): caché primero
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Resto (logos, manifest): usar la copia y actualizar en segundo plano
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
