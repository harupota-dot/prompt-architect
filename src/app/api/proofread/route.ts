import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText?.trim()) {
      return NextResponse.json({ proofread: rawText ?? '' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY が .env.local に設定されていません' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    const prompt = `以下は音声認識で取得した日本語テキストです。次のルールに従い、校正・整理してください。

【校正ルール】
1. 音声認識の誤変換を文脈から正しい言葉に修正する
2. 「えー」「あの」「えっと」「まぁ」などのフィラーを除去する
3. 話し言葉を自然な書き言葉・質問文に整える
4. 重複・冗長な部分を簡潔にまとめる
5. テーマ・質問の意図は絶対に変えずに、Geminiへの問いかけとして明確な文章にする
6. 出力は1〜4文程度にまとめる

【音声認識テキスト】
${rawText}

【出力ルール】
・校正後のテキストのみを出力すること（説明・コメント不要）
・日本語で出力すること`;

    const result = await model.generateContent(prompt);
    const proofread = result.response.text().trim();

    return NextResponse.json({ proofread });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
