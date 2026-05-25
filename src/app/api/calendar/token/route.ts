import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/calendar/token
 * Body: { code: string }
 * Googleの認証コードをアクセストークン・リフレッシュトークンに交換する。
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json() as { code?: string };

    if (!code?.trim()) {
      return NextResponse.json({ error: '認証コードがありません' }, { status: 400 });
    }

    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const redirectUri  = `${appUrl}/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google APIの認証情報が未設定です（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET）' },
        { status: 503 }
      );
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const data = await tokenRes.json() as Record<string, unknown>;

    if (!tokenRes.ok) {
      const errMsg = (data.error_description as string) ?? (data.error as string) ?? 'トークン取得失敗';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // access_token / refresh_token / expires_in を返す
    return NextResponse.json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in ?? 3600,
      token_type:    data.token_type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/calendar/token (refresh)
 * Body: { refreshToken: string }
 * リフレッシュトークンを使ってアクセストークンを更新する。
 */
export async function PUT(req: NextRequest) {
  try {
    const { refreshToken } = await req.json() as { refreshToken?: string };

    if (!refreshToken?.trim()) {
      return NextResponse.json({ error: 'リフレッシュトークンがありません' }, { status: 400 });
    }

    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Google APIの認証情報が未設定です' }, { status: 503 });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    'refresh_token',
      }),
    });

    const data = await tokenRes.json() as Record<string, unknown>;

    if (!tokenRes.ok) {
      return NextResponse.json({ error: (data.error_description as string) ?? 'トークン更新失敗' }, { status: 400 });
    }

    return NextResponse.json({
      access_token: data.access_token,
      expires_in:   data.expires_in ?? 3600,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
