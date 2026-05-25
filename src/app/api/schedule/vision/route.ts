import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/schedule/vision
 * Body: { imageBase64: string, mimeType?: string }
 *
 * Gemini Vision APIを使って画像（時間割・予定プリント）から
 * スケジュール情報を抽出し JSON で返す。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      imageBase64: string;
      mimeType?:   string;
    };

    const { imageBase64, mimeType = 'image/jpeg' } = body;

    if (!imageBase64?.trim()) {
      return NextResponse.json({ error: '画像データがありません' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です' }, { status: 500 });
    }

    const today  = new Date().toISOString().split('T')[0];
    const genAI  = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `あなたはスパルタマネージャーAIです。
この画像（時間割・予定表・プリント・スケジュール等）から、
カレンダーに登録すべき予定・タスクをすべて読み取り、JSONのみで出力せよ。
マークダウンのコードブロック・説明文・コメントは一切不要。JSONのみ。

【今日の日付】${today}

【出力JSON形式（厳守）】
{
  "items": [
    {
      "title": "タスク名（20文字以内）",
      "description": "詳細説明（任意）",
      "startDate": "YYYY-MM-DD",
      "time": "HH:MM",
      "duration": 60,
      "recurrence": "none",
      "recurrenceDays": [],
      "category": "study",
      "source": "ai-parsed"
    }
  ],
  "spartanMessage": "スパルタマネージャーらしい登録完了メッセージ（50文字以内。「サボったら承知しないぞ！」を必ず含める）",
  "summary": "画像から読み取った内容のサマリー（40文字以内）",
  "confidence": 0.9
}

【抽出ルール】
- 画像内の科目名・授業名・予定名をすべて title に変換
- 画像内の日付・曜日から startDate を推測（特定不可の場合は今日以降の直近）
- 画像内の開始時間が読み取れた場合のみ time フィールドを設定
- 授業時間はデフォルト90分（duration: 90）
- 繰り返し授業は recurrence: "weekly" と recurrenceDays に曜日番号を設定
  （0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土）
- category: "study"（授業・学習）| "work"（仕事・MT）| "health"（健康）| "other"
- recurrence: "none" | "daily" | "weekly"
- 画像にスケジュール情報がない場合は items を空配列に
- JSONのみ出力。前後の説明・コメント一切不要`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    let raw = result.response.text().trim();
    // Strip markdown code fences if Gemini wraps the output.
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const parsed = JSON.parse(raw) as {
      items:          Record<string, unknown>[];
      spartanMessage: string;
      summary:        string;
      confidence:     number;
    };

    const items = (parsed.items ?? []).map((item, i) => ({
      ...item,
      id:     `vision-${Date.now()}-${i}`,
      source: 'ai-parsed' as const,
    }));

    return NextResponse.json({
      items,
      spartanMessage: parsed.spartanMessage ?? '画像を解析した！サボったら承知しないぞ！',
      summary:        parsed.summary        ?? '画像からスケジュールを抽出しました',
      confidence:     parsed.confidence     ?? 0.8,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
