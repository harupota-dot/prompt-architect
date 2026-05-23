'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { addTask, getDailyRecord, getDoneExercises, today as todayStr, getSpartanComment } from '@/lib/shared-store';
import { DailyQuoteSection } from '@/components/DailyQuoteSection';
import { WeatherWidget } from '@/components/WeatherWidget';
import { MusicFactWidget } from '@/components/MusicFactWidget';
import { DashboardHeader } from '@/components/DashboardHeader';
import { EnglishQuiz } from '@/components/EnglishQuiz';

// ── 型定義 ──────────────────────────────────────────────────────
type VoiceState = 'idle' | 'recording' | 'paused' | 'proofreading' | 'error';
type PromptMode = 'standard' | 'pro' | 'think';
type AppPhase = 'input' | 'catchball' | 'result' | 'scheduling';

interface ChatMsg { role: 'user' | 'ai'; text: string }
interface HistoryEntry { id: string; topic: string; createdAt: number }

// Open schema — extensible for external-app sync (externalId / metadata).
interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  duration?: number;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceDays?: number[];
  category: 'study' | 'work' | 'health' | 'other';
  source: 'manual' | 'ai-parsed' | 'external-app';
  externalId?: string;
  metadata?: Record<string, unknown>;
}

interface HealthSnapshot {
  date: string;
  steps: number;
  activeMinutes: number;
  calories: number;
  source: 'google-health' | 'mock';
}

// ── 定数 ────────────────────────────────────────────────────────
const HISTORY_KEY  = 'prompt-architect-history';
const SCHEDULE_KEY = 'sparta-ai-schedules';
const MAX_HISTORY  = 30;
const INTERIM_MARKER = '　【認識中…】';
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

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

