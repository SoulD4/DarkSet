/* DarkSet SW v2.0 */
const CACHE_NAME = 'darkset-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ---- Install ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: limpa caches antigos ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    )).then(() => self.clients.claim())
  );
});

// ---- Fetch: network-first para navegação, cache-first para estáticos ----
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignora requests externos (Firebase, CDNs)
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navegação: network-first com fallback offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Estáticos: cache-first
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      })
    )
  );
});

// ---- Timer em background ----
// O app envia mensagem { type: 'TIMER_START', endsAt: timestamp }
// O SW agenda uma notificação para quando o timer terminar
let timerTimeout = null;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'TIMER_START') {
    // Cancela timer anterior se existir
    if (timerTimeout) clearTimeout(timerTimeout);

    const msLeft = data.endsAt - Date.now();
    if (msLeft <= 0) return;

    timerTimeout = setTimeout(async () => {
      timerTimeout = null;
      // Tenta mostrar notificação
      try {
        await self.registration.showNotification('DarkSet — Descanso encerrado!', {
          body: 'Hora de voltar pro treino 💪',
          icon: './icons/icon-192.png',
          badge: './icons/icon-72.png',
          tag: 'darkset-timer',
          renotify: true,
          vibrate: [200, 100, 200],
          requireInteraction: false,
        });
      } catch(e) {
        // Fallback: avisa o app via postMessage se estiver aberto
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(c => c.postMessage({ type: 'TIMER_DONE' }));
      }
    }, msLeft);
  }

  if (data.type === 'TIMER_CANCEL') {
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
  }
});

// Clique na notificação: foca o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow('/');
      })
  );
});
