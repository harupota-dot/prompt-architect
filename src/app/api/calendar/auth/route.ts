import { NextResponse } from 'next/server';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

/**
 * GET /api/calendar/auth
 * Googleカレンダー OAuth2 認証URLを生成して返す。
 * フロントエンドはこのURLをポップアップウィンドウで開く。
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID が未設定です。Google Cloud ConsoleでOAuthアプリを作成し、.env.localに設定してください。' },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUri = `${appUrl}/auth/google/callback`;

  // CSRF防止用のstateをランダム生成
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // refresh_token を受け取るため
    prompt:        'consent',   // 毎回consent画面を表示（refresh_token確保）
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url, state, redirectUri });
}
