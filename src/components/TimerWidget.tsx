'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/sound-engine';

// ── 定数 ─────────────────────────────────────────────────────────
const WORK_SEC = 30;  // 交互タイマー：実行フェーズ
const REST_SEC = 15;  // 交互タイマー：インターバルフェーズ
const MIN_SEC  = 60;  // 1分タイマー

type AltPhase = 'work' | 'rest';

// ── Web Worker 生成 ────────────────────────────────────────────────
function createWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  try { return new Worker('/timer-worker.js'); } catch { return null; }
}

// ── OS プッシュ通知 ───────────────────────────────────────────────
function notify(title: string, body: string) {
  try {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'sparta-timer' });
    }
  } catch { /* ignore */ }
}

// ── TTS（スパルタ音声） ──────────────────────────────────────────
function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt   = new SpeechSynthesisUtterance(text);
    utt.lang    = 'ja-JP';
    utt.rate    = 1.1;
    utt.pitch   = 0.85;
    utt.onerror = () => {/* ignore */};
    setTimeout(() => window.speechSynthesis.speak(utt), 80);
  } catch { /* ignore */ }
}

// ── バックグラウンド無音オーディオ（スリープ防止ハック） ─────────
// AudioContext + ほぼ無音のオシレータを維持することで
// iOS/Android の OS が「メディア再生中」と判断 → ブラウザプロセスの凍結を防ぐ
interface BGAudio { ctx: AudioContext; osc: OscillatorNode }

function startBGAudio(): BGAudio | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
    if (!AudioCtx) return null;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    // 0.001 = ほぼ無音だが完全0でないことでOSに「再生中」と認識させる
    gain.gain.value   = 0.001;
    osc.frequency.value = 1; // 1Hz — 人間には聞こえない超低周波
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    return { ctx, osc };
  } catch { return null; }
}

function stopBGAudio(bg: BGAudio | null) {
  if (!bg) return;
  try { bg.osc.stop();   } catch { /* ignore */ }
  try { bg.ctx.close();  } catch { /* ignore */ }
}

