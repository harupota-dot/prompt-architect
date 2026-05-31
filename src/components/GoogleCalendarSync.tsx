'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTasks } from '@/lib/shared-store';

// ── localStorage キー ────────────────────────────────────────────
const KEY_TOKEN   = 'gcal_access_token';
const KEY_EXPIRY  = 'gcal_token_expiry';
const KEY_REFRESH = 'gcal_refresh_token';
const KEY_SYNC_ON = 'gcal_auto_sync';

function loadToken(): string {
  try { return (typeof window !== 'undefined' && localStorage.getItem(KEY_TOKEN)) || ''; }
  catch { return ''; }
}
function loadExpiry(): number {
  try { return Number((typeof window !== 'undefined' && localStorage.getItem(KEY_EXPIRY)) || '0'); }
  catch { return 0; }
}
function isTokenValid(): boolean {
  try { return !!loadToken() && loadExpiry() > Date.now() + 60_000; }
  catch { return false; }
}

// ── 型 ──────────────────────────────────────────────────────────
interface SyncResult { title: string; success: boolean; error?: string }
interface SyncResponse {
  succeeded: number; total: number; message: string;
  results:   SyncResult[];
  error?:    string;
}

interface Props {
  speakSpartan: (text: string) => void;
}

// ── コンポーネント ───────────────────────────────────────────────
export function GoogleCalendarSync({ speakSpartan }: Props) {
  const [connected,    setConnected]    = useState(false);
  const [autoSync,     setAutoSync]     = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [syncResult,   setSyncResult]   = useState<SyncResponse | null>(null);
  const [authError,    setAuthError]    = useState('');
  const [needsSetup,   setNeedsSetup]   = useState(false);
  const [collapsed,    setCollapsed]    = useState(true);

  // ── 初期化 ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      setConnected(isTokenValid());
      setAutoSync(
        typeof window !== 'undefined' && localStorage.getItem(KEY_SYNC_ON) === '1'
      );
    } catch { /* localStorage unavailable — ignore */ }
  }, []);

  // ── ポップアップからのメッセージを受信 ──────────────────────────
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'GCAL_AUTH_SUCCESS') {
        const { accessToken, expiresIn, refreshToken } = e.data as {
          accessToken: string; expiresIn: number; refreshToken?: string;
        };
        localStorage.setItem(KEY_TOKEN,  accessToken);
        localStorage.setItem(KEY_EXPIRY, String(Date.now() + Number(expiresIn ?? 3600) * 1000));
        if (refreshToken) localStorage.setItem(KEY_REFRESH, refreshToken);
        setConnected(true);
        setAuthError('');
        speakSpartan('Googleカレンダーとの連携が完了した！タスクを同期できるぞ！');
      }
      if (e.data?.type === 'GCAL_AUTH_ERROR') {
        setAuthError(`認証失敗: ${e.data.error ?? '不明なエラー'}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [speakSpartan]);

  // ── Google認証開始 ─────────────────────────────────────────────
  const handleConnect = async () => {
    setAuthError('');
    try {
      const res  = await fetch('/api/calendar/auth');
      const data = await res.json() as { url?: string; error?: string };

      if (data.error) {
        if (data.error.includes('GOOGLE_CLIENT_ID')) {
          setNeedsSetup(true);
        }
        setAuthError(data.error);
        return;
      }

      if (!data.url) return;

      // ポップアップで認証画面を開く
      const popup = window.open(
        data.url,
        'google-oauth',
        'width=520,height=620,scrollbars=yes,resizable=yes'
      );
      if (!popup) {
        setAuthError('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
      }
    } catch (e) {
      setAuthError(`接続エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ── 切断 ────────────────────────────────────────────────────────
  const handleDisconnect = () => {
    if (!confirm('Googleカレンダーとの連携を解除しますか？')) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_EXPIRY);
        localStorage.removeItem(KEY_REFRESH);
        localStorage.removeItem(KEY_SYNC_ON);
      }
    } catch { /* ignore */ }
    setConnected(false);
    setAutoSync(false);
    setSyncResult(null);
  };

  // ── トークンを有効なものに更新 ────────────────────────────────
  const refreshToken = useCallback(async (): Promise<string> => {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(KEY_REFRESH) : null;
    if (!refresh) throw new Error('再認証が必要です');

    const res  = await fetch('/api/calendar/token', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: string };
    if (data.error) throw new Error(data.error);

    const newToken = data.access_token!;
    localStorage.setItem(KEY_TOKEN,  newToken);
    localStorage.setItem(KEY_EXPIRY, String(Date.now() + Number(data.expires_in ?? 3600) * 1000));
    return newToken;
  }, []);

  // ── タスク同期実行 ────────────────────────────────────────────
  const handleSync = async (tasksToSync?: ReturnType<typeof getTasks>) => {
    setSyncing(true);
    setSyncResult(null);

    try {
      // トークン期限確認・更新
      let token = loadToken();
      if (!isTokenValid()) {
        token = await refreshToken();
        setConnected(true);
      }

      // 同期対象: scheduledDate があるタスク
      const tasks = (tasksToSync ?? getTasks()).filter(t =>
        t.scheduledDate && t.status !== 'COMPLETED'
      );

      if (tasks.length === 0) {
        setSyncResult({ succeeded: 0, total: 0, message: '同期するタスクがありません（スケジュール日付なしのタスクは対象外）', results: [] });
        return;
      }

      const res  = await fetch('/api/calendar/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          accessToken: token,
          tasks: tasks.map(t => ({
            title:         t.title,
            description:   t.description,
            scheduledDate: t.scheduledDate,
            scheduledTime: t.scheduledTime,
            estimatedMin:  t.estimatedMin,
            recurrence:    t.recurrence,
          })),
        }),
      });

      const data = await res.json() as SyncResponse;
      setSyncResult(data);

      if (data.succeeded > 0) {
        speakSpartan(
          `よし！${data.succeeded}件のタスクをGoogleカレンダーに同期した！` +
          'これで予定を見逃す言い訳はないぞ！サボったら承知しないぞ！'
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncResult({ succeeded: 0, total: 0, message: `同期失敗: ${msg}`, results: [], error: msg });
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  };

  // ── 自動同期トグル ────────────────────────────────────────────
  const toggleAutoSync = (on: boolean) => {
    setAutoSync(on);
    try { if (typeof window !== 'undefined') localStorage.setItem(KEY_SYNC_ON, on ? '1' : '0'); } catch { /* ignore */ }
    if (on) speakSpartan('自動同期ONだ！タスクを追加するたびにGoogleカレンダーに反映されるぞ！');
  };

  // ── UI ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-95 transition-all"
      >
        <span className="text-xl">📅</span>
        <div className="flex-1 text-left">
          <p className="text-xs font-black text-white">Googleカレンダー同期</p>
          <p className="text-[10px] text-blue-200">
            {connected ? '✅ 連携中 — タスクをGoogleカレンダーに反映' : '未連携 — タップして設定'}
          </p>
        </div>
        {connected && (
          <span className="text-[9px] bg-green-400 text-green-900 font-black px-2 py-0.5 rounded-full flex-shrink-0">
            連携済み
          </span>
        )}
        <span className={`text-white text-xs transition-transform flex-shrink-0 ${collapsed ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3">

          {/* ── 未セットアップ時の説明 ── */}
          {needsSetup && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <p className="text-xs font-black text-amber-800">⚙️ Google Cloud Consoleでの設定が必要です</p>
              <ol className="text-[10px] text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Google Cloud Console → 新規プロジェクト作成</li>
                <li>「APIとサービス」→ Google Calendar API を有効化</li>
                <li>「認証情報」→ OAuth 2.0 クライアントIDを作成（種類: ウェブアプリ）</li>
                <li>承認済みリダイレクトURI に <code className="bg-amber-100 px-1 rounded text-[9px]">http://localhost:3000/auth/google/callback</code> を追加</li>
                <li>.env.local に <code className="bg-amber-100 px-1 rounded text-[9px]">GOOGLE_CLIENT_ID</code> と <code className="bg-amber-100 px-1 rounded text-[9px]">GOOGLE_CLIENT_SECRET</code> を設定</li>
                <li>サーバーを再起動</li>
              </ol>
            </div>
          )}

          {/* ── 接続状態 & ボタン ── */}
          {connected ? (
            <div className="space-y-3">
              {/* 接続済みバナー */}
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-xl flex-shrink-0">✅</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-green-800">Googleカレンダーと連携済み</p>
                  <p className="text-[10px] text-green-600">タスクをワンクリックで同期できます</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 bg-red-50 rounded-lg font-bold"
                >
                  連携解除
                </button>
              </div>

              {/* 自動同期トグル */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-gray-700">自動同期</p>
                  <p className="text-[10px] text-gray-400">タスク追加・変更時に自動でカレンダーに反映</p>
                </div>
                <button
                  onClick={() => toggleAutoSync(!autoSync)}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    autoSync ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    autoSync ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* 手動同期ボタン */}
              <button
                onClick={() => handleSync()}
                disabled={syncing}
                className={`w-full py-3 rounded-xl text-sm font-black transition-all ${
                  syncing
                    ? 'bg-blue-300 text-white cursor-wait animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {syncing ? '⏳ 同期中...' : '🔄 今すぐGoogleカレンダーに同期'}
              </button>

              {/* 同期結果 */}
              {syncResult && (
                <div className={`p-3 rounded-xl text-xs ${
                  syncResult.error
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <p className="font-bold">{syncResult.message}</p>
                  {syncResult.results?.filter(r => !r.success).map((r, i) => (
                    <p key={i} className="text-[10px] text-red-500 mt-0.5">✕ {r.title}: {r.error}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Googleアカウントと連携することで、アプリ内のタスクを
                Googleカレンダーに自動・手動で同期できます。
              </p>
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700 font-semibold">⛔ {authError}</p>
                </div>
              )}
              <button
                onClick={handleConnect}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2"
              >
                <span className="text-base">🔗</span>
                Googleアカウントで連携する
              </button>
              <p className="text-[9px] text-gray-400 text-center leading-relaxed">
                Googleカレンダーの読み取り・書き込み権限を要求します。<br/>
                アプリが削除するイベントはありません。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
