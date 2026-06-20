'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const LOOKAHEAD_S  = 0.12;   // seconds to look ahead
const SCHED_MS     = 25;     // scheduler interval ms
const PERFECT_S    = 0.055;  // ±55ms
const GOOD_S       = 0.140;  // ±140ms
const TAP_WINDOW_S = 0.240;  // max deviation to find a tap

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type RhythmLevel = 1 | 2 | 3;
type VerdictType = 'Perfect!' | 'Good' | 'Miss';

interface Pattern {
  id:    string;
  name:  string;
  slots: boolean[];  // length 16; true = user should tap
}

interface PendingTap {
  time:     number;
  consumed: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Pattern helpers
// ─────────────────────────────────────────────────────────────────
// 16 slots per measure (16th-note resolution, 4/4 time)
// Slot indices: beats = 0,4,8,12; 8th "ands" = 2,6,10,14; 16ths = all others
function mkPat(id: string, name: string, actives: number[]): Pattern {
  const slots: boolean[] = new Array(16).fill(false);
  actives.forEach(i => { if (i >= 0 && i < 16) slots[i] = true; });
  return { id, name, slots };
}

const PATTERNS: Record<RhythmLevel, Pattern[]> = {
  1: [
    mkPat('1a', '♩ ♩ ♩ ♩  (4分×4)',          [0, 4, 8, 12]),
    mkPat('1b', '♩ ♩ ♩ 𝄽  (4拍め休符)',        [0, 4, 8]),
    mkPat('1c', '𝄽 ♩ ♩ ♩  (1拍め休符)',        [4, 8, 12]),
    mkPat('1d', '♩ 𝄽 ♩ 𝄽  (1・3拍 強拍)',      [0, 8]),
  ],
  2: [
    mkPat('2a', '♫♫♫♫♫♫♫♫  (8分×8 全て)',       [0,2,4,6,8,10,12,14]),
    mkPat('2b', '♩ ♩ ♫♫ ♩  (3拍め8分化)',       [0, 4, 8,10, 12]),
    mkPat('2c', '♫♫ ♩ ♫♫ ♩',                   [0,2, 4, 8,10, 12]),
    mkPat('2d', '& & & &  (裏拍のみ)',            [2, 6, 10, 14]),
    mkPat('2e', '♩ ♫♫ ♫♫ ♩',                   [0, 4,6, 8,10, 12]),
  ],
  3: [
    mkPat('3a', 'シンコペーション 1',             [0, 2, 6, 8, 14]),
    mkPat('3b', 'ファンク グルーヴ',               [0, 3, 8, 10, 12, 15]),
    mkPat('3c', '付点リズム  ♩. ♫',              [0, 6, 8, 14]),
    mkPat('3d', '複合リズム  (16分混合)',           [0, 2, 5, 8, 10, 13]),
    mkPat('3e', 'ハーフタイム シャッフル',          [0, 6, 8, 9, 12, 14]),
  ],
};

// ─────────────────────────────────────────────────────────────────
// Audio helpers
// ─────────────────────────────────────────────────────────────────
type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };

function createAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    return AC ? new AC() : null;
  } catch { return null; }
}

/** Wood-block click (accent = beat 1) */
function schedClick(ctx: AudioContext, t: number, accent: boolean): void {
  try {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.value = accent ? 1200 : 900;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(accent ? 0.62 : 0.36, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.048);
    osc.start(t); osc.stop(t + 0.055);
  } catch { /* ignore */ }
}

