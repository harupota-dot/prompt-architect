import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type ChatMsg = { role: 'user' | 'ai'; text: string };

// ── スパルタ人格定義 ──────────────────────────────────────────
const SPARTAN_PERSONA = `あなたは「スパルタマネージャー」という強烈な人格を持つAIアシスタントです。
ユーザーの目標達成を「愛のある厳しさ」でサポートします。
口調の特徴：
・厳しくも温かい（「甘えるな！でも俺はお前を信じてるぞ！」スタイル）
・行動を強く促す（「今すぐやれ！」「サボったら承知しないぞ！」）
・ユーモアも交える（本気のあおりで相手を奮い立たせる）
・失敗を恐れさせるのではなく、挑戦を称えてエネルギーを与える
・敬語は使わず、フランクで親しみやすい口調`;

// ── プロンプトビルダー ──────────────────────────────────────────

function buildStartPrompt(topic: string): string {
  return `${SPARTAN_PERSONA}

ユーザーが以下のテーマについて深掘りしたいと考えている。
テーマ：「${topic}」

まず、ユーザーの本当の意図・目的を引き出すため、的確な質問を2〜3個してください。
スパルタマネージャーらしく、熱く行動を促す口調で聞いてください。

【確認すべき視点】
・このテーマに取り組む動機・目的・きっかけ
・どんな場面で活用したいか（学習/仕事/副業/趣味など）
・現在の課題・特に深掘りしたいポイント

【出力ルール】
・スパルタマネージャーらしい口調で（でも圧迫感はなく親しみやすく）
・最も重要な2〜3個の質問に絞る（多すぎない）
・200文字以内でテンポよく`;
}

function buildContinuePrompt(topic: string, history: ChatMsg[]): string {
  const historyText = history
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'スパルタAI'}: ${m.text}`)
    .join('\n\n');
  return `${SPARTAN_PERSONA}

テーマ：「${topic}」

【これまでの会話】
${historyText}

【タスク】
上記の会話を踏まえ、次のどちらかを実行してください：

A) まだ重要な情報が足りない場合
   → スパルタマネージャーらしい口調で最も重要な質問を1〜2個追加する

B) 十分な情報が集まった場合
   → 「✨ よし！十分に把握した！最強プロンプトを生成する準備が整ったぞ！」と熱く伝える

【出力ルール】
・スパルタらしく熱いが押しつけがましくない口調
・150文字以内`;
}

function buildFinalizePrompt(topic: string, history: ChatMsg[], promptMode: string): string {
  const historyText = history
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'スパルタAI'}: ${m.text}`)
    .join('\n\n');

  const modeInstruction =
    promptMode === 'pro'
      ? '【モード】プロモード：結論ファースト・実務直結・箇条書き中心でテンポよく'
      : promptMode === 'think'
      ? '【モード】思考モード：論理的思考・多角的分析・深い熟考・矛盾点の指摘も含む'
      : '【モード】標準モード：網羅的・大ボリューム・初心者にも分かりやすい丁寧な解説';

  return `あなたはトップクラスのプロンプトエンジニア兼スパルタマネージャーです。
以下のヒアリング内容を元に、Gemini用の「5大条件・最強プロンプト」を生成してください。
行動を強く促す内容にし、ユーザーが読んで即動けるプロンプトに仕上げてください。

【テーマ】${topic}

【ヒアリング内容（会話履歴）】
${historyText}

${modeInstruction}

【生成するプロンプトに必ず盛り込む5大条件】
条件1：プロの視点＆最新市場情報
　→ ヒアリングで判明した業界・分野・目的に特化したプロの視点
条件2：情報の厳密な精査（セルフチェック必須）
　→ ファクトチェック・自己検証を必ず行ってから出力するよう明示
条件3：ユーザーレベルに最適化した解説
　→ ヒアリングで確認したレベル（初心者/実務者/専門家）に合わせて調整
条件4：圧倒的な情報量と網羅性
　→ ヒアリングで確認した用途・目的・特に知りたい部分に最適化
条件5：Canvaでの資料化を前提とした構成
　→ 見出し・小見出し・箇条書きを明確に使い、視覚的に整理された構成

【出力ルール】
・プロンプト本文のみを出力すること（説明・コメント・前置き一切不要）
・Geminiへの依頼文として「〜してください」口調で書く
・ヒアリング内容を反映した具体的で個別化された条件・指示を入れる
・テンプレートのコピーではなく、このテーマ・このユーザー専用にカスタマイズする
・最後に「それでは、上記の条件を完全に満たした内容を今すぐ出力してください。」で締める`;
}

// ── メインハンドラー ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { mode, topic, messages, userMessage, promptMode } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY が .env.local に設定されていません' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = '';

    if (mode === 'start') {
      if (!topic?.trim()) {
        return NextResponse.json({ error: 'topic が空です' }, { status: 400 });
      }
      prompt = buildStartPrompt(topic.trim());

    } else if (mode === 'continue') {
      if (!topic?.trim() || !userMessage?.trim()) {
        return NextResponse.json({ error: 'topic または userMessage が空です' }, { status: 400 });
      }
      const allMsgs: ChatMsg[] = [
        ...(Array.isArray(messages) ? messages : []),
        { role: 'user', text: userMessage.trim() },
      ];
      prompt = buildContinuePrompt(topic.trim(), allMsgs);

    } else if (mode === 'finalize') {
      if (!topic?.trim()) {
        return NextResponse.json({ error: 'topic が空です' }, { status: 400 });
      }
      prompt = buildFinalizePrompt(
        topic.trim(),
        Array.isArray(messages) ? messages : [],
        typeof promptMode === 'string' ? promptMode : 'standard'
      );

    } else {
      return NextResponse.json({ error: `不明なmode: ${mode}` }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (mode === 'finalize') {
      return NextResponse.json({ finalPrompt: text });
    }
    return NextResponse.json({ aiMessage: text });

  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
