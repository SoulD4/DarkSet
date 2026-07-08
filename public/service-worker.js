// DarkSet — service worker de limpeza (v6)
// O SW legado (darkset-v5-x) cacheava HTML e prendia usuários em versões
// antigas do app. Este worker se auto-remove: limpa todos os caches,
// desregistra e recarrega os clients para buscarem a versão atual do servidor.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.navigate(client.url));
    })(),
  );
});