/** Soft 8th-note subdivision tick */
function schedTick(ctx: AudioContext, t: number): void {
  try {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 1800;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.10, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.013);
    osc.start(t); osc.stop(t + 0.018);
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// RhythmTraining component
// ─────────────────────────────────────────────────────────────────
export function RhythmTraining() {
  const [level,       setLevel]       = useState<RhythmLevel>(1);
  const [patIdx,      setPatIdx]      = useState(0);
  const [bpm,         setBpm]         = useState(72);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentSlot, setCurrentSlot] = useState(-1);
  const [verdict,     setVerdict]     = useState<VerdictType | null>(null);
  const [score,       setScore]       = useState({ perfect: 0, good: 0, miss: 0 });
  const [tapFlash,    setTapFlash]    = useState(false);

  // Refs — never trigger re-renders; scheduler reads these directly
  const acRef           = useRef<AudioContext | null>(null);
  const schedulerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSlotRef     = useRef(0);
  const nextTimeRef     = useRef(0);
  const pendingRef      = useRef<PendingTap[]>([]);
  const bpmRef          = useRef(bpm);
  const levelRef        = useRef<RhythmLevel>(1);
  const patternRef      = useRef<Pattern>(PATTERNS[1][0]);
  const verdictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef          = useRef(0);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => {
    const clamped = Math.min(patIdx, PATTERNS[level].length - 1);
    patternRef.current = PATTERNS[level][clamped];
  }, [level, patIdx]);

  const showVerdict = useCallback((v: VerdictType) => {
    setVerdict(v);
    if (verdictTimerRef.current) clearTimeout(verdictTimerRef.current);
    verdictTimerRef.current = setTimeout(() => setVerdict(null), 700);
  }, []);

  // The scheduler: called every SCHED_MS; schedules audio + queues tap expectations
  const runScheduler = useCallback(() => {
    const ctx = acRef.current;
    if (!ctx) return;
    const beatDur = 60 / bpmRef.current;
    const slotDur = beatDur / 4;   // 16th-note duration
    const gen     = genRef.current;

    while (nextTimeRef.current < ctx.currentTime + LOOKAHEAD_S) {
      const slot = nextSlotRef.current;
      const t    = nextTimeRef.current;

      // Metronome click on beat positions (0,4,8,12)
      if (slot % 4 === 0) {
        schedClick(ctx, t, slot === 0);
      } else if (levelRef.current >= 2 && slot % 2 === 0) {
        // Soft 8th-note tick for Level 2+
        schedTick(ctx, t);
      }

      // Register expected tap
      if (patternRef.current.slots[slot]) {
        pendingRef.current.push({ time: t, consumed: false });
      }

      // Visual slot update (fire at the right audio time)
      const delayMs = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (genRef.current === gen) setCurrentSlot(slot);
      }, delayMs);

      nextTimeRef.current += slotDur;
      nextSlotRef.current = (slot + 1) % 16;
    }

    // Expire missed taps
    const now = ctx.currentTime;
    const kept: PendingTap[] = [];
    for (const pt of pendingRef.current) {
      if (pt.consumed) continue;
      if (pt.time < now - TAP_WINDOW_S) {
        setScore(s => ({ ...s, miss: s.miss + 1 }));
      } else {
        kept.push(pt);
      }
    }
    pendingRef.current = kept;
  }, []); // stable — uses refs only

  const start = useCallback(() => {
    const ctx = acRef.current ?? (acRef.current = createAC());
    if (!ctx) return;
    genRef.current++;
    nextSlotRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.1;
    pendingRef.current  = [];
    setScore({ perfect: 0, good: 0, miss: 0 });
    setCurrentSlot(-1);
    setVerdict(null);
    setIsPlaying(true);

    const go = () => { schedulerRef.current = setInterval(runScheduler, SCHED_MS); };
    if (ctx.state === 'suspended') { ctx.resume().then(go).catch(go); }
    else { go(); }
  }, [runScheduler]);

  const stop = useCallback(() => {
    if (schedulerRef.current) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    genRef.current++;
    setIsPlaying(false);
    setCurrentSlot(-1);
    pendingRef.current = [];
  }, []);

  // Clean up on unmount
  useEffect(() => () => { stop(); }, [stop]);

  const handleTap = useCallback(() => {
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 80);

    const ctx = acRef.current;
    if (!ctx || !isPlaying) return;

    const now = ctx.currentTime;
    let bestIdx = -1, bestErr = Infinity;
    pendingRef.current.forEach((pt, i) => {
      if (pt.consumed) return;
      const err = Math.abs(now - pt.time);
      if (err < bestErr && err < TAP_WINDOW_S) { bestErr = err; bestIdx = i; }
    });

    if (bestIdx < 0) {
      showVerdict('Miss');
      setScore(s => ({ ...s, miss: s.miss + 1 }));
      return;
    }

    pendingRef.current[bestIdx].consumed = true;

    if (bestErr <= PERFECT_S)      { showVerdict('Perfect!'); setScore(s => ({ ...s, perfect: s.perfect + 1 })); }
    else if (bestErr <= GOOD_S)    { showVerdict('Good');     setScore(s => ({ ...s, good:    s.good    + 1 })); }
    else                           { showVerdict('Miss');     setScore(s => ({ ...s, miss:    s.miss    + 1 })); }
  }, [isPlaying, showVerdict]);

  const pattern   = PATTERNS[level][Math.min(patIdx, PATTERNS[level].length - 1)];
  const totalTaps = score.perfect + score.good + score.miss;
  const accuracy  = totalTaps > 0 ? Math.round(((score.perfect + score.good) / totalTaps) * 100) : 0;

  // Symbol for a slot that has a tap
  function slotSym(i: number): string {
    if (!pattern.slots[i]) return '';
    if (i % 4 === 0) return '♩';
    if (i % 2 === 0) return '♫';
    return '♬';
  }

  const verdictColor =
    verdict === 'Perfect!' ? 'text-emerald-500' :
    verdict === 'Good'     ? 'text-blue-500'    : 'text-red-500';

  const verdictLabel =
    verdict === 'Perfect!' ? '🎯 Perfect!' :
    verdict === 'Good'     ? '👍 Good'     : '✗ Miss';

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-3">

      {/* ── Level + Pattern selector ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex flex-col gap-3">

        {/* Level tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([1, 2, 3] as RhythmLevel[]).map(lv => (
            <button key={lv}
              onClick={() => { if (isPlaying) stop(); setLevel(lv); setPatIdx(0); }}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${
                level === lv
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {lv === 1 ? '🟢 Lv1' : lv === 2 ? '🟡 Lv2' : '🔴 Lv3'}
              <span className="block text-[9px] font-semibold opacity-80 mt-0.5">
                {lv === 1 ? '4分音符' : lv === 2 ? '8分・裏拍' : 'シンコペ'}
              </span>
            </button>
          ))}
        </div>

        {/* Pattern buttons */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pattern</p>
          <div className="flex flex-wrap gap-1">
            {PATTERNS[level].map((p, i) => (
              <button key={p.id}
                onClick={() => { if (isPlaying) stop(); setPatIdx(i); }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                  patIdx === i
                    ? 'bg-orange-50 border-orange-400 text-orange-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pattern grid (16 slots = 4 beats × 4 subdivisions) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Rhythm Pattern — 1 Measure (4/4)
        </p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(beat => (
            <div key={beat} className="flex-1">
              <p className="text-[10px] text-center font-black text-gray-500 mb-1">{beat + 1}</p>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3].map(sub => {
                  const si        = beat * 4 + sub;
                  const isCurrent = si === currentSlot && isPlaying;
                  const hasTap    = pattern.slots[si];
                  const isQuarter = si % 4 === 0;
                  const isEighth  = si % 4 === 2;
                  return (
                    <div key={sub}
                      className={`flex-1 h-11 rounded flex items-center justify-center text-sm font-black transition-all duration-75 ${
                        isCurrent
                          ? hasTap
                            ? 'bg-orange-400 text-white scale-110 shadow-lg'
                            : 'bg-gray-400 text-white scale-105'
                          : hasTap
                          ? isQuarter
                            ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                            : isEighth
                            ? 'bg-purple-100 border-2 border-purple-400 text-purple-700'
                            : 'bg-rose-100 border-2 border-rose-400 text-rose-700'
                          : 'bg-gray-100 border border-gray-200 text-gray-300'
                      }`}>
                      {slotSym(si) || (isQuarter && !hasTap ? '·' : '')}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded bg-indigo-300 inline-block" /> ♩ 4分
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded bg-purple-300 inline-block" /> ♫ 8分
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded bg-rose-300 inline-block" /> ♬ 16分
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded bg-orange-400 inline-block" /> 現在位置
          </span>
        </div>
      </div>

      {/* ── BPM control ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <p className="text-xs font-black text-gray-500 shrink-0">BPM</p>
        <input type="range" min={40} max={120} step={2} value={bpm}
          onChange={e => { setBpm(Number(e.target.value)); if (isPlaying) stop(); }}
          className="flex-1 accent-orange-500 h-2"
        />
        <p className="text-2xl font-black text-gray-900 w-12 text-right shrink-0">{bpm}</p>
        <div className="flex gap-1 shrink-0">
          {[60, 80, 100].map(b => (
            <button key={b} onClick={() => { setBpm(b); if (isPlaying) stop(); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                bpm === b ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* ── START / STOP ── */}
      <button
        onClick={isPlaying ? stop : start}
        className={`w-full py-3.5 rounded-2xl font-black text-base shadow-md active:scale-95 transition-all ${
          isPlaying
            ? 'bg-gray-700 hover:bg-gray-800 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}>
        {isPlaying ? '■ Stop' : '▶ Start Metronome'}
      </button>

      {/* ── Verdict display ── */}
      <div className="h-10 flex items-center justify-center">
        {verdict && (
          <p className={`text-2xl font-black animate-bounce ${verdictColor}`}>
            {verdictLabel}
          </p>
        )}
      </div>

      {/* ── TAP button ── */}
      <button
        onPointerDown={handleTap}
        disabled={!isPlaying}
        className={`w-full py-12 rounded-3xl font-black text-5xl tracking-widest shadow-xl transition-all select-none ${
          !isPlaying
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : tapFlash
            ? 'bg-orange-300 text-white scale-[0.97] shadow-inner'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none', userSelect: 'none' }}>
        TAP
      </button>

      {/* ── Score ── */}
      {totalTaps > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-500">Session Score</p>
            <p className="text-lg font-black text-orange-500">{accuracy}%</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Perfect', val: score.perfect, color: 'text-emerald-500' },
              { label: 'Good',    val: score.good,    color: 'text-blue-500'    },
              { label: 'Miss',    val: score.miss,    color: 'text-red-400'     },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl py-2">
                <p className={`text-2xl font-black ${color}`}>{val}</p>
                <p className="text-[9px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setScore({ perfect: 0, good: 0, miss: 0 })}
            className="mt-2 w-full text-[10px] text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg py-1 transition-colors">
            Reset Score
          </button>
        </div>
      )}

      {/* Tips */}
      {!isPlaying && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
          <p className="text-[11px] font-black text-orange-700 mb-1">🎵 使い方</p>
          <ul className="text-[10px] text-orange-600 space-y-0.5">
            <li>• レベルとパターンを選んで「Start Metronome」を押す</li>
            <li>• メトロノームのクリック音に合わせてグリッドが光る</li>
            <li>• オレンジのコマが光ったタイミングで「TAP」を押す</li>
            <li>• Perfect: ±55ms / Good: ±140ms / Miss: それ以外</li>
          </ul>
        </div>
      )}

    </div>
  );
}
