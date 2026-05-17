'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── 型定義 ────────────────────────────────────────────────────
type VoiceState = 'idle' | 'recording' | 'error';

// ── 定数：5大必須条件を埋め込んだプロンプトテンプレート ──────
function buildStep1(topic: string): string {
  return `以下のテーマについて、学習・実務に深く活用できる「完全解説書」を作成してください。

【テーマ】
${topic}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 必ず守ってほしい5つの条件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【条件1：プロの視点＆最新市場情報】
その分野の第一線のプロフェッショナルの視点に立ち、単なる教科書的な説明にとどまらず、最新の市場動向・業界トレンド・実務的なデータや事例を含めて深くリサーチしてください。

【条件2：情報の厳密な精査（セルフチェック必須）】
回答を出力する前に、あなた自身（Gemini）で「この情報は本当に正確か？矛盾はないか？古い情報ではないか？」を徹底的にファクトチェック・自己検証してから出力してください。

【条件3：超・初心者向けの丁寧な解説】
内容の深さや専門性は保ちながら、解説の言葉遣いは「今日その分野に初めて触れる完全な初心者」でも100%理解できるレベルに噛み砕いてください。専門用語は必ず平易な言葉で言い換え、具体的な例え話や図解的な説明を随所に挟んでください。

【条件4：圧倒的な大ボリュームと網羅性】
「要約でいい」「省略してもいい」という発想は一切捨ててください。背景・理論・具体策・注意点・応用方法まで、ステップバイステップで漏れなく詳細に書ききってください。情報量の多さが価値です。

【条件5：Canvaでの資料化を前提とした構成】
このあと、あなたが出力したテキストをCanvaの拡張機能で資料としてデザインします。そのため、見出し・小見出し・箇条書きを明確に使い、Canvaのスライドに落とし込みやすい「論理的で視覚的に整理された構成」で書いてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
それでは、上記5条件を完全に満たした完全解説書を、今すぐ出力してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function buildStep2(): string {
  return `ありがとうございます。完璧な解説書ができました。

では次のステップです。今あなたが作成してくれたこの解説書のテキスト全体を元にして、**Canvaの拡張機能**を使い、印刷して使える「学習ノート資料」としてデザインして出力してください。

【デザインの条件】

▶ 用途・サイズ
・A4サイズでPDF保存し、印刷して手元で見返すための資料です

▶ レイアウト・デザイン
・初心者が一目でポイントを掴めるよう、重要キーワードを大きく・目立つ色で強調してください
・見出しと本文のメリハリを明確にし、読んでいて疲れないレイアウトにしてください
・インディゴブルー・パープル系のアクセントカラーを使った、スマートで洗練されたデザインにしてください

▶ ページ分割
・文字が小さくなりすぎないよう、内容に応じて複数ページ（スライド）に分割してください
・1ページあたりの情報量は「読んで疲れない量」に抑えてください

▶ その他
・図やアイコンなど、Canvaの素材を積極的に使って視覚的に分かりやすくしてください
・完成したらPDFでエクスポートできる状態にしてください`;
}

// ── メインコンポーネント ──────────────────────────────────────
export default function PromptArchitect() {
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState('');
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // 音声認識インスタンスを初期化（初回のみ）
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === 'undefined') return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setText(prev => {
        // 確定テキストは追記、暫定は最後に付加して上書き
        const base = prev.replace(/\s*【認識中…】.*$/, '');
        if (final) return (base + (base ? '　' : '') + final).trimStart();
        return base + (interim ? `　【認識中…】${interim}` : '');
      });
    };

    recognition.onerror = () => {
      setVoiceState('error');
      setVoiceError('音声認識でエラーが発生しました。マイクの許可を確認してください。');
    };

    recognition.onend = () => {
      // continuous=true でも環境によって自動停止する場合がある
      setVoiceState(s => s === 'recording' ? 'idle' : s);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  const toggleListening = useCallback(() => {
    setVoiceError('');

    if (voiceState === 'recording') {
      recognitionRef.current?.stop();
      // 【認識中…】の残骸を除去
      setText(prev => prev.replace(/\s*【認識中…】.*$/, '').trimEnd());
      setVoiceState('idle');
      return;
    }

    const recognition = initRecognition();
    if (!recognition) {
      setVoiceState('error');
      setVoiceError('このブラウザは音声認識に対応していません（Chrome / Edge を推奨）。');
      return;
    }

    recognition.start();
    setVoiceState('recording');
  }, [voiceState, initRecognition]);

  // コンポーネントアンマウント時にクリーンアップ
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const copyToClipboard = (content: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const prompt1 = text.trim() ? buildStep1(text.trim()) : '';
  const prompt2 = text.trim() ? buildStep2() : '';
  const charCount = text.trim().length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">Prompt Architect</h1>
            <p className="text-xs text-gray-400 mt-0.5">Gemini用・2ステッププロンプト自動生成</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Step 0: 入力エリア ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">0</span>
            <h2 className="text-sm font-semibold text-gray-700">テーマを入力</h2>
          </div>

          {/* 音声ボタン */}
          <div className="flex justify-center">
            <button
              onClick={toggleListening}
              aria-label={voiceState === 'recording' ? '録音を停止' : '音声入力を開始'}
              className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 text-white font-semibold text-sm transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2
                ${voiceState === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-105'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300 hover:scale-105 active:scale-95'
                }`}
            >
              {voiceState === 'recording' && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              )}
              <span className="text-2xl relative z-10">
                {voiceState === 'recording' ? '⏹' : '🎤'}
              </span>
              <span className="relative z-10 text-xs">
                {voiceState === 'recording' ? '停止' : '話す'}
              </span>
            </button>
          </div>

          {/* 録音中インジケーター */}
          {voiceState === 'recording' && (
            <div className="flex items-center justify-center gap-2 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">録音中 — 話し終わったら「停止」を押してください</span>
            </div>
          )}

          {/* エラー表示 */}
          {voiceState === 'error' && voiceError && (
            <p className="text-xs text-red-500 text-center bg-red-50 rounded-xl px-4 py-2">
              ⚠️ {voiceError}
            </p>
          )}

          {/* テキストエリア */}
          <div className="relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'例：「副業でYouTubeを始めて収益化するまでの手順」&#10;&#10;話したテキストが自動でここに入ります。手入力でも使えます。'}
              rows={5}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
            {text && (
              <button
                onClick={() => { setText(''); setVoiceError(''); setVoiceState('idle'); }}
                className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="テキストをクリア"
              >
                ✕
              </button>
            )}
          </div>
          {charCount > 0 && (
            <p className="text-xs text-gray-400 text-right">{charCount}文字</p>
          )}
        </section>

        {/* ── プロンプト出力 ── */}
        {prompt1 && (
          <div className="space-y-4">

            {/* STEP 1 */}
            <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                  <div>
                    <p className="text-xs font-bold text-indigo-700">STEP 1 — Geminiに貼り付ける</p>
                    <p className="text-[10px] text-indigo-400">ディープリサーチ・完全解説書の執筆依頼</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(prompt1, setCopied1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied1
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copied1 ? '✓ コピー済み' : 'コピー'}
                </button>
              </div>
              <pre className="px-5 py-4 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {prompt1}
              </pre>
            </section>

            {/* STEP 2 */}
            <section className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-purple-50 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">2</span>
                  <div>
                    <p className="text-xs font-bold text-purple-700">STEP 2 — Geminiの回答後に貼り付ける</p>
                    <p className="text-[10px] text-purple-400">Canvaでデザイン・A4 PDF化の依頼</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(prompt2, setCopied2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied2
                      ? 'bg-green-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copied2 ? '✓ コピー済み' : 'コピー'}
                </button>
              </div>
              <pre className="px-5 py-4 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {prompt2}
              </pre>
            </section>

          </div>
        )}

        {/* ── 使い方ガイド（テキストが空のとき） ── */}
        {!text && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">使い方</h2>
            <ol className="space-y-3">
              {[
                { n: 1, title: '「話す」ボタンで音声入力', desc: 'マイクに向かってテーマを話すと自動でテキスト化されます。手入力でもOK。' },
                { n: 2, title: 'STEP 1プロンプトをコピーしてGeminiに貼る', desc: '5つの必須条件を埋め込み済み。プロレベルのリサーチ＆解説書が自動生成されます。' },
                { n: 3, title: 'GeminiがSTEP 1を回答したらSTEP 2を貼る', desc: 'Canva拡張機能が起動し、A4サイズの印刷用PDF資料が完成します。' },
              ].map(item => (
                <li key={item.n} className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mt-0.5">
                    {item.n}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

      </main>
    </div>
  );
}
