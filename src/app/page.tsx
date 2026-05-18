'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── 型定義 ──────────────────────────────────────────────────────
type VoiceState = 'idle' | 'recording' | 'paused' | 'proofreading' | 'error';
type PromptMode = 'standard' | 'pro' | 'think';

interface HistoryEntry {
  id: string;
  topic: string;
  createdAt: number;
}

// ── 定数 ────────────────────────────────────────────────────────
const HISTORY_KEY = 'prompt-architect-history';
const MAX_HISTORY = 30;
const INTERIM_MARKER = '　【認識中…】';

// ── プロンプトテンプレート ────────────────────────────────────────
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

function buildStep1Pro(topic: string): string {
  return `以下のテーマについて、プロフェッショナルとして実務直結の解説をしてください。

【テーマ】
${topic}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ プロモード：テンポ重視・結論ファーストの方針
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【方針1：結論ファースト】
まず「最重要ポイント」「今日から使える結論」を冒頭に示し、その後に根拠・詳細を続けてください。

【方針2：実務直結・行動優先】
理論よりも「今すぐ使える」「今すぐ行動できる」ノウハウ・手順・判断基準を優先してください。

【方針3：箇条書き・番号リストで整理】
散文より構造化。読んで5秒で要点が掴めるフォーマットにしてください。

【方針4：プロの精度で正確に】
情報は最新・正確なものを。不確かな点はその旨を明示してください。

【方針5：Canva資料化を前提とした構成】
このあとCanva拡張機能で資料化するため、見出しと箇条書きを明確に使った構成にしてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
簡潔・実用・テンポよく、今すぐ答えてください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function buildStep1Think(topic: string): string {
  return `以下のテーマについて、論理的に深く思考し、多角的な視点から分析・解説してください。

【テーマ】
${topic}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 思考モード：論理・熟考・多角分析の方針
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【思考Step 1：テーマの本質を定義する】
「このテーマの核心は何か」「なぜこれが重要なのか」「前提として何を理解すべきか」を論理的に整理してください。

【思考Step 2：多角的な視点で考察する】
賛否・メリット・デメリット・短期と長期・専門家と初心者・楽観論と悲観論など、あらゆる角度から検討してください。

【思考Step 3：根拠に基づいて論を展開する】
「なぜそう言えるのか」という根拠・データ・事例を常に示しながら、論理の飛躍なく丁寧に進めてください。

【思考Step 4：矛盾・例外・落とし穴を明示する】
一般論が当てはまらないケースや、見落とされがちな例外・リスクも積極的に示してください。

【思考Step 5：結論と推奨アクションを提示する】
深い思考の末に導いた最も合理的な結論と、具体的な次の行動を示してください。

【出力条件】
・「思い込み」や「常識」に疑問を呈することをいとわない
・論理構造が視覚的に分かる見出し・構成で書く（Canva資料化を前提とする）
・深く・丁寧に・誠実に、熟考して答える

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
それでは、時間をかけて深く考え、今すぐ出力してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ── ユーティリティ ───────────────────────────────────────────────
function stripInterim(text: string) {
  return text.replace(new RegExp(`\\s*${INTERIM_MARKER.trim()}.*$`), '').trimEnd();
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function PromptArchitect() {
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState('');
  const [promptMode, setPromptMode] = useState<PromptMode>('standard');
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);
  const [copiedPro, setCopiedPro] = useState(false);
  const [copiedThink, setCopiedThink] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  // 校正機能
  const [rawText, setRawText] = useState('');
  const [proofreadText, setProofreadText] = useState('');
  const [proofreadError, setProofreadError] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // true = ユーザーが意図的に止めた / false = 聞き続けるべき状態（Android自動再開フラグ）
  const isUserStoppedRef = useRef(true);
  // onresult（非同期）で更新される最新テキストを stopListening が読めるよう ref で同期する
  const currentTextRef = useRef('');

  // ── 履歴: 初期ロード ────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* localStorage 利用不可でも無視 */ }
  }, []);

  const persistHistory = (entries: HistoryEntry[]) => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
  };

  const saveToHistory = useCallback((topic: string) => {
    if (topic.trim().length < 5) return;
    setHistory(prev => {
      const deduped = prev.filter(h => h.topic !== topic.trim());
      const next = [
        { id: Date.now().toString(), topic: topic.trim(), createdAt: Date.now() },
        ...deduped,
      ].slice(0, MAX_HISTORY);
      persistHistory(next);
      return next;
    });
  }, []);

  const deleteHistoryEntry = (id: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      persistHistory(next);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const clearAllHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    setExpandedId(null);
  };

  // ── 音声認識: 初期化（1度だけ） ────────────────────────────
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = 'ja-JP';
    r.continuous = true;
    r.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setText(prev => {
        const base = stripInterim(prev);
        const next = final
          ? (base + (base ? '　' : '') + final).trimStart()
          : (interim ? base + INTERIM_MARKER + interim : base);
        currentTextRef.current = stripInterim(next); // 最新の確定テキストを ref に同期
        return next;
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      // no-speech / aborted はAndroidで頻発するが無害なので無視
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      isUserStoppedRef.current = true;
      setVoiceState('error');
      setVoiceError('音声認識でエラーが発生しました。マイクの許可を確認してください。');
    };

    r.onend = () => {
      // 暫定テキストを除去
      setText(prev => stripInterim(prev));

      if (!isUserStoppedRef.current) {
        // ① Android対策: ユーザーが止めていないなら100ms後に自動再開
        setTimeout(() => {
          if (!isUserStoppedRef.current) {
            try {
              r.start();
            } catch {
              // start 失敗時はアイドルに戻す
              isUserStoppedRef.current = true;
              setVoiceState('idle');
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = r;
    return r;
  }, []);

  // ── 音声操作 ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const r = initRecognition();
    if (!r) {
      setVoiceState('error');
      setVoiceError('このブラウザは音声認識に対応していません（Chrome / Edge を推奨）。');
      return;
    }
    setVoiceError('');
    isUserStoppedRef.current = false;
    try {
      r.start();
      setVoiceState('recording');
    } catch { /* 既に start 済みの場合を無視 */ }
  }, [initRecognition]);

  // ② 一時停止（テキスト保持のまま認識だけ止める）
  const pauseListening = useCallback(() => {
    isUserStoppedRef.current = true; // onend で再起動しないよう先にフラグを立てる
    recognitionRef.current?.stop();
    setText(prev => stripInterim(prev));
    setVoiceState('paused');
  }, []);

  // ② 再開
  const resumeListening = useCallback(() => {
    setVoiceError('');
    isUserStoppedRef.current = false;
    try {
      recognitionRef.current?.start();
      setVoiceState('recording');
    } catch {
      setVoiceState('error');
      setVoiceError('再開に失敗しました。もう一度「話す」を押してください。');
      isUserStoppedRef.current = true;
    }
  }, []);

  // 完全停止 → Geminiで校正
  const stopListening = useCallback(async () => {
    isUserStoppedRef.current = true;
    recognitionRef.current?.stop();

    const raw = currentTextRef.current || stripInterim(text);
    setText(raw);

    if (!raw.trim()) {
      setVoiceState('idle');
      return;
    }

    // 校正フロー開始
    setRawText(raw);
    setProofreadText('');
    setProofreadError('');
    setVoiceState('proofreading');

    try {
      const res = await fetch('/api/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'APIエラー');
      setProofreadText(data.proofread ?? raw);
    } catch (e) {
      setProofreadError(e instanceof Error ? e.message : '校正に失敗しました');
    } finally {
      setVoiceState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      isUserStoppedRef.current = true;
      recognitionRef.current?.stop();
    };
  }, []);

  // ── コピー（③ 履歴保存も兼ねる） ──────────────────────────
  const copyToClipboard = (content: string, setCopied: (v: boolean) => void, topic?: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (topic) saveToHistory(topic);
    });
  };

  const copyHistoryPrompt = (entry: HistoryEntry, step: 1 | 2) => {
    const content = step === 1 ? buildStep1(entry.topic) : buildStep2();
    navigator.clipboard.writeText(content).then(() => {
      const key = `${entry.id}-${step}`;
      setCopiedHistoryId(key);
      setTimeout(() => setCopiedHistoryId(null), 2000);
    });
  };

  // ── 派生値 ──────────────────────────────────────────────────
  const cleanText = stripInterim(text).trim();
  const prompt1 =
    !cleanText ? '' :
    promptMode === 'pro'   ? buildStep1Pro(cleanText) :
    promptMode === 'think' ? buildStep1Think(cleanText) :
                             buildStep1(cleanText);
  const prompt2 = cleanText ? buildStep2() : '';
  const charCount = cleanText.length;
  const isActive = voiceState === 'recording' || voiceState === 'paused' || voiceState === 'proofreading';

  // ── レンダー ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-none">Prompt Architect</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">Gemini用・2ステッププロンプト自動生成</p>
          </div>
          {/* ③ 履歴ボタン */}
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showHistory
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <span>📋</span>
            <span className="hidden sm:inline">履歴</span>
            {history.length > 0 && (
              <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                showHistory ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
              }`}>
                {history.length > 9 ? '9+' : history.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ③ 履歴パネル */}
        {showHistory && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                過去の履歴 <span className="text-gray-400 font-normal">({history.length}件)</span>
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  すべて削除
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">
                まだ履歴がありません。プロンプトをコピーすると自動保存されます。
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {history.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const ep1 = buildStep1(entry.topic);
                  const ep2 = buildStep2();
                  return (
                    <li key={entry.id}>
                      {/* 折りたたみヘッダー */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex-shrink-0 text-gray-400 mt-0.5 text-xs">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug line-clamp-2">{entry.topic}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(entry.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={e => { e.stopPropagation(); setText(entry.topic); setShowHistory(false); }}
                            onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setText(entry.topic), setShowHistory(false))}
                            className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            再利用
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={e => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                            onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), deleteHistoryEntry(entry.id))}
                            className="text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </span>
                        </div>
                      </button>

                      {/* 展開: コピーボタン */}
                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-2 bg-gray-50 border-t border-gray-100">
                          <div className="pt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => copyHistoryPrompt(entry, 1)}
                              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                                copiedHistoryId === `${entry.id}-1`
                                  ? 'bg-green-500 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {copiedHistoryId === `${entry.id}-1` ? '✓ STEP1コピー済み' : 'STEP1をコピー'}
                            </button>
                            <button
                              onClick={() => copyHistoryPrompt(entry, 2)}
                              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                                copiedHistoryId === `${entry.id}-2`
                                  ? 'bg-green-500 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              {copiedHistoryId === `${entry.id}-2` ? '✓ STEP2コピー済み' : 'STEP2をコピー'}
                            </button>
                          </div>
                          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 max-h-36 overflow-y-auto">
                            <pre className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed">{ep1.split('\n').slice(0, 6).join('\n')}…</pre>
                          </div>
                          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 max-h-28 overflow-y-auto">
                            <pre className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed">{ep2.split('\n').slice(0, 4).join('\n')}…</pre>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* 入力エリア */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">0</span>
            <h2 className="text-sm font-semibold text-gray-700">テーマを入力</h2>
          </div>

          {/* ── 音声ボタン群 ── */}
          <div className="flex flex-col items-center gap-3">

            {/* idle: 話すボタン1つ */}
            {(voiceState === 'idle' || voiceState === 'error') && (
              <button
                onClick={startListening}
                className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-offset-2"
                aria-label="音声入力を開始"
              >
                <span className="text-2xl">🎤</span>
                <span className="text-xs">話す</span>
              </button>
            )}

            {/* recording: 一時停止（大）+ 停止（小） */}
            {voiceState === 'recording' && (
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={pauseListening}
                  className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg transition-all scale-105 focus:outline-none focus:ring-4 focus:ring-amber-300 focus:ring-offset-2"
                  aria-label="一時停止"
                >
                  <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-30" />
                  <span className="text-2xl relative z-10">⏸</span>
                  <span className="text-xs relative z-10">一時停止</span>
                </button>
                <button
                  onClick={stopListening}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-medium transition-all"
                  aria-label="録音を完全停止"
                >
                  <span>⏹</span> 停止（完了）
                </button>
              </div>
            )}

            {/* paused: 再開（大）+ 停止（小） */}
            {voiceState === 'paused' && (
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={resumeListening}
                  className="w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-offset-2"
                  aria-label="録音を再開"
                >
                  <span className="text-2xl">▶</span>
                  <span className="text-xs">再開</span>
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-amber-700 font-medium">一時停止中 — 続きから再開できます</span>
                </div>
                <button
                  onClick={stopListening}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-medium transition-all"
                  aria-label="録音を完全停止"
                >
                  <span>⏹</span> 停止（完了）
                </button>
              </div>
            )}

          </div>

          {/* 録音中インジケーター */}
          {voiceState === 'recording' && (
            <div className="flex items-center justify-center gap-2 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">録音中 — 言葉を続けて話せます（途切れても自動再開します）</span>
            </div>
          )}

          {/* エラー */}
          {voiceState === 'error' && voiceError && (
            <p className="text-xs text-red-500 text-center bg-red-50 rounded-xl px-4 py-2">⚠️ {voiceError}</p>
          )}

          {/* テキストエリア */}
          <div className="relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'例：「副業でYouTubeを始めて収益化するまでの手順」\n\n話したテキストが自動でここに入ります。手入力でも使えます。'}
              rows={5}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
            {text && (
              <button
                onClick={() => { setText(''); setVoiceError(''); if (!isActive) setVoiceState('idle'); }}
                className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="テキストをクリア"
              >✕</button>
            )}
          </div>
          {charCount > 0 && (
            <p className="text-xs text-gray-400 text-right">{charCount}文字</p>
          )}
        </section>

        {/* ── 校正中スピナー ── */}
        {voiceState === 'proofreading' && (
          <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-700">Geminiが校正・整理中...</p>
              <p className="text-xs text-gray-400 mt-0.5">話した内容を自然な文章に変換しています</p>
            </div>
          </section>
        )}

        {/* ── 校正結果カード ── */}
        {voiceState === 'idle' && proofreadText && (
          <section className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <span className="text-base">✨</span>
              <div>
                <p className="text-xs font-bold text-emerald-700">Geminiによる校正結果</p>
                <p className="text-[10px] text-emerald-500">採用するとこの内容でプロンプトが生成されます</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* 校正後テキスト */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm text-gray-800 leading-relaxed">{proofreadText}</p>
              </div>
              {/* 元テキストとの比較（変更がある場合のみ） */}
              {rawText !== proofreadText && (
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
                    <span className="group-open:hidden">▼</span>
                    <span className="hidden group-open:inline">▲</span>
                    元の音声テキストを確認
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3 leading-relaxed">
                    {rawText}
                  </p>
                </details>
              )}
              {/* ボタン */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setText(proofreadText); setProofreadText(''); setRawText(''); }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all"
                >
                  ✓ この内容で確定
                </button>
                <button
                  onClick={() => { setText(rawText); setProofreadText(''); setRawText(''); }}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm transition-all"
                >
                  元のまま
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── 校正エラー通知 ── */}
        {proofreadError && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="flex-shrink-0 text-amber-500">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700">校正をスキップしました</p>
              <p className="text-xs text-amber-600 mt-0.5">{proofreadError}</p>
              {proofreadError.includes('GEMINI_API_KEY') && (
                <p className="text-xs text-amber-500 mt-1">
                  .env.local に GEMINI_API_KEY を設定してサーバーを再起動してください。
                </p>
              )}
            </div>
            <button onClick={() => setProofreadError('')} className="flex-shrink-0 text-amber-400 hover:text-amber-600 text-xs">✕</button>
          </div>
        )}

        {/* プロンプト出力 */}
        {cleanText && !proofreadText && (
          <div className="space-y-4">

            {/* ── モード切り替えバー ── */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 tracking-wide">STEP 1 のモードを選択してコピー</p>

              <div className="grid grid-cols-3 gap-2">
                {/* 標準モード */}
                <button
                  onClick={() => {
                    setPromptMode('standard');
                    copyToClipboard(buildStep1(cleanText), setCopied1, cleanText);
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                    promptMode === 'standard'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <span className="text-lg">📋</span>
                  <span className="text-xs font-bold leading-none">標準</span>
                  <span className={`text-[9px] leading-tight ${promptMode === 'standard' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    網羅・大ボリューム
                  </span>
                  {copied1 && promptMode === 'standard' && (
                    <span className="text-[9px] font-semibold text-green-300">✓ コピー済み</span>
                  )}
                </button>

                {/* プロモード */}
                <button
                  onClick={() => {
                    setPromptMode('pro');
                    copyToClipboard(buildStep1Pro(cleanText), setCopiedPro, cleanText);
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                    promptMode === 'pro'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-lg">⚡</span>
                  <span className="text-xs font-bold leading-none">プロ</span>
                  <span className={`text-[9px] leading-tight ${promptMode === 'pro' ? 'text-amber-100' : 'text-gray-400'}`}>
                    結論優先・実務直結
                  </span>
                  {copiedPro && promptMode === 'pro' && (
                    <span className="text-[9px] font-semibold text-green-300">✓ コピー済み</span>
                  )}
                </button>

                {/* 思考モード */}
                <button
                  onClick={() => {
                    setPromptMode('think');
                    copyToClipboard(buildStep1Think(cleanText), setCopiedThink, cleanText);
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                    promptMode === 'think'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <span className="text-lg">🧠</span>
                  <span className="text-xs font-bold leading-none">思考</span>
                  <span className={`text-[9px] leading-tight ${promptMode === 'think' ? 'text-purple-100' : 'text-gray-400'}`}>
                    論理・多角分析
                  </span>
                  {copiedThink && promptMode === 'think' && (
                    <span className="text-[9px] font-semibold text-green-300">✓ コピー済み</span>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                タップで即コピー ＆ 下のSTEP 1プレビューが切り替わります
              </p>
            </section>

            {/* STEP 1 */}
            <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                  <div>
                    <p className="text-xs font-bold text-indigo-700">
                      STEP 1 — Geminiに貼り付ける
                      <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                        promptMode === 'pro'   ? 'bg-amber-100 text-amber-700' :
                        promptMode === 'think' ? 'bg-purple-100 text-purple-700' :
                                                 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {promptMode === 'pro' ? '⚡ プロ' : promptMode === 'think' ? '🧠 思考' : '📋 標準'}
                      </span>
                    </p>
                    <p className="text-[10px] text-indigo-400">
                      {promptMode === 'pro'   ? '結論優先・実務直結型' :
                       promptMode === 'think' ? '論理・多角分析型' :
                                               'ディープリサーチ・完全解説書型'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(prompt1, setCopied1, cleanText)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied1 ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
                  onClick={() => copyToClipboard(prompt2, setCopied2, cleanText)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied2 ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
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

        {/* 使い方ガイド（テキストが空のとき） */}
        {!cleanText && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">使い方</h2>
            <ol className="space-y-3">
              {[
                { n: 1, title: '「話す」ボタンで音声入力', desc: 'Androidでも途切れず認識し続けます。途中で考えたいときは「一時停止」が使えます。' },
                { n: 2, title: 'STEP 1をコピーしてGeminiに貼る', desc: '5つの必須条件を埋め込み済み。プロレベルのリサーチ＆解説書が自動生成されます。' },
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
