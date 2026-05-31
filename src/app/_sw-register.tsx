'use client';

import { useEffect } from 'react';
import { migrateStorage } from '@/lib/shared-store';

// ── アプリバージョン ──────────────────────────────────────────────
// コードの大幅変更・localStorage スキーマ変更時にインクリメントする。
// これを変えるとマイグレーションが走り古いキャッシュが一掃される。
export const APP_VERSION = '1.3.0';

// ── ChunkLoadError 検出パターン ───────────────────────────────────
// JS/CSS チャンクが古いキャッシュで見つからない場合に発生するエラー文字列
const CHUNK_ERR_RE =
  /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed|Cannot find module|LOADING_CHUNK_FAILED/i;

function isChunkError(msg: string): boolean {
  return CHUNK_ERR_RE.test(msg);
}

// ── キャッシュ全消去 → リロード（無限ループ防止付き） ─────────────
function recoverFromChunkError(): void {
  const RELOAD_KEY   = 'sparta-chunk-reload-ts';
  const RELOAD_COUNT = 'sparta-chunk-reload-cnt';
  const now          = Date.now();
  const lastReload   = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0');
  const reloadCount  = Number(sessionStorage.getItem(RELOAD_COUNT) ?? '0');

  // 30 秒以内に 2 回以上リロードしていたら諦める（無限ループ防止）
  if (now - lastReload < 30_000 && reloadCount >= 2) return;

  sessionStorage.setItem(RELOAD_KEY,   String(now));
  sessionStorage.setItem(RELOAD_COUNT, String(reloadCount + 1));

  const doReload = () => window.location.reload();

  // Service Worker キャッシュを全消去してからリロード
  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .catch(() => {})
      .finally(doReload);
  } else {
    doReload();
  }
}

// ── メインコンポーネント ──────────────────────────────────────────
export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ─── 1. ストレージバージョン確認 & マイグレーション ──────────
    // バージョンが変わっていなければ即 return (コスト≒0)
    // バージョン変更時は壊れたデータを検出・修復する
    migrateStorage(APP_VERSION);

    // ─── 2. ChunkLoadError グローバルキャッチ → 自動リカバリ ──────
    // デプロイ後に古い JS チャンク URL を踏んだときのエラーを捕捉
    const onError = (ev: ErrorEvent) => {
      if (isChunkError(ev.message ?? '')) {
        ev.preventDefault();
        recoverFromChunkError();
      }
    };
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message ?? ev.reason ?? '');
      if (isChunkError(msg)) {
        ev.preventDefault();
        recoverFromChunkError();
      }
    };

    window.addEventListener('error',            onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    // ─── 3. Service Worker 登録 & 自動アップデート ───────────────
    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('error',             onError);
        window.removeEventListener('unhandledrejection', onUnhandled);
      };
    }

    // controllerchange = 新しい SW がこのページを制御開始した瞬間
    // → ページを 1 回だけ自動リロードして最新コードを適用する
    let reloaded = false;
    const onControllerChange = () => {
      if (!reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // SW 登録本体
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // 既に waiting 中の新 SW がいれば即アクティブ化を命令
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // 新 SW の install 完了 → SKIP_WAITING を送って即アクティブ化
        const onUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // installed = キャッシュ確保完了・waiting 状態
            // → SKIP_WAITING で waiting をスキップして activate へ進む
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        };
        reg.addEventListener('updatefound', onUpdateFound);
      })
      .catch(() => { /* SW 登録失敗は無視してアプリは動作継続 */ });

    return () => {
      window.removeEventListener('error',             onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
