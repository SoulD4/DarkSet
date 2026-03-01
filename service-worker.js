// DarkSet Service Worker V5.1.0
const CACHE = 'darkset-v5-3-1';
const ASSETS = ['/', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

// ── Install: cache assets ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, cache fallback ───────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Messages from app ──────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'scheduleNotif') {
    const { hour, min } = e.data;
    scheduleDaily(hour, min);
  }
});

// ── Notification schedule ──────────────────────────────────────────────────
let notifTimer = null;

function scheduleDaily(hour, min) {
  if (notifTimer) clearTimeout(notifTimer);
  const now = new Date();
  const next = new Date();
  next.setHours(hour, min, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // next day if already passed
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
    scheduleDaily(hour, min); // reschedule for next day
  }, delay);
}

// ── Notification click: open app ───────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});

// ── Rest timer notification ────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'restTimer') {
    const { dur, exName } = e.data;
    setTimeout(() => {
      self.registration.showNotification('⏱ Descanso finalizado!', {
        body: exName ? `Próximo exercício: ${exName}` : 'Hora da próxima série!',
        icon: './icons/icon-192.png',
        tag: 'darkset-rest',
        silent: false,
      });
    }, dur * 1000);
  }
});
