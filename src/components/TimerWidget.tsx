'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/sound-engine';

// ══════════════════════════════════════════════════════════════════
// 定数
// ══════════════════════════════════════════════════════════════════
const TIME_BLOCKS = [10, 15, 20, 30, 60, 180] as const;
type  TimeBlock   = typeof TIME_BLOCKS[number];
type  TimerMode   = 'single' | 'sequence';

const TIME_LABEL: Record<TimeBlock, string> = {
  10: '10s', 15: '15s', 20: '20s', 30: '30s', 60: '1分', 180: '3分',
};
const STORAGE_KEY = 'sparta-timer-v1';

interface SeqItem { id: string; seconds: TimeBlock }
interface SavedCfg {
  mode: TimerMode; singleTime: TimeBlock; singleLoop: boolean;
  sequence: SeqItem[]; seqLoop: boolean;
}

// ══════════════════════════════════════════════════════════════════
// localStorage
// ══════════════════════════════════════════════════════════════════
function loadCfg(): Partial<SavedCfg> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}
function saveCfg(c: SavedCfg) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════════
// Web Worker（/public/timer-worker.js を使用）
// ══════════════════════════════════════════════════════════════════
function createWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  try { return new Worker('/timer-worker.js'); } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════
// OS通知 / TTS / BGオーディオ（バックグラウンドスリープ防止ハック）
// ══════════════════════════════════════════════════════════════════
function notify(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted')
      new Notification(title, { body, icon: '/favicon.ico', tag: 'sparta-timer' });
  } catch { /* ignore */ }
}

function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP'; utt.rate = 1.1; utt.pitch = 0.85;
    utt.onerror = () => { /* ignore */ };
    setTimeout(() => window.speechSynthesis.speak(utt), 80);
  } catch { /* ignore */ }
}

interface BGAudio { ctx: AudioContext; osc: OscillatorNode }

function startBGAudio(): BGAudio | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    // 0.001 = ほぼ無音だが OS に「メディア再生中」と判断させる
    gain.gain.value = 0.001; osc.frequency.value = 1;
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    return { ctx, osc };
  } catch { return null; }
}