// ── ユーティリティ ────────────────────────────────────────────
function stripInterim(text: string) {
  return text.replace(new RegExp(`\\s*${INTERIM_MARKER.trim()}.*$`), '').trimEnd();
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function recurrenceLabel(item: ScheduleItem): string {
  if (item.recurrence === 'none') return '一回のみ';
  if (item.recurrence === 'daily') return '毎日';
  if (item.recurrence === 'monthly') return '毎月';
  if (item.recurrence === 'weekly') {
    const days = (item.recurrenceDays ?? []).map(d => DAY_NAMES[d]).join('・');
    return days ? `毎週（${days}）` : '毎週';
  }
  return item.recurrence;
}

function categoryColor(cat: ScheduleItem['category']) {
  return cat === 'study'  ? 'bg-blue-100 text-blue-700'   :
         cat === 'work'   ? 'bg-purple-100 text-purple-700' :
         cat === 'health' ? 'bg-green-100 text-green-700'  :
                            'bg-gray-100 text-gray-600';
}

function categoryLabel(cat: ScheduleItem['category']) {
  return cat === 'study' ? '学習' : cat === 'work' ? '仕事' : cat === 'health' ? '健康' : 'その他';
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SpartaAI() {

  // ── テキスト・音声 state ─────────────────────────────────────
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState('');
  const [rawText, setRawText] = useState('');
  const [proofreadText, setProofreadText] = useState('');
  const [proofreadError, setProofreadError] = useState('');

  // ── アプリフェーズ ────────────────────────────────────────────
  const [appPhase, setAppPhase] = useState<AppPhase>('input');
  /** スケジュール登録後に「戻る」で返るフェーズ */
  const [prevPhase, setPrevPhase] = useState<AppPhase>('input');
  const [confirmedTopic, setConfirmedTopic] = useState('');

  // ── キャッチボール ────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [aiTurnCount, setAiTurnCount] = useState(0);
  const [chatVoiceActive, setChatVoiceActive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── 結果 ───────────────────────────────────────────────────────
  const [promptMode, setPromptMode] = useState<PromptMode>('standard');
  const [finalStep1, setFinalStep1] = useState('');
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [finalError, setFinalError] = useState('');
  const [copiedFinal1, setCopiedFinal1] = useState(false);
  const [copiedFinal2, setCopiedFinal2] = useState(false);
  const [isCatchballResult, setIsCatchballResult] = useState(false);

  // ── スケジュール ──────────────────────────────────────────────
  const [scheduledItems, setScheduledItems] = useState<ScheduleItem[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [spartanMessage, setSpartanMessage] = useState('');
  const [scheduleSummary, setScheduleSummary] = useState('');
  const [isScheduleConfirmed, setIsScheduleConfirmed] = useState(false);

  // ── ヘルスデータ ──────────────────────────────────────────────
  const [healthData, setHealthData] = useState<{ today: HealthSnapshot; spartanComment: string; note: string } | null>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // ── 履歴 ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  // ── 音声認識 Refs ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isUserStoppedRef   = useRef(true);
  const currentTextRef     = useRef('');
  // Accumulated isFinal text across recognition sessions — prevents duplicate on restart.
  const confirmedFinalRef  = useRef('');
  const restartTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatRecognitionRef = useRef<any>(null);

  // ── 履歴ロード ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
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
    setHistory(prev => { const next = prev.filter(h => h.id !== id); persistHistory(next); return next; });
    if (expandedId === id) setExpandedId(null);
  };

  const clearAllHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    setExpandedId(null);
  };

  // ── チャットスクロール ────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoadingChat]);

  // ── ヘルスデータ取得 ──────────────────────────────────────────
  const fetchHealth = useCallback(() => {
    if (healthData) return;
    const record = getDailyRecord(todayStr());
    const done = getDoneExercises(todayStr());
    setHealthData({
      today: {
        date: todayStr(),
        steps: record.steps ?? 0,
        activeMinutes: done.length * 15,
        calories: record.calBurned ?? 0,
        source: 'mock',
      },
      spartanComment: getSpartanComment(record.steps, done.length),
      note: '運動アプリ（/sports）で記録したデータがリアルタイム反映されます',
    });
  }, [healthData]);

  // ── 音声認識：初期化 ──────────────────────────────────────────
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = 'ja-JP';
    r.continuous     = true;
    r.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      // Skip processing once the user has intentionally stopped — prevents
      // the final event that fires just before onend from duplicating text.
      if (isUserStoppedRef.current) return;

      let newFinal = '';
      let interim  = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) newFinal += t;
        else interim += t;
      }

      // Append only newly confirmed (isFinal) text to the accumulator.
      // This ref persists across session restarts so the same text is never added twice.
      if (newFinal) {
        confirmedFinalRef.current = confirmedFinalRef.current
          ? confirmedFinalRef.current + '　' + newFinal
          : newFinal;
      }

      const base    = confirmedFinalRef.current;
      const display = interim ? base + INTERIM_MARKER + interim : base;
      setText(display);
      currentTextRef.current = base;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      const err: string = event.error ?? 'unknown';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        isUserStoppedRef.current = true;
        setVoiceState('error');
        setVoiceError('マイクの使用が許可されていません。ブラウザのアドレスバー横のマイクアイコンから許可してください。');
      }
    };

    r.onend = () => {
      setText(prev => stripInterim(prev));
      if (isUserStoppedRef.current) return;
      // Browser auto-stopped (Safari / Android timeout) — restart quietly after 600ms.
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (isUserStoppedRef.current) return;
        try {
          r.start();
        } catch (e: unknown) {
          if ((e as Error)?.name !== 'InvalidStateError') setVoiceState('idle');
        }
      }, 600);
    };

    recognitionRef.current = r;
    return r;
  }, []);

  const startListening = useCallback(() => {
    const r = initRecognition();
    if (!r) {
      setVoiceState('error');
      setVoiceError('このブラウザは音声認識に対応していません（Chrome / Edge を推奨）。');
      return;
    }
    // Fresh recording session — reset accumulated text and UI.
    confirmedFinalRef.current = '';
    currentTextRef.current    = '';
    setText('');
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    setVoiceError('');
    isUserStoppedRef.current = false;
    try {
      r.start();
      setVoiceState('recording');
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'InvalidStateError') {
        setVoiceState('recording');
      } else {
        setVoiceState('error');
        setVoiceError('マイクの起動に失敗しました。ページを再読み込みして試してください。');
        isUserStoppedRef.current = true;
      }
    }
  }, [initRecognition]);

  const pauseListening = useCallback(() => {
    isUserStoppedRef.current = true;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    recognitionRef.current?.stop();
    setText(prev => {
      const clean = stripInterim(prev);
      // Sync the accumulator so manual edits made while paused are picked up on resume.
      confirmedFinalRef.current = clean;
      return clean;
    });
    setVoiceState('paused');
  }, []);

  const resumeListening = useCallback(() => {
    // Sync accumulator from current text in case user edited it while paused.
    confirmedFinalRef.current = stripInterim(text);
    setVoiceError('');
    isUserStoppedRef.current = false;
    try {
      recognitionRef.current?.start();
      setVoiceState('recording');
    } catch {
      recognitionRef.current = null;
      const r = initRecognition();
      if (r) {
        try { r.start(); setVoiceState('recording'); }
        catch {
          setVoiceState('error');
          setVoiceError('再開に失敗しました。もう一度「話す」を押してください。');
          isUserStoppedRef.current = true;
        }
      }
    }
  }, [initRecognition, text]);

  // ── 共通：AI校正処理（音声・テキスト両ルートで呼ばれる） ────────
  const handleProcessText = useCallback(async (raw: string) => {
    if (!raw.trim()) return;
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
  }, []);

  const stopListening = useCallback(async () => {
    isUserStoppedRef.current = true;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    recognitionRef.current?.stop();
    const raw = confirmedFinalRef.current || currentTextRef.current || stripInterim(text);
    confirmedFinalRef.current = ''; // reset after use
    setText(raw);
    if (!raw.trim()) { setVoiceState('idle'); return; }
    await handleProcessText(raw);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, handleProcessText]);

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      isUserStoppedRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognitionRef.current?.stop();
      chatRecognitionRef.current?.stop();
    };
  }, []);

  // ── テキスト確定 ──────────────────────────────────────────────
  const confirmTopic = (topic: string) => {
    const t = topic.trim();
    setConfirmedTopic(t);
    setText(t);
    setProofreadText('');
    setRawText('');
    setProofreadError('');
  };

  // ── 全リセット ────────────────────────────────────────────────
  const resetAll = () => {
    setText('');
    setConfirmedTopic('');
    setAppPhase('input');
    setPrevPhase('input');
    setChatMessages([]);
    setChatInput('');
    setFinalStep1('');
    setFinalError('');
    setProofreadText('');
    setRawText('');
    setProofreadError('');
    setAiTurnCount(0);
    setVoiceState('idle');
    setVoiceError('');
    setIsCatchballResult(false);
    setIsGeneratingFinal(false);
    setScheduledItems([]);
    setIsScheduling(false);
    setScheduleError('');
    setSpartanMessage('');
    setScheduleSummary('');
    setIsScheduleConfirmed(false);
    confirmedFinalRef.current = '';
    currentTextRef.current    = '';
  };

  // ── キャッチボール開始 ────────────────────────────────────────
  const startCatchball = async () => {
    setAppPhase('catchball');
    setChatMessages([]);
    setAiTurnCount(0);
    setIsLoadingChat(true);
    setChatError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'start', topic: confirmedTopic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'APIエラー');
      setChatMessages([{ role: 'ai', text: data.aiMessage }]);
      setAiTurnCount(1);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'エラーが発生しました');
      setAppPhase('input');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // ── チャット会話全体をスケジュール登録用テキストに変換 ─────────
  const buildChatScheduleText = useCallback((): string => {
    const parts: string[] = [`【相談テーマ】\n${confirmedTopic}`];
    chatMessages.forEach(m => {
      if (m.role === 'ai')   parts.push(`【AIの提案・回答】\n${m.text}`);
      else                   parts.push(`【ユーザーの条件・要望】\n${m.text}`);
    });
    return parts.join('\n\n');
  }, [confirmedTopic, chatMessages]);

  // ── スパルタ・スケジュール登録 ────────────────────────────────
  /** textToSchedule を省略すると confirmedTopic を使用 */
  const startSchedule = async (textToSchedule?: string) => {
    const src = textToSchedule ?? confirmedTopic;
    setPrevPhase(appPhase);          // 呼び出し元フェーズを記憶
    setAppPhase('scheduling');
    setScheduledItems([]);
    setScheduleError('');
    setSpartanMessage('');
    setIsScheduleConfirmed(false);
    setIsScheduling(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: src }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'APIエラー');
      setScheduledItems(data.items ?? []);
      setSpartanMessage(data.spartanMessage ?? '');
      setScheduleSummary(data.summary ?? '');
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : 'スケジュール解析に失敗しました');
    } finally {
      setIsScheduling(false);
    }
  };

  // スケジュールを LocalStorage に保存して確定
  const confirmSchedule = () => {
    try {
      const existing: ScheduleItem[] = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '[]');
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify([...existing, ...scheduledItems]));
    } catch { /* ignore */ }
    // Also write to sparta-tasks-v2 (compatible with スパルタマネージャー)
    scheduledItems.forEach(item => {
      addTask({
        title: item.title,
        description: item.description,
        priority: 'MEDIUM',
        status: 'TODO',
        scheduledDate: item.startDate,
        scheduledTime: item.time,
        estimatedMin: item.duration,
        recurrence: item.recurrence === 'monthly' ? 'none' : item.recurrence,
        category: item.category,
        source: 'ai-parsed',
        externalId: item.id,
        metadata: item.metadata,
      });
    });
    setIsScheduleConfirmed(true);
    saveToHistory(confirmedTopic);
  };

  // ── チャットメッセージ送信 ─────────────────────────────────────
  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || isLoadingChat) return;
    const userMsg: ChatMsg = { role: 'user', text: msg };
    const newMsgs: ChatMsg[] = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsLoadingChat(true);
    setChatError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'continue',
          topic: confirmedTopic,
          messages: chatMessages,
          userMessage: msg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'APIエラー');
      setChatMessages([...newMsgs, { role: 'ai', text: data.aiMessage }]);
      setAiTurnCount(prev => prev + 1);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // ── キャッチボールから最強プロンプト生成 ──────────────────────
  const finalizeCatchball = async (mode: PromptMode) => {
    setPromptMode(mode);
    setIsGeneratingFinal(true);
    setFinalError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'finalize',
          topic: confirmedTopic,
          messages: chatMessages,
          promptMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'APIエラー');
      setFinalStep1(data.finalPrompt);
      setIsCatchballResult(true);
      setAppPhase('result');
      saveToHistory(confirmedTopic);
    } catch (e) {
      setFinalError(e instanceof Error ? e.message : 'プロンプト生成に失敗しました');
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  // ── 直接生成（キャッチボールなし） ───────────────────────────
  const generateDirectly = (mode: PromptMode) => {
    setPromptMode(mode);
    const step1 =
      mode === 'pro'   ? buildStep1Pro(confirmedTopic) :
      mode === 'think' ? buildStep1Think(confirmedTopic) :
                         buildStep1(confirmedTopic);
    setFinalStep1(step1);
    setIsCatchballResult(false);
    setAppPhase('result');
    saveToHistory(confirmedTopic);
  };

  // ── チャット用音声入力（ワンショット） ────────────────────────
  const toggleChatVoice = () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (chatVoiceActive) { chatRecognitionRef.current?.stop(); setChatVoiceActive(false); return; }
    const r = new SR();
    r.lang = 'ja-JP'; r.continuous = false; r.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      const t = event.results[0]?.[0]?.transcript ?? '';
      if (t) setChatInput(prev => prev + (prev ? '　' : '') + t);
    };
    r.onend  = () => setChatVoiceActive(false);
    r.onerror = () => setChatVoiceActive(false);
    chatRecognitionRef.current = r;
    try { r.start(); setChatVoiceActive(true); } catch { setChatVoiceActive(false); }
  };

  // ── コピー ────────────────────────────────────────────────────
  const copyText = (content: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  // ── 派生値 ────────────────────────────────────────────────────
  const cleanText     = stripInterim(text).trim();
  const isActive      = voiceState === 'recording' || voiceState === 'paused' || voiceState === 'proofreading';
  const hasUserReplied = chatMessages.some(m => m.role === 'user');
  const step2         = buildStep2();
  const modeLabel     = promptMode === 'pro' ? 'Pro' : promptMode === 'think' ? 'Think' : '標準';

  // ── レンダー ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 leading-none">SPARTA AI</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {appPhase === 'catchball'  ? 'スパルタAIと深掘り中…'       :
               appPhase === 'result'    ? 'プロンプト生成完了！'          :
               appPhase === 'scheduling' ? 'スパルタ・スケジュール登録中…' :
               '話す or 打つ → AIが磨く → 行動へ'}
            </p>
          </div>

          {/* 履歴ボタン */}
          {appPhase === 'input' && (
            <button
              onClick={() => setShowHistory(v => !v)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showHistory ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <span>📋</span>
              <span className="hidden sm:inline">履歴</span>
              {history.length > 0 && (
                <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                  showHistory ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                }`}>{history.length > 9 ? '9+' : history.length}</span>
              )}
            </button>
          )}
          {/* リセットボタン */}
          {appPhase !== 'input' && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
            >
              ↺ 最初から
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ════════════════════════════════════════
            INPUT フェーズ
        ════════════════════════════════════════ */}
        {appPhase === 'input' && (
          <>
            {/* 履歴パネル */}
            {showHistory && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">
                    過去の履歴 <span className="text-gray-400 font-normal">({history.length}件)</span>
                  </h2>
                  {history.length > 0 && (
                    <button onClick={clearAllHistory} className="text-xs text-red-400 hover:text-red-600 transition-colors">すべて削除</button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-gray-400 text-center">まだ履歴がありません。</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {history.map(entry => {
                      const isExpanded = expandedId === entry.id;
                      return (
                        <li key={entry.id}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex-shrink-0 text-gray-400 mt-0.5 text-xs">{isExpanded ? '▲' : '▼'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 leading-snug line-clamp-2">{entry.topic}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(entry.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span role="button" tabIndex={0}
                                onClick={e => { e.stopPropagation(); confirmTopic(entry.topic); setShowHistory(false); }}
                                onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), confirmTopic(entry.topic), setShowHistory(false))}
                                className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">再利用</span>
                              <span role="button" tabIndex={0}
                                onClick={e => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                                onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), deleteHistoryEntry(entry.id))}
                                className="text-[10px] text-gray-300 hover:text-red-400 transition-colors">✕</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-4 space-y-2 bg-gray-50 border-t border-gray-100">
                              <div className="pt-3 grid grid-cols-2 gap-2">
                                <button onClick={() => copyHistoryPrompt(entry, 1)}
                                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${copiedHistoryId === `${entry.id}-1` ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                  {copiedHistoryId === `${entry.id}-1` ? '✓ STEP1コピー済み' : 'STEP1をコピー'}
                                </button>
                                <button onClick={() => copyHistoryPrompt(entry, 2)}
                                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${copiedHistoryId === `${entry.id}-2` ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                                  {copiedHistoryId === `${entry.id}-2` ? '✓ STEP2コピー済み' : 'STEP2をコピー'}
                                </button>
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

            {/* テーマ未確定：音声入力セクション */}
            {!confirmedTopic && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">0</span>
                  <h2 className="text-sm font-semibold text-gray-700">何を相談・解決したい？</h2>
                </div>

                {/* 音声ボタン群 */}
                <div className="flex flex-col items-center gap-3">
                  {(voiceState === 'idle' || voiceState === 'error') && (
                    <button onClick={startListening}
                      className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-offset-2"
                      aria-label="音声入力を開始">
                      <span className="text-2xl">🎤</span>
                      <span className="text-xs">話す</span>
                    </button>
                  )}

                  {voiceState === 'recording' && (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <button onClick={pauseListening}
                        className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg transition-all scale-105 focus:outline-none focus:ring-4 focus:ring-amber-300 focus:ring-offset-2"
                        aria-label="一時停止">
                        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-30" />
                        <span className="text-2xl relative z-10">⏸</span>
                        <span className="text-xs relative z-10">一時停止</span>
                      </button>
                      <button onClick={stopListening}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-medium transition-all"
                        aria-label="録音を完全停止">
                        <span>⏹</span> 停止（完了）
                      </button>
                    </div>
                  )}

                  {voiceState === 'paused' && (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <button onClick={resumeListening}
                        className="w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-offset-2"
                        aria-label="録音を再開">
                        <span className="text-2xl">▶</span>
                        <span className="text-xs">再開</span>
                      </button>
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-amber-700 font-medium">一時停止中 — 続きから再開できます</span>
                      </div>
                      <button onClick={stopListening}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-medium transition-all">
                        <span>⏹</span> 停止（完了）
                      </button>
                    </div>
                  )}
                </div>

                {/* 録音中インジケーター */}
                {voiceState === 'recording' && (
                  <div className="flex items-center justify-center gap-2 text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium">録音中 — 話し終わったら停止を押してください</span>
                  </div>
                )}

                {voiceState === 'error' && voiceError && (
                  <p className="text-xs text-red-500 text-center bg-red-50 rounded-xl px-4 py-2">⚠️ {voiceError}</p>
                )}

                {/* テキストエリア */}
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && cleanText && voiceState === 'idle') {
                        e.preventDefault();
                        handleProcessText(cleanText);
                      }
                    }}
                    placeholder={'例：「副業でYouTubeを始めて収益化するまでの手順」\n「FP2級を3ヶ月で取る勉強スケジュールを組みたい」\n\n話したテキストが自動でここに入ります。手入力でもOK。\nEnterで送信 / Shift+Enterで改行'}
                    rows={5}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                  />
                  {text && (
                    <button onClick={() => { setText(''); setVoiceError(''); if (!isActive) setVoiceState('idle'); }}
                      className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
                      aria-label="テキストをクリア">✕</button>
                  )}
                </div>
                {cleanText.length > 0 && (
                  <p className="text-xs text-gray-400 text-right">{cleanText.length}文字</p>
                )}

                {/* 手入力用ボタン */}
                {cleanText && !proofreadText && voiceState === 'idle' && (
                  <button
                    onClick={() => handleProcessText(cleanText)}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all"
                  >
                    AIが編集・校正する →
                  </button>
                )}
              </section>
            )}

            {/* AI校正中スピナー */}
            {voiceState === 'proofreading' && (
              <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex items-center gap-4">
                <div className="flex-shrink-0 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-red-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">AIが編集・校正中...</p>
                  <p className="text-xs text-gray-400 mt-0.5">入力テキストを自然な文章に磨いています</p>
                </div>
              </section>
            )}

            {/* 校正結果カード */}
            {voiceState === 'idle' && proofreadText && (
              <section className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-700">AIによる校正結果</p>
                    <p className="text-[10px] text-emerald-500">採用するとこの内容でプロンプトが生成されます</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-sm text-gray-800 leading-relaxed">{proofreadText}</p>
                  </div>
                  {rawText !== proofreadText && (
                    <details className="group">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
                        <span className="group-open:hidden">▼</span>
                        <span className="hidden group-open:inline">▲</span>
                        元の音声テキストを確認
                      </summary>
                      <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3 leading-relaxed">{rawText}</p>
                    </details>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => confirmTopic(proofreadText)}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all">
                      ✓ この内容で確定
                    </button>
                    <button onClick={() => confirmTopic(rawText)}
                      className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm transition-all">
                      元のまま
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 校正エラー */}
            {proofreadError && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="flex-shrink-0 text-amber-500">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700">校正をスキップしました</p>
                  <p className="text-xs text-amber-600 mt-0.5">{proofreadError}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => confirmTopic(rawText)}
                    className="text-xs px-3 py-1 rounded-lg bg-amber-600 text-white">このまま続ける</button>
                  <button onClick={() => setProofreadError('')} className="text-amber-400 hover:text-amber-600 text-xs">✕</button>
                </div>
              </div>
            )}

            {/* ── 確定後：2分岐ボタン ── */}
            {confirmedTopic && !proofreadText && (
              <section className="space-y-4">
                {/* 確定テーマ表示 */}
                <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">📌</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide mb-1">確定テーマ</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{confirmedTopic}</p>
                  </div>
                  <button onClick={() => { setConfirmedTopic(''); setText(confirmedTopic); }}
                    className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
                    変更
                  </button>
                </div>

                {/* ── メイン2分岐ボタン ── */}
                <div>
                  <p className="text-xs text-center text-gray-500 font-medium mb-3">次のアクションを選んでください</p>
                  <div className="grid grid-cols-2 gap-3">

                    {/* ① AIにさらに質問する */}
                    <button
                      onClick={startCatchball}
                      className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-md"
                    >
                      <span className="text-2xl block mb-2">💬</span>
                      <p className="font-bold text-sm leading-tight">AIにさらに<br/>質問する</p>
                      <p className="text-[10px] text-indigo-200 mt-1 leading-tight">スパルタAIが深掘り&amp;最強プロンプト生成</p>
                    </button>

                    {/* ② スパルタにスケジュール登録 */}
                    <button
                      onClick={() => startSchedule()}
                      className="p-4 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 text-white text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-md"
                    >
                      <span className="text-2xl block mb-2">🔥</span>
                      <p className="font-bold text-sm leading-tight">スパルタに<br/>スケジュール登録</p>
                      <p className="text-[10px] text-red-100 mt-1 leading-tight">AIが自動解析→カレンダー一括登録</p>
                    </button>
                  </div>
                </div>

                {/* テンプレート直接生成（折りたたみ） */}
                <details className="group">
                  <summary className="text-xs text-center text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center justify-center gap-1 py-1">
                    <span className="group-open:hidden">▼</span>
                    <span className="hidden group-open:inline">▲</span>
                    テンプレートで直接プロンプト生成（上級者向け）
                  </summary>
                  <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'standard' as PromptMode, icon: '📋', label: '標準', desc: '網羅・大ボリューム', color: 'bg-indigo-600 hover:bg-indigo-700' },
                        { mode: 'pro'      as PromptMode, icon: '⚡', label: 'プロ',  desc: '結論優先・実務',    color: 'bg-amber-500 hover:bg-amber-600' },
                        { mode: 'think'    as PromptMode, icon: '🧠', label: '思考',  desc: '論理・多角分析',   color: 'bg-purple-600 hover:bg-purple-700' },
                      ].map(item => (
                        <button key={item.mode} onClick={() => generateDirectly(item.mode)}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl text-white ${item.color} transition-all`}>
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs font-bold">{item.label}</span>
                          <span className="text-[9px] opacity-80 text-center leading-tight">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              </section>
            )}

            {/* ── ダッシュボードヘッダー（日付・曜日・カウントダウン） ── */}
            {!cleanText && !confirmedTopic && <DashboardHeader />}

            {/* ── 天気予報 ── */}
            {!cleanText && !confirmedTopic && <WeatherWidget />}

            {/* ── 日替わり音楽豆知識 ── */}
            {!cleanText && !confirmedTopic && <MusicFactWidget />}

            {/* ── スパルタ英会話クイズ ── */}
            {!cleanText && !confirmedTopic && <EnglishQuiz />}

            {/* ── 日替わり名言 ── */}
            {!cleanText && !confirmedTopic && <DailyQuoteSection />}

            {/* ── ヘルスデータウィジェット ── */}
            {!cleanText && !confirmedTopic && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => { setShowHealth(v => !v); if (!showHealth) fetchHealth(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">🏃</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">今日の活動データ</p>
                    <p className="text-[10px] text-gray-400">Google Health連携枠（現在モックデータ）</p>
                  </div>
                  <span className="text-gray-400 text-xs">{showHealth ? '▲' : '▼'}</span>
                </button>
                {showHealth && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    {isLoadingHealth && (
                      <div className="flex items-center gap-2 py-4 text-gray-400 text-xs">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <span>読み込み中...</span>
                      </div>
                    )}
                    {healthData && !isLoadingHealth && (
                      <div className="pt-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-blue-50 rounded-xl">
                            <p className="text-xl font-black text-blue-600">{healthData.today.steps.toLocaleString()}</p>
                            <p className="text-[10px] text-blue-400 mt-0.5">歩数</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-xl">
                            <p className="text-xl font-black text-green-600">{healthData.today.activeMinutes}</p>
                            <p className="text-[10px] text-green-400 mt-0.5">活動(分)</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-xl">
                            <p className="text-xl font-black text-orange-600">{healthData.today.calories}</p>
                            <p className="text-[10px] text-orange-400 mt-0.5">消費kcal</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <span className="text-sm flex-shrink-0">🔥</span>
                          <p className="text-xs text-red-700 font-medium leading-relaxed">{healthData.spartanComment}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center">{healthData.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 使い方ガイド */}
            {!cleanText && !confirmedTopic && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">SPARTA AIの使い方</h2>
                <ol className="space-y-3">
                  {[
                    { n: 1, title: '相談内容を話す or 打ち込む', desc: 'マイクで録音 or テキスト入力。AIが自然な文章に校正します。' },
                    { n: 2, title: '2つのルートから選ぶ', desc: '「AIにさらに質問する」で深掘り、または「スパルタにスケジュール登録」で即行動！' },
                    { n: 3, title: 'スパルタAIが叱咤激励', desc: '生ぬるい計画は許さない。具体的なスケジュールに落とし込んで一括登録！' },
                    { n: 4, title: 'サボったら承知しないぞ！', desc: 'カレンダーに刻み込んで、毎日逃げられない環境を作れ！' },
                  ].map(item => (
                    <li key={item.n} className="flex gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold mt-0.5">{item.n}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        {/* ════════════════════════════════════════
            SCHEDULING フェーズ
        ════════════════════════════════════════ */}
        {appPhase === 'scheduling' && (
          <section className="space-y-4">
            {/* トピックバー */}
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm flex-shrink-0">📌</span>
              <p className="text-xs text-red-700 font-medium flex-1 min-w-0 line-clamp-2">{confirmedTopic}</p>
              <span className="flex-shrink-0 text-[10px] text-red-400 bg-red-100 rounded-lg px-2 py-1 whitespace-nowrap">スパルタ解析</span>
            </div>

            {/* ローディング */}
            {isScheduling && (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 flex items-center gap-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700">スパルタAIが解析中...</p>
                  <p className="text-xs text-gray-400 mt-0.5">タスクを抽出してスケジュールに変換しています</p>
                </div>
              </div>
            )}

            {/* エラー */}
            {scheduleError && !isScheduling && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm text-red-700 font-semibold">⚠️ 解析に失敗しました</p>
                <p className="text-xs text-red-600">{scheduleError}</p>
                <div className="flex gap-2">
                  <button onClick={() => startSchedule()} className="text-xs px-4 py-2 rounded-xl bg-red-600 text-white font-semibold">再試行</button>
                  <button onClick={() => setAppPhase('input')} className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-500">戻る</button>
                </div>
              </div>
            )}

            {/* 登録完了後 */}
            {isScheduleConfirmed && !isScheduling && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="p-6 text-center space-y-4">
                  <div className="text-5xl">🔥</div>
                  <p className="text-lg font-black text-red-600">スケジュール登録完了！</p>
                  {spartanMessage && (
                    <div className="p-4 bg-gradient-to-br from-red-600 to-orange-500 rounded-2xl text-white">
                      <p className="text-sm font-bold leading-relaxed">{spartanMessage}</p>
                    </div>
                  )}
                  {scheduleSummary && (
                    <p className="text-xs text-gray-500">{scheduleSummary}</p>
                  )}
                  <button
                    onClick={resetAll}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all"
                  >
                    新しい相談を始める
                  </button>
                </div>
              </div>
            )}

            {/* 解析結果 */}
            {!isScheduling && !isScheduleConfirmed && scheduledItems.length > 0 && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-sm">📅</span>
                    <p className="text-xs font-bold text-red-700">解析されたスケジュール（{scheduledItems.length}件）</p>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {scheduledItems.map(item => (
                      <li key={item.id} className="px-5 py-4 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                            )}
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
                            {categoryLabel(item.category)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                            📆 {item.startDate}
                          </span>
                          {item.time && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                              🕐 {item.time}
                            </span>
                          )}
                          {item.duration && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                              ⏱ {item.duration}分
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                            🔁 {recurrenceLabel(item)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* スパルタメッセージ */}
                {spartanMessage && (
                  <div className="p-4 bg-gradient-to-br from-red-600 to-orange-500 rounded-2xl text-white flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">🔥</span>
                    <p className="text-sm font-bold leading-relaxed">{spartanMessage}</p>
                  </div>
                )}

                {/* 確定ボタン */}
                <div className="flex gap-3">
                  <button
                    onClick={confirmSchedule}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-95 text-white text-sm font-black transition-all shadow-lg"
                  >
                    🔥 このスケジュールで登録！
                  </button>
                  <button
                    onClick={() => setAppPhase(prevPhase)}
                    className="px-5 py-4 rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm transition-all"
                  >
                    戻る
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════
            CATCHBALL フェーズ
        ════════════════════════════════════════ */}
        {appPhase === 'catchball' && (
          <section className="space-y-4">
            {/* トピックバー */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm flex-shrink-0">📌</span>
              <p className="text-xs text-indigo-700 font-medium flex-1 min-w-0 line-clamp-2">{confirmedTopic}</p>
              <span className="flex-shrink-0 text-[10px] text-indigo-400 bg-indigo-100 rounded-lg px-2 py-1 whitespace-nowrap">
                AI {aiTurnCount}回目
              </span>
            </div>

            {/* チャットエリア */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-sm">💬</span>
                <p className="text-xs font-semibold text-indigo-700">スパルタAIとのキャッチボール</p>
                <p className="text-[10px] text-gray-400 ml-auto">意図を引き出したら「最強プロンプト生成」へ</p>
              </div>

              <div className="p-4 space-y-4 min-h-[200px] max-h-[50vh] overflow-y-auto">
                {isLoadingChat && chatMessages.length === 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm">🔥</div>
                    <div className="flex gap-1 items-center bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {/* メッセージ本体 */}
                    <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'ai' ? (
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm">🔥</div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm">🙋</div>
                      )}
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'ai'
                          ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                          : 'bg-indigo-600 text-white rounded-tr-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                    {/* AI メッセージの下にスケジュール登録ボタン */}
                    {msg.role === 'ai' && !isLoadingChat && (
                      <div className="ml-10">
                        <button
                          onClick={() => startSchedule(msg.text)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 text-red-600 border border-red-200 transition-all"
                          title="このAIの回答内容をスケジュール解析して登録します"
                        >
                          🔥 この内容をスパルタ登録
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {isLoadingChat && chatMessages.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm">🔥</div>
                    <div className="flex gap-1 items-center bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {chatError && (
                <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  ⚠️ {chatError}
                </div>
              )}

              <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
                <button
                  onClick={toggleChatVoice}
                  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    chatVoiceActive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                  }`}
                  title="音声で入力"
                >
                  🎤
                </button>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="AIの質問に答えてください… (Enterで送信)"
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isLoadingChat}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white flex items-center justify-center transition-all"
                >
                  ➤
                </button>
              </div>
            </div>

            {/* 最強プロンプト生成パネル */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${hasUserReplied ? 'border-indigo-200' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <p className="text-sm font-bold text-gray-800">
                  {hasUserReplied ? '最強プロンプトを生成する' : '返答するとプロンプトを生成できます'}
                </p>
              </div>
              {finalError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">⚠️ {finalError}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'standard' as PromptMode, icon: '📋', label: '標準', desc: '網羅・丁寧', color: 'bg-indigo-600 hover:bg-indigo-700' },
                  { mode: 'pro'      as PromptMode, icon: '⚡', label: 'プロ',  desc: '結論優先', color: 'bg-amber-500 hover:bg-amber-600' },
                  { mode: 'think'    as PromptMode, icon: '🧠', label: '思考',  desc: '深く多角的', color: 'bg-purple-600 hover:bg-purple-700' },
                ].map(item => (
                  <button key={item.mode}
                    onClick={() => finalizeCatchball(item.mode)}
                    disabled={!hasUserReplied || isGeneratingFinal}
                    className={`relative flex flex-col items-center gap-1 py-3 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${item.color}`}
                  >
                    {isGeneratingFinal && promptMode === item.mode && (
                      <span className="absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center text-xs">生成中…</span>
                    )}
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[9px] opacity-80">{item.desc}</span>
                  </button>
                ))}
              </div>
              {!hasUserReplied && (
                <p className="text-[10px] text-gray-400 text-center mt-2">まずAIの質問に1回以上回答してください</p>
              )}
            </div>

            {/* 会話全体からスケジュール登録パネル */}
            {hasUserReplied && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">🔥</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">会話内容からスパルタ登録</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      AIとの相談でまとまった勉強プランや計画を、そのままスケジュールに一括登録します。
                      各AIメッセージの「🔥 この内容をスパルタ登録」ボタン、または下のボタンで会話全体を解析します。
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => startSchedule(buildChatScheduleText())}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-95 active:scale-[0.99] text-white text-sm font-black transition-all shadow-md flex items-center justify-center gap-2"
                >
                  🔥 会話全体をスパルタにスケジュール登録！
                </button>
                <p className="text-[10px] text-gray-400 text-center">
                  ※ テーマ＋AI提案＋あなたの条件をまとめてGeminiに解析させます
                </p>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════
            RESULT フェーズ
        ════════════════════════════════════════ */}
        {appPhase === 'result' && (
          <div className="space-y-4">
            {/* 完了バッジ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    promptMode === 'pro'   ? 'bg-amber-100 text-amber-700' :
                    promptMode === 'think' ? 'bg-purple-100 text-purple-700' :
                                             'bg-indigo-100 text-indigo-700'
                  }`}>{modeLabel}</span>
                  {isCatchballResult && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      🎯 スパルタAI最適化済み
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{confirmedTopic}</p>
              </div>
            </div>

            {/* STEP 1 */}
            <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                  <div>
                    <p className="text-xs font-bold text-indigo-700">STEP 1 — Geminiに貼り付ける</p>
                    <p className="text-[10px] text-indigo-400">
                      {isCatchballResult ? 'スパルタAIヒアリング反映済み' : 'ディープリサーチ・5大条件テンプレート'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyText(finalStep1, setCopiedFinal1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedFinal1 ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copiedFinal1 ? '✓ コピー済み' : 'コピー'}
                </button>
              </div>
              <pre className="px-5 py-4 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {finalStep1}
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
                  onClick={() => copyText(step2, setCopiedFinal2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedFinal2 ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copiedFinal2 ? '✓ コピー済み' : 'コピー'}
                </button>
              </div>
              <pre className="px-5 py-4 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {step2}
              </pre>
            </section>

            {/* 別モードで再生成 */}
            {!isCatchballResult && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium mb-3">別モードで再生成</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: 'standard' as PromptMode, icon: '📋', label: '標準', color: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                    { mode: 'pro'      as PromptMode, icon: '⚡', label: 'プロ',  color: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
                    { mode: 'think'    as PromptMode, icon: '🧠', label: '思考',  color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100' },
                  ].map(item => (
                    <button key={item.mode}
                      onClick={() => generateDirectly(item.mode)}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all ${item.color} ${promptMode === item.mode ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isCatchballResult && (
              <button
                onClick={() => { setAppPhase('catchball'); setFinalStep1(''); setFinalError(''); }}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                ← キャッチボールに戻って調整する
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
