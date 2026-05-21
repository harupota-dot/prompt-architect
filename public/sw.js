/* SPARTA AI — Service Worker (push notifications) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Main thread sends { type:'SCHEDULE_NOTIFY', title, body, delay, tag }
self.addEventListener('message', (event) => {
  const { type, title, body, delay, tag } = event.data ?? {};
  if (type !== 'SCHEDULE_NOTIFY') return;
  setTimeout(() => {
    self.registration.showNotification(title ?? '🔥 スパルタ警告！', {
      body: body ?? '今すぐ行動しろ！',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag ?? 'sparta',
      requireInteraction: false,
    });
  }, Math.max(0, delay ?? 0));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) { list[0].focus(); return; }
      return clients.openWindow('/sparta');
    })
  );
});
