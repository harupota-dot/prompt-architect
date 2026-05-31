'use client';

import { useEffect } from 'react';

/**
 * グローバルエラーバウンダリ
 * React レンダリング中にキャッチされなかった例外が発生した場合に
 * 真っ白な画面の代わりにこのUIを表示する。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーを記録（本番ではエラー監視サービスに送信できる）
    console.error('[SPARTA AI] Render error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
        <p className="text-5xl">🔥</p>
        <div>
          <h2 className="text-lg font-black text-red-600 mb-1">スパルタAI エラー発生</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            予期しない問題が発生しました。
            <br />下のボタンで再試行してください。
          </p>
        </div>
        {error?.message && (
          <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded-xl px-3 py-2 text-left break-all leading-relaxed">
            {error.message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black transition-all"
          >
            🔄 再試行する
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all"
          >
            🏠 トップに戻る
          </button>
        </div>
        <p className="text-[10px] text-gray-300">
          問題が続く場合はブラウザの履歴・キャッシュを消去してみてください
        </p>
      </div>
    </div>
  );
}
