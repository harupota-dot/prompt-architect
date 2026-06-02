/* ═══════════════════════════════════════════════════════════════════
   SPARTA AI — Timer Web Worker
   役割: メインスレッドから切り離されたスレッドで正確に秒数を刻む。
         タブが非アクティブ / 画面ロック中でもタイマーが遅延しない。
   ═══════════════════════════════════════════════════════════════════ */

var intervalId = null;
var remaining  = 0;

self.onmessage = function (e) {
  var type    = (e.data && e.data.type)    || '';
  var seconds = (e.data && e.data.seconds) || 0;

  // ── START: カウントダウン開始 ──────────────────────────────────
  if (type === 'START') {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    remaining = Math.max(0, Math.round(seconds));

    // 開始直後に現在値を送って UI を即反映
    self.postMessage({ type: 'TICK', remaining: remaining });

    if (remaining === 0) {
      self.postMessage({ type: 'DONE', remaining: 0 });
      return;
    }

    intervalId = setInterval(function () {
      remaining = Math.max(0, remaining - 1);

      if (remaining > 0) {
        self.postMessage({ type: 'TICK', remaining: remaining });
      } else {
        self.postMessage({ type: 'DONE', remaining: 0 });
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 1000);
  }

  // ── STOP: カウントダウン停止 ───────────────────────────────────
  if (type === 'STOP') {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    remaining = 0;
    self.postMessage({ type: 'STOPPED' });
  }
};
