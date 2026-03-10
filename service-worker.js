// DarkSet Service Worker V5.8.0
const CACHE_NAME = 'darkset-v5-8-0';
const ASSETS_TO_CACHE = [
  '/',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

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

// ── Timer state ────────────────────────────────────────────────────────────
let timerEndsAt = null;
let timerInterval = null;

function cancelTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerEndsAt = null;
}

async function notifyTimerDone() {
  cancelTimer();
  try {
    await self.registration.showNotification('⏱ Descanso finalizado!', {
      body: 'Hora da próxima série! 💪',
      icon: './icons/icon-192.png',
      badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHRleHQgeD0iNDgiIHk9Ijc0IiBmb250LWZhbWlseT0iSW1wYWN0LEFyaWFsIE5hcnJvdyxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+RFM8L3RleHQ+PC9zdmc+',
      tag: 'darkset-rest',
      renotify: true,
      silent: false,
      vibrate: [400, 100, 400, 100, 600],
      requireInteraction: false
    });
  } catch(err) {
    console.warn('[SW] notification failed:', err);
  }
  try {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    allClients.forEach(c => c.postMessage({ type: 'TIMER_DONE' }));
  } catch(_) {}
}

// Keeps SW alive by holding a promise open while timer runs
// Uses setInterval at 500ms — more reliable than setTimeout on Samsung One UI
function startTimerInterval(endsAt) {
  cancelTimer();
  timerEndsAt = endsAt;

  return new Promise(resolve => {
    timerInterval = setInterval(() => {
      if (Date.now() >= timerEndsAt) {
        notifyTimerDone().then(resolve).catch(resolve);
      }
    }, 500);
  });
}

// ── Messages ───────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'TIMER_START') {
    const endsAt = e.data.endsAt;
    if (!endsAt) return;
    // e.waitUntil keeps the SW alive until the promise resolves
    e.waitUntil(startTimerInterval(endsAt));
  }

  if (e.data.type === 'TIMER_CANCEL') {
    cancelTimer();
  }

  // Legacy
  if (e.data.type === 'restTimer') {
    const endsAt = Date.now() + (e.data.dur * 1000);
    e.waitUntil(startTimerInterval(endsAt));
  }

  if (e.data.type === 'scheduleNotif') {
    const { hour, min } = e.data;
    scheduleDaily(hour, min);
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

// ── Daily notification schedule ────────────────────────────────────────────
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
      badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHRleHQgeD0iNDgiIHk9Ijc0IiBmb250LWZhbWlseT0iSW1wYWN0LEFyaWFsIE5hcnJvdyxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+RFM8L3RleHQ+PC9zdmc+',
      tag: 'darkset-daily',
      renotify: true,
      data: { url: './' }
    });
    scheduleDaily(hour, min);
  }, delay);
}
