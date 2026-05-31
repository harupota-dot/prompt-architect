'use client';

import { useEffect } from 'react';

export default function SpartaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Sparta] Render error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-24">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
        <p className="text-5xl">⚠️</p>
        <div>
          <h2 className="text-base font-black text-gray-900 mb-1">タスク管理画面でエラー</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            画面の読み込みに失敗しました。
            <br />タスクデータは保存されています。
          </p>
        </div>
        {error?.message && (
          <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded-xl px-3 py-2 text-left break-all">
            {error.message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black transition-all"
          >
            🔄 再読み込み
          </button>
          <button
            onClick={() => { window.location.reload(); }}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
          >
            ↺ ページをリフレッシュ
          </button>
        </div>
      </div>
    </div>
  );
}