// ── プログレスリング（SVG） ──────────────────────────────────────
function ProgressRing({
  remaining, total, color,
}: {
  remaining: number; total: number; color: string;
}) {
  const r    = 50;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
      {/* トラック */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      {/* プログレス */}
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.95s linear' }}
      />
    </svg>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export function TimerWidget() {
  // ── 交互タイマー state ─────────────────────────────────────────
  const [altRunning, setAltRunning] = useState(false);
  const [altPhase,   setAltPhase]   = useState<AltPhase>('work');
  const [altRemain,  setAltRemain]  = useState(WORK_SEC);
  const [altLoop,    setAltLoop]    = useState(true);
  const [altSet,     setAltSet]     = useState(0);

  // ── 1分タイマー state ──────────────────────────────────────────
  const [minRunning, setMinRunning] = useState(false);
  const [minRemain,  setMinRemain]  = useState(MIN_SEC);
  const [minLoop,    setMinLoop]    = useState(true);
  const [minLaps,    setMinLaps]    = useState(0);

  // ── Refs（stale closure を避けるため最新値を保持） ─────────────
  const altWorker  = useRef<Worker | null>(null);
  const minWorker  = useRef<Worker | null>(null);
  const bgAudio    = useRef<BGAudio | null>(null);
  const altLoopRef = useRef(true);
  const minLoopRef = useRef(true);
  const altPhaseRef = useRef<AltPhase>('work');
  const altSetRef   = useRef(0);
  const minLapsRef  = useRef(0);
  const altRunRef   = useRef(false);
  const minRunRef   = useRef(false);

  useEffect(() => { altLoopRef.current = altLoop; }, [altLoop]);
  useEffect(() => { minLoopRef.current = minLoop; }, [minLoop]);

  // ── アンマウント時クリーンアップ ──────────────────────────────
  useEffect(() => {
    return () => {
      altWorker.current?.terminate();
      minWorker.current?.terminate();
      stopBGAudio(bgAudio.current);
    };
  }, []);

  // ── 両タイマー停止時に BG音を解放 ─────────────────────────────
  const maybeStopBGAudio = useCallback(() => {
    if (!altRunRef.current && !minRunRef.current) {
      stopBGAudio(bgAudio.current);
      bgAudio.current = null;
    }
  }, []);

  // ───────────────────────────────────────────────────────────────
  // 交互タイマー
  // ───────────────────────────────────────────────────────────────

  const startAlt = useCallback(() => {
    if (altRunRef.current) return;

    // ★ ユーザーのクリックイベント内で AudioContext を生成（iOS 要件）
    if (!bgAudio.current) bgAudio.current = startBGAudio();

    const worker = createWorker();
    if (!worker) { alert('Web Worker が使用できません。ブラウザを更新してください。'); return; }

    altWorker.current     = worker;
    altPhaseRef.current   = 'work';
    altSetRef.current     = 0;
    altRunRef.current     = true;

    setAltPhase('work');
    setAltSet(0);
    setAltRemain(WORK_SEC);
    setAltRunning(true);

    worker.onmessage = ({ data }) => {
      if (data.type === 'TICK') {
        setAltRemain(data.remaining);
        return;
      }

      if (data.type === 'DONE') {
        // アラーム音
        playSound();

        const curPhase  = altPhaseRef.current;
        const nextPhase : AltPhase = curPhase === 'work' ? 'rest' : 'work';
        const nextSec   = nextPhase === 'work' ? WORK_SEC : REST_SEC;

        if (curPhase === 'work') {
          const s = altSetRef.current + 1;
          altSetRef.current = s;
          setAltSet(s);
          speak(`${s}セット完了！15秒インターバル開始！ゆっくり休め！`);
          notify('🔥 実行完了！', `${s}セット目終了！15秒インターバル開始！`);
        } else {
          speak('インターバル終了！次の30秒を全力で行け！今すぐスタート！');
          notify('💪 インターバル終了！', '次の30秒！ほら動け！');
        }

        if (altLoopRef.current) {
          altPhaseRef.current = nextPhase;
          setAltPhase(nextPhase);
          setAltRemain(nextSec);
          worker.postMessage({ type: 'START', seconds: nextSec });
        } else {
          worker.terminate();
          altWorker.current   = null;
          altRunRef.current   = false;
          altPhaseRef.current = 'work';
          altSetRef.current   = 0;
          setAltRunning(false);
          setAltPhase('work');
          setAltRemain(WORK_SEC);
          setAltSet(0);
          maybeStopBGAudio();
        }
      }
    };

    worker.postMessage({ type: 'START', seconds: WORK_SEC });
  }, [maybeStopBGAudio]);

  const stopAlt = useCallback(() => {
    altWorker.current?.terminate();
    altWorker.current   = null;
    altRunRef.current   = false;
    altPhaseRef.current = 'work';
    altSetRef.current   = 0;
    setAltRunning(false);
    setAltPhase('work');
    setAltRemain(WORK_SEC);
    setAltSet(0);
    maybeStopBGAudio();
  }, [maybeStopBGAudio]);

  // ───────────────────────────────────────────────────────────────
  // 1分タイマー
  // ───────────────────────────────────────────────────────────────

  const startMin = useCallback(() => {
    if (minRunRef.current) return;
    if (!bgAudio.current) bgAudio.current = startBGAudio();

    const worker = createWorker();
    if (!worker) return;

    minWorker.current  = worker;
    minLapsRef.current = 0;
    minRunRef.current  = true;

    setMinLaps(0);
    setMinRemain(MIN_SEC);
    setMinRunning(true);

    worker.onmessage = ({ data }) => {
      if (data.type === 'TICK') {
        setMinRemain(data.remaining);
        return;
      }

      if (data.type === 'DONE') {
        playSound();
        const l = minLapsRef.current + 1;
        minLapsRef.current = l;
        setMinLaps(l);
        speak(`${l}分経過！継続は力なりだ！まだまだいけ！`);
        notify('⏰ 1分完了！', `${l}回目終了！継続は力なり！`);

        if (minLoopRef.current) {
          setMinRemain(MIN_SEC);
          worker.postMessage({ type: 'START', seconds: MIN_SEC });
        } else {
          worker.terminate();
          minWorker.current  = null;
          minRunRef.current  = false;
          minLapsRef.current = 0;
          setMinRunning(false);
          setMinRemain(MIN_SEC);
          setMinLaps(0);
          maybeStopBGAudio();
        }
      }
    };

    worker.postMessage({ type: 'START', seconds: MIN_SEC });
  }, [maybeStopBGAudio]);

  const stopMin = useCallback(() => {
    minWorker.current?.terminate();
    minWorker.current  = null;
    minRunRef.current  = false;
    minLapsRef.current = 0;
    setMinRunning(false);
    setMinRemain(MIN_SEC);
    setMinLaps(0);
    maybeStopBGAudio();
  }, [maybeStopBGAudio]);

  // ── 秒数フォーマット（mm:ss） ─────────────────────────────────
  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const anyRunning = altRunning || minRunning;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* バックグラウンド動作バナー */}
      {anyRunning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl text-white text-[10px] font-bold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0" />
          バックグラウンド動作中 — 画面ロック・他アプリ切替でも停止しません
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">

        {/* ════════════════════════════════════════
            交互タイマー（30s 実行 ↔ 15s インターバル）
            ════════════════════════════════════════ */}
        <div className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
          altRunning
            ? altPhase === 'work'
              ? 'bg-red-50   border-red-300'
              : 'bg-blue-50  border-blue-300'
            : 'bg-gray-50 border-gray-200'
        }`}>
          {/* タイトル */}
          <div className="text-center">
            <p className="text-[11px] font-black text-gray-800">
              {altRunning
                ? altPhase === 'work' ? '🔥 実行中！' : '😮‍💨 インターバル'
                : '30s ↔ 15s 交互'}
            </p>
            {altSet > 0 && (
              <span className="text-[9px] font-bold text-red-600">{altSet}セット完了</span>
            )}
          </div>

          {/* プログレスリング */}
          <div className="relative w-[130px] h-[130px]">
            <ProgressRing
              remaining={altRemain}
              total={altPhase === 'work' ? WORK_SEC : REST_SEC}
              color={altPhase === 'work' ? '#ef4444' : '#3b82f6'}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tabular-nums leading-none text-gray-900">
                {fmt(altRemain)}
              </span>
              <span className={`text-[9px] font-bold mt-0.5 ${
                altPhase === 'work' ? 'text-red-500' : 'text-blue-500'
              }`}>
                {altRunning
                  ? altPhase === 'work' ? `${WORK_SEC}s 実行` : `${REST_SEC}s 休憩`
                  : '待機中'}
              </span>
            </div>
          </div>

          {/* フェーズ表示バー */}
          <div className="w-full flex text-center text-[9px] font-black rounded-lg overflow-hidden">
            <div className={`flex-1 py-1 transition-all ${
              altRunning && altPhase === 'work' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>実行 30s</div>
            <div className={`flex-1 py-1 transition-all ${
              altRunning && altPhase === 'rest' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>休憩 15s</div>
          </div>

          {/* ループトグル */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">ループ</span>
            <button
              onClick={() => !altRunning && setAltLoop(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                altLoop ? 'bg-red-500' : 'bg-gray-300'
              } ${altRunning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                altLoop ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-[10px] text-gray-400">{altLoop ? '∞' : '1回'}</span>
          </div>

          {/* スタート / ストップ */}
          <button
            onClick={altRunning ? stopAlt : startAlt}
            className={`w-full py-3 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
              altRunning
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {altRunning ? '⏹ ストップ' : '▶ スタート'}
          </button>
        </div>

        {/* ════════════════════════════════════════
            1分ループタイマー
            ════════════════════════════════════════ */}
        <div className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
          minRunning ? 'bg-violet-50 border-violet-300' : 'bg-gray-50 border-gray-200'
        }`}>
          {/* タイトル */}
          <div className="text-center">
            <p className="text-[11px] font-black text-gray-800">
              {minRunning ? '⏰ カウント中！' : '1分ループ'}
            </p>
            {minLaps > 0 && (
              <span className="text-[9px] font-bold text-violet-600">{minLaps}回完了</span>
            )}
          </div>

          {/* プログレスリング */}
          <div className="relative w-[130px] h-[130px]">
            <ProgressRing remaining={minRemain} total={MIN_SEC} color="#7c3aed" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tabular-nums leading-none text-gray-900">
                {fmt(minRemain)}
              </span>
              <span className="text-[9px] font-bold mt-0.5 text-violet-500">
                {minRunning ? '60s カウント' : '待機中'}
              </span>
            </div>
          </div>

          {/* プログレスバー（補助） */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, (minRemain / MIN_SEC) * 100))}%`,
                transition: 'width 0.95s linear',
              }}
            />
          </div>

          {/* ループトグル */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">ループ</span>
            <button
              onClick={() => !minRunning && setMinLoop(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                minLoop ? 'bg-violet-500' : 'bg-gray-300'
              } ${minRunning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                minLoop ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-[10px] text-gray-400">{minLoop ? '∞' : '1回'}</span>
          </div>

          {/* スタート / ストップ */}
          <button
            onClick={minRunning ? stopMin : startMin}
            className={`w-full py-3 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
              minRunning
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {minRunning ? '⏹ ストップ' : '▶ スタート'}
          </button>
        </div>

      </div>

      {/* 説明 */}
      <div className="text-[9px] text-gray-400 text-center leading-relaxed">
        ⚡ Web Worker で動作 — タブ非アクティブ時も正確に計測<br />
        🔇 無音オーディオで iOS/Android のスリープを完全ブロック<br />
        🔔 時間終了時に通知音＋OS通知＋音声でお知らせ
      </div>
    </div>
  );
}
