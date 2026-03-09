// DarkSet Service Worker V5.7.8
const CACHE_NAME = 'darkset-v5-7-8';
const ASSETS_TO_CACHE = [
  '/',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── Install: pre-cache core assets ────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for assets, network-first for API/HTML ─────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin requests (Firebase, etc.)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Cache-first strategy for static assets (icons, images, fonts)
  if (
    e.request.destination === 'image' ||
    e.request.destination === 'font' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for HTML and manifest (always get latest)
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Notification schedule ──────────────────────────────────────────────────
let notifTimer = null;

function scheduleDaily(hour, min) {
  if (notifTimer) clearTimeout(notifTimer);
  const now = new Date();
  const next = new Date();
  next.setHours(hour, min, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  notifTimer = setTimeout(() => {
    self.registration.showNotification('DarkSet 💪', {
      body: 'Hora de treinar! Seu corpo agradece.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'darkset-daily',
      renotify: true,
      data: { url: './' }
    });
    scheduleDaily(hour, min);
  }, delay);
}

// ── Timer background ───────────────────────────────────────────────────────
let timerTimeout = null;

function cancelTimer() {
  if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
}

async function notifyTimerDone() {
  await self.registration.showNotification('⏱ Descanso finalizado!', {
    body: 'Hora da próxima série! 💪',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'darkset-rest',
    renotify: true,
    silent: false,
    vibrate: [320, 140, 320, 140, 420]
  });
  const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  allClients.forEach(c => c.postMessage({ type: 'TIMER_DONE' }));
}

// ── Messages — listener único ──────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'scheduleNotif') {
    const { hour, min } = e.data;
    scheduleDaily(hour, min);
  }

  // Legacy restTimer support
  if (e.data?.type === 'restTimer') {
    const { dur } = e.data;
    cancelTimer();
    timerTimeout = setTimeout(() => notifyTimerDone(), dur * 1000);
  }

  // TIMER_START: endsAt = absolute timestamp in ms
  if (e.data?.type === 'TIMER_START') {
    const endsAt = e.data.endsAt;
    if (!endsAt) return;
    cancelTimer();
    const delay = Math.max(0, endsAt - Date.now());
    timerTimeout = setTimeout(() => notifyTimerDone(), delay);
  }

  // TIMER_CANCEL
  if (e.data?.type === 'TIMER_CANCEL') {
    cancelTimer();
  }
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
