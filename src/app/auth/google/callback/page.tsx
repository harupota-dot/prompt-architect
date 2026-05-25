'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// useSearchParams は Suspense 境界が必要
function CallbackInner() {
  const searchParams = useSearchParams();
  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Googleと連携しています...');

  useEffect(() => {
    const code  = searchParams.get('code');
    const error = searchParams.get('error');

    // ── 認証拒否 ────────────────────────────────────────────────
    if (error) {
      setStatus('error');
      setMessage(`認証が拒否されました: ${error}`);
      postToOpener({ type: 'GCAL_AUTH_ERROR', error });
      return;
    }

    // ── コードなし ────────────────────────────────────────────
    if (!code) {
      setStatus('error');
      setMessage('認証コードを取得できませんでした。');
      postToOpener({ type: 'GCAL_AUTH_ERROR', error: 'no_code' });
      return;
    }

    // ── コードをトークンに交換 ─────────────────────────────────
    fetch('/api/calendar/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then((data: Record<string, unknown>) => {
        if (data.error) {
          setStatus('error');
          setMessage(String(data.error));
          postToOpener({ type: 'GCAL_AUTH_ERROR', error: data.error });
          return;
        }

        // トークンを localStorage に保存（ポップアップなのでオープナーと同じオリジン）
        try {
          localStorage.setItem('gcal_access_token',  String(data.access_token ?? ''));
          localStorage.setItem('gcal_token_expiry',  String(Date.now() + Number(data.expires_in ?? 3600) * 1000));
          if (data.refresh_token) {
            localStorage.setItem('gcal_refresh_token', String(data.refresh_token));
          }
        } catch {
          // localStorage unavailable in some popup contexts — opener will handle via postMessage
        }

        setStatus('success');
        setMessage('Googleカレンダーとの連携が完了しました！');
        postToOpener({ type: 'GCAL_AUTH_SUCCESS', accessToken: data.access_token, expiresIn: data.expires_in, refreshToken: data.refresh_token });
      })
      .catch(err => {
        setStatus('error');
        setMessage(`通信エラー: ${err instanceof Error ? err.message : String(err)}`);
        postToOpener({ type: 'GCAL_AUTH_ERROR', error: String(err) });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
        <p className="text-5xl">
          {status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </p>
        <p className="text-base font-black text-gray-900">
          {status === 'loading' ? '認証処理中...'
           : status === 'success' ? 'Googleカレンダー連携完了！'
           : '連携に失敗しました'}
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        {status === 'success' && (
          <p className="text-xs text-green-600 font-semibold">
            このウィンドウは自動で閉じます...
          </p>
        )}
        {status === 'error' && (
          <button
            onClick={() => window.close()}
            className="text-sm text-red-500 underline hover:text-red-700"
          >
            ウィンドウを閉じる
          </button>
        )}
      </div>
    </div>
  );
}

function postToOpener(msg: Record<string, unknown>) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(msg, window.location.origin);
      if (msg.type === 'GCAL_AUTH_SUCCESS' || msg.type === 'GCAL_AUTH_ERROR') {
        setTimeout(() => window.close(), 1500);
      }
    }
  } catch {
    // Cross-origin or opener not available
  }
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-white text-sm">読み込み中...</div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
