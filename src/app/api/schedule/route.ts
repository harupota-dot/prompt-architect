import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Open data schema — designed to accept external app sync (externalId / metadata fields).
export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;          // YYYY-MM-DD
  endDate?: string;
  time?: string;              // HH:MM
  duration?: number;          // minutes
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceDays?: number[];  // 0=Sun … 6=Sat
  category: 'study' | 'work' | 'health' | 'other';
  source: 'manual' | 'ai-parsed' | 'external-app';
  externalId?: string;        // for future external-app sync
  metadata?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'テキストが空です' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です' }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `あなたはスパルタマネージャーAIです。
以下のテキストからカレンダーに登録すべきスケジュール・タスクを抽出し、JSONのみで出力せよ。
マークダウンのコードブロック・説明文・コメントは一切不要。JSONのみ。

【入力テキスト】
${text}

【今日の日付】${today}

【出力JSON形式（厳守）】
{
  "items": [
    {
      "title": "タスク名（20文字以内）",
      "description": "詳細説明",
      "startDate": "YYYY-MM-DD",
      "time": "HH:MM",
      "duration": 60,
      "recurrence": "none",
      "recurrenceDays": [],
      "category": "study",
      "source": "ai-parsed"
    }
  ],
  "spartanMessage": "スパルタマネージャーらしい登録完了メッセージ（60文字以内。熱く行動を促す内容。「サボったら承知しないぞ！」を必ず含める）",
  "summary": "登録内容の日本語サマリー（1文、40文字以内）"
}

【制約】
- recurrence: "none"|"daily"|"weekly"|"monthly"
- recurrenceDays: weeklyのときのみ指定。0=日 1=月 2=火 3=水 4=木 5=金 6=土
- category: "study"|"work"|"health"|"other"
- startDate: ${today}以降の直近の適切な日付
- 時間指定がなければtimeフィールドは省略
- 繰り返しがなければrecurrenceDays=[]
- JSONのみ出力。前後の説明・コメント一切不要`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    // Strip markdown code fences if Gemini wraps the output.
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const parsed = JSON.parse(raw) as {
      items: Omit<ScheduleItem, 'id'>[];
      spartanMessage: string;
      summary: string;
    };

    const items: ScheduleItem[] = (parsed.items ?? []).map((item, i) => ({
      ...item,
      id: `ai-${Date.now()}-${i}`,
      source: 'ai-parsed' as const,
    }));

    return NextResponse.json({
      items,
      spartanMessage: parsed.spartanMessage ?? 'サボったら承知しないぞ！今すぐ行動に移せ！',
      summary: parsed.summary ?? '',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