function stopBGAudio(bg: BGAudio | null) {
  if (!bg) return;
  try { bg.osc.stop(); } catch { /* ignore */ }
  try { bg.ctx.close(); } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════════
// プログレスリング（SVG）
// ══════════════════════════════════════════════════════════════════
function ProgressRing({ remaining, total, color, size }: {
  remaining: number; total: number; color: string; size: number;
}) {
  const r    = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  return (
    <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.95s linear' }}
      />
    </svg>
  );
}

// ── uid ─────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

// ══════════════════════════════════════════════════════════════════
// メインコンポーネント
// ══════════════════════════════════════════════════════════════════
export function TimerWidget({ compact = false }: { compact?: boolean }) {
  // ── 設定 ───────────────────────────────────────────────────────
  const [mode,       setMode]       = useState<TimerMode>('single');
  const [singleTime, setSingleTime] = useState<TimeBlock>(30);
  const [singleLoop, setSingleLoop] = useState(false);
  const [sequence,   setSequence]   = useState<SeqItem[]>([]);
  const [seqLoop,    setSeqLoop]    = useState(false);
  const [cfgLoaded,  setCfgLoaded]  = useState(false);

  // ── 実行 ───────────────────────────────────────────────────────
  const [running,   setRunning]   = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [blockIdx,  setBlockIdx]  = useState(0);
  const [curSec,    setCurSec]    = useState<TimeBlock>(30);

  // ── Refs（stale closure 防止） ──────────────────────────────────
  const workerRef     = useRef<Worker | null>(null);
  const bgRef         = useRef<BGAudio | null>(null);
  const runRef        = useRef(false);
  const modeRef       = useRef<TimerMode>('single');
  const singleLoopRef = useRef(false);
  const seqLoopRef    = useRef(false);
  const seqRef        = useRef<SeqItem[]>([]);
  const blockIdxRef   = useRef(0);
  const singleTimeRef = useRef<TimeBlock>(30);

  useEffect(() => { modeRef.current       = mode;       }, [mode]);
  useEffect(() => { singleLoopRef.current = singleLoop; }, [singleLoop]);
  useEffect(() => { seqLoopRef.current    = seqLoop;    }, [seqLoop]);
  useEffect(() => { seqRef.current        = sequence;   }, [sequence]);
  useEffect(() => { singleTimeRef.current = singleTime; }, [singleTime]);

  // ── localStorage 読み込み ────────────────────────────────────────
  useEffect(() => {
    const c = loadCfg();
    if (c.mode)       setMode(c.mode);
    if (c.singleTime) setSingleTime(c.singleTime);
    if (typeof c.singleLoop === 'boolean') setSingleLoop(c.singleLoop);
    if (Array.isArray(c.sequence))         setSequence(c.sequence);
    if (typeof c.seqLoop === 'boolean')    setSeqLoop(c.seqLoop);
    setCfgLoaded(true);
  }, []);

  // ── localStorage 保存 ────────────────────────────────────────────
  useEffect(() => {
    if (!cfgLoaded) return;
    saveCfg({ mode, singleTime, singleLoop, sequence, seqLoop });
  }, [cfgLoaded, mode, singleTime, singleLoop, sequence, seqLoop]);

  // ── アンマウント ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      stopBGAudio(bgRef.current);
    };
  }, []);

  // ── Worker からのメッセージ処理 ──────────────────────────────────
  const onWorkerMsg = useCallback((data: { type: string; remaining: number }) => {
    if (data.type === 'TICK') { setRemaining(data.remaining); return; }
    if (data.type !== 'DONE') return;

    playSound();

    if (modeRef.current === 'single') {
      // ── 単独モード ──
      const label = TIME_LABEL[singleTimeRef.current];
      speak(`${label}終了！サボるな！`);
      notify('⏰ タイマー完了！', `${label}経過しました！`);

      if (singleLoopRef.current) {
        const sec = singleTimeRef.current;
        setRemaining(sec); setCurSec(sec);
        workerRef.current?.postMessage({ type: 'START', seconds: sec });
      } else {
        workerRef.current?.terminate(); workerRef.current = null;
        runRef.current = false; setRunning(false); setRemaining(0);
        stopBGAudio(bgRef.current); bgRef.current = null;
      }
    } else {
      // ── シーケンスモード ──
      const seq  = seqRef.current;
      const next = blockIdxRef.current + 1;

      if (next < seq.length) {
        // 次のブロックへ
        const ns = seq[next].seconds;
        blockIdxRef.current = next;
        setBlockIdx(next); setCurSec(ns); setRemaining(ns);
        speak(`次！${TIME_LABEL[ns]}スタート！`);
        notify('🔄 次のブロック', `${TIME_LABEL[ns]}開始！`);
        workerRef.current?.postMessage({ type: 'START', seconds: ns });
      } else if (seqLoopRef.current) {
        // 全体をループ
        blockIdxRef.current = 0;
        const fs = seq[0].seconds;
        setBlockIdx(0); setCurSec(fs); setRemaining(fs);
        speak('シーケンス完了！最初から再スタート！');
        notify('🔁 ループ再開', '最初のブロックに戻ります！');
        workerRef.current?.postMessage({ type: 'START', seconds: fs });
      } else {
        // 終了
        speak('シーケンス全体完了！お疲れ様！');
        notify('✅ シーケンス完了！', '全ブロック終了しました！');
        workerRef.current?.terminate(); workerRef.current = null;
        runRef.current = false; setRunning(false); setRemaining(0);
        stopBGAudio(bgRef.current); bgRef.current = null;
      }
    }
  }, []);

  // ── スタート ────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (runRef.current) return;
    const m = modeRef.current;
    if (m === 'sequence' && seqRef.current.length === 0) return;

    // ★ BGオーディオはユーザーアクション（ボタンクリック）内で生成（iOS要件）
    if (!bgRef.current) bgRef.current = startBGAudio();

    const worker = createWorker();
    if (!worker) return;
    workerRef.current = worker;
    worker.onmessage = ({ data }) => onWorkerMsg(data);

    blockIdxRef.current = 0;
    setBlockIdx(0);

    if (m === 'single') {
      const sec = singleTimeRef.current;
      setCurSec(sec); setRemaining(sec);
      worker.postMessage({ type: 'START', seconds: sec });
    } else {
      const sec = seqRef.current[0].seconds;
      setCurSec(sec); setRemaining(sec);
      worker.postMessage({ type: 'START', seconds: sec });
    }

    runRef.current = true;
    setRunning(true);
  }, [onWorkerMsg]);

  // ── ストップ ────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    workerRef.current?.terminate(); workerRef.current = null;
    runRef.current = false;
    setRunning(false); setRemaining(0); setBlockIdx(0);
    stopBGAudio(bgRef.current); bgRef.current = null;
  }, []);

  // ── シーケンス操作 ───────────────────────────────────────────────
  const addBlock    = (s: TimeBlock) => !running && setSequence(p => [...p, { id: uid(), seconds: s }]);
  const removeBlock = (id: string)   => !running && setSequence(p => p.filter(b => b.id !== id));
  const moveUp      = (i: number)    => !running && i > 0 && setSequence(p => {
    const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n;
  });
  const moveDown = (i: number) => !running && setSequence(p => {
    if (i >= p.length - 1) return p;
    const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n;
  });

  // ── 表示用計算 ───────────────────────────────────────────────────
  const idleTime  = mode === 'single' ? singleTime : (sequence[0]?.seconds ?? 30);
  const dispRem   = running ? remaining : idleTime;
  const dispTotal = running ? curSec    : idleTime;
  const ringColor = running ? (mode === 'single' ? '#ef4444' : '#7c3aed') : '#9ca3af';
  const ringSize  = compact ? 88 : 108;
  const loopOn    = mode === 'single' ? singleLoop : seqLoop;
  const canStart  = !(mode === 'sequence' && sequence.length === 0);

  // ── レンダー ─────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* バックグラウンド動作バナー */}
      {running && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white text-[10px] font-bold">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0" />
          バックグラウンド動作中 — 画面ロック・他アプリでも停止しません
        </div>
      )}

      {/* ── モード切替 ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['single', 'sequence'] as const).map(m => (
          <button key={m}
            onClick={() => !running && setMode(m)}
            disabled={running}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {m === 'single' ? '⏱ 単独' : '📋 シーケンス'}
          </button>
        ))}
      </div>

      {/* ── 時間ブロックボタン群 ── */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
          {mode === 'single' ? '時間を選択：' : 'タップして追加：'}
        </p>
        <div className="grid grid-cols-6 gap-1">
          {TIME_BLOCKS.map(sec => (
            <button key={sec}
              onClick={() => mode === 'single' ? (!running && setSingleTime(sec)) : addBlock(sec)}
              disabled={mode === 'single' && running}
              className={`py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${
                mode === 'single' && singleTime === sec
                  ? 'bg-red-600 text-white shadow-sm'
                  : mode === 'sequence'
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${mode === 'single' && running ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {TIME_LABEL[sec]}
            </button>
          ))}
        </div>
      </div>

      {/* ── シーケンスリスト ── */}
      {mode === 'sequence' && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          {sequence.length === 0 ? (
            <p className="text-[10px] text-gray-400 text-center py-4">
              上のボタンをタップしてブロックを追加してください
            </p>
          ) : (
            <div className="max-h-[136px] overflow-y-auto divide-y divide-gray-100">
              {sequence.map((block, idx) => (
                <div key={block.id}
                  className={`flex items-center gap-2 px-3 py-2 transition-all ${
                    running && idx === blockIdx ? 'bg-violet-50' : ''
                  }`}
                >
                  {/* 番号バッジ */}
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                    running && idx === blockIdx
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>{idx + 1}</span>

                  {/* 時間 */}
                  <span className="flex-1 text-xs font-bold text-gray-800">
                    {TIME_LABEL[block.seconds]}
                  </span>

                  {/* 操作ボタン */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => moveUp(idx)} disabled={running || idx === 0}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-[10px] hover:bg-gray-50 disabled:opacity-25 flex items-center justify-center">▲</button>
                    <button onClick={() => moveDown(idx)} disabled={running || idx === sequence.length - 1}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-[10px] hover:bg-gray-50 disabled:opacity-25 flex items-center justify-center">▼</button>
                    <button onClick={() => removeBlock(block.id)} disabled={running}
                      className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 text-red-400 text-[10px] hover:bg-red-100 disabled:opacity-25 flex items-center justify-center">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* シーケンスクリア */}
          {sequence.length > 0 && !running && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button onClick={() => setSequence([])}
                className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">
                リストをクリア
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── メイン表示（リング + コントロール） ── */}
      <div className="flex items-center gap-4">

        {/* プログレスリング */}
        <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
          <ProgressRing remaining={dispRem} total={dispTotal} color={ringColor} size={ringSize} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${compact ? 'text-xl' : 'text-2xl'} font-black tabular-nums leading-none text-gray-900`}>
              {fmt(dispRem)}
            </span>
            {mode === 'sequence' && sequence.length > 0 && (
              <span className="text-[9px] font-bold text-violet-500 mt-0.5">
                {running ? `${blockIdx + 1}/${sequence.length}` : `0/${sequence.length}`}
              </span>
            )}
          </div>
        </div>

        {/* コントロール右側 */}
        <div className="flex-1 flex flex-col gap-2.5">

          {/* ループトグル */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              {mode === 'single' ? 'ループ' : '全体ループ'}
            </span>
            <button
              onClick={() => {
                if (running) return;
                if (mode === 'single') setSingleLoop(v => !v);
                else setSeqLoop(v => !v);
              }}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                loopOn ? 'bg-red-500' : 'bg-gray-300'
              } ${running ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                loopOn ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-[10px] text-gray-400">{loopOn ? '∞' : '1回'}</span>
          </div>

          {/* START / STOP ボタン */}
          <button
            onClick={running ? handleStop : handleStart}
            disabled={!running && !canStart}
            className={`w-full py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
              running
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : canStart
                ? mode === 'single'
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {running ? '⏹ STOP' : '▶ START'}
          </button>

          {/* 補足 */}
          {!running && !compact && (
            <p className="text-[9px] text-gray-400 leading-relaxed">
              ⚡ Web Worker ／ 🔇 無音BGオーディオ ／ 🔔 OS通知
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
