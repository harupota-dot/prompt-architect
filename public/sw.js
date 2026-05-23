/* ═══════════════════════════════════════════════════════════════
   SPARTA AI — Service Worker v2
   機能:
     • バックグラウンドでのスケジュール通知
     • 通知クリック時のウィンドウフォーカス / 新規起動
     • メインスレッドへの音声再生トリガー送信
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sparta-ai-v2';
const PRECACHE_URLS = ['/', '/sparta', '/sports', '/manifest.json', '/favicon.ico'];

// ── インストール & アクティベート ──────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── ネットワークファースト fetch ────────────────────────────────
self.addEventListener('fetch', (e) => {
  // API routes は常にネットワーク
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── スケジュール通知受信（メインスレッドから） ──────────────────
// payload: { type: 'SCHEDULE_NOTIFY', title, body, delay, tag, soundType? }
self.addEventListener('message', (event) => {
  const { type, title, body, delay, tag, soundType } = event.data ?? {};
  if (type !== 'SCHEDULE_NOTIFY') return;

  const ms = Math.max(0, delay ?? 0);

  setTimeout(async () => {
    // OS通知を表示
    const notifOpts = {
      body:             body ?? '今すぐ行動しろ！',
      icon:             '/icons/icon-512.svg',
      badge:            '/icons/icon-192.svg',
      tag:              tag ?? 'sparta',
      requireInteraction: true,        // ユーザーが操作するまで残す
      vibrate:          [200, 100, 200, 100, 400],
      data:             { soundType: soundType ?? 'alarm', url: '/sparta' },
      actions: [
        { action: 'open',    title: '🔥 アプリを開く' },
        { action: 'dismiss', title: '✕ 閉じる'        },
      ],
    };

    await self.registration.showNotification(title ?? '🔥 スパルタ警告！', notifOpts);

    // 全クライアントに「音を鳴らせ」メッセージを送信
    const clientList = await self.clients.matchAll({ includeUncontrolled: true });
    clientList.forEach(client =>
      client.postMessage({ type: 'PLAY_SOUND', soundType: soundType ?? 'alarm' })
    );
  }, ms);
});

// ── 通知クリック ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/sparta';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既にアプリのウィンドウが開いていればフォーカス
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            // ページを sparta に遷移させてフォーカス
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        // 開いていなければ新規ウィンドウで起動
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ── プッシュ通知受信（将来の Web Push 対応用） ──────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title ?? '🔥 スパルタ通知';
  const body  = data.body  ?? 'タスクの時間だ！今すぐ行動しろ！';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:    '/icons/icon-512.svg',
      badge:   '/icons/icon-192.svg',
      tag:     data.tag ?? 'sparta-push',
      vibrate: [300, 150, 300],
      requireInteraction: true,
      data:    { url: data.url ?? '/sparta', soundType: data.soundType ?? 'alarm' },
    })
  );
});
