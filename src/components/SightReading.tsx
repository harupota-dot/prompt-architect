'use client';

import { useState, useRef, useCallback } from 'react';

// ─── 定数（MusicLearning と完全一致）──────────────────────────────
const LS         = 14;
const L1         = 106;
const TOP_LINE_Y = L1 - LS * 4;   // 50
const NR         = 6.5;
const NY         = 4.7;
const STAFF_XS   = 40;
const STAFF_XE   = 500;

type Clef    = 'treble' | 'bass';
type SRLevel = 1 | 2 | 3 | 4;
type WinAC   = typeof window & { webkitAudioContext?: typeof AudioContext };

function mf(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }
const FREQ: Record<string, number> = {
  C2:mf(36), D2:mf(38), E2:mf(40), F2:mf(41), G2:mf(43), A2:mf(45), B2:mf(47),
  C3:mf(48), D3:mf(50), E3:mf(52), F3:mf(53), G3:mf(55), A3:mf(57), B3:mf(59),
  C4:mf(60), D4:mf(62), E4:mf(64), F4:mf(65), G4:mf(67), A4:mf(69), B4:mf(71),
  C5:mf(72), D5:mf(74), E5:mf(76), F5:mf(77), G5:mf(79),
};

const TY: Record<string, number> = {
  E3:L1+LS*3.5, F3:L1+LS*3,   G3:L1+LS*2.5,
  A3:L1+LS*2,   B3:L1+LS*1.5, C4:L1+LS,
  D4:L1+LS/2,   E4:L1,        F4:L1-LS/2,
  G4:L1-LS,     A4:L1-LS*1.5, B4:L1-LS*2,
  C5:L1-LS*2.5, D5:L1-LS*3,   E5:L1-LS*3.5,
  F5:L1-LS*4,   G5:L1-LS*4.5,
};
const BY: Record<string, number> = {
  C2:L1+LS*2,   D2:L1+LS*1.5, E2:L1+LS,
  F2:L1+LS/2,   G2:L1,        A2:L1-LS/2,
  B2:L1-LS,     C3:L1-LS*1.5, D3:L1-LS*2,
  E3:L1-LS*2.5, F3:L1-LS*3,   G3:L1-LS*3.5,
  A3:L1-LS*4,   B3:L1-LS*4.5, C4:L1-LS*5,
};

function getLedgers(noteKey: string, clef: Clef): number[] {
  const y = (clef === 'treble' ? TY : BY)[noteKey];
  if (y === undefined) return [];
  const lines: number[] = [];
  if (y > L1) { for (let ly = L1+LS; ly <= y; ly += LS) lines.push(ly); }
  else if (y < TOP_LINE_Y) { for (let ly = TOP_LINE_Y-LS; ly >= y; ly -= LS) lines.push(ly); }
  return lines;
}

// ─── レベル設定 ───────────────────────────────────────────────────
const LEVEL_CFG: Record<SRLevel, { clef: Clef; count: 4|8; pool: string[]; label: string }> = {
  1: { clef:'treble', count:4, pool:['E4','F4','G4','A4','B4','C5','D5','E5'],      label:'Lv1 ト音 4音 加線なし' },
  2: { clef:'treble', count:8, pool:['D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','C4','B3','A3'], label:'Lv2 ト音 8音 加線あり' },
  3: { clef:'bass',   count:4, pool:['G2','A2','B2','C3','D3','E3','F3','G3','A3'], label:'Lv3 ヘ音 4音 加線なし' },
  4: { clef:'bass',   count:8, pool:['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4'], label:'Lv4 ヘ音 8音 加線あり' },
};

const NOTE_BTNS = ['C','D','E','F','G','A','B'] as const;
const NOTE_JP: Record<string, string> = { C:'ド', D:'レ', E:'ミ', F:'ファ', G:'ソ', A:'ラ', B:'シ' };

// ─── 音声 ────────────────────────────────────────────────────────
const acRef: { current: AudioContext | null } = { current: null };

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!acRef.current) {
    try {
      const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
      if (AC) acRef.current = new AC();
    } catch { /* ignore */ }
  }
  return acRef.current;
}

function tone(ctx: AudioContext, freq: number, t: number, dur = 1.5): void {
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.38, t + 0.006);
  master.gain.exponentialRampToValueAtTime(0.17, t + 0.18);
  master.gain.exponentialRampToValueAtTime(0.07, t + 0.80);
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  ([
    [1, 1.00, 'triangle'],
    [2, 0.50, 'triangle'],
    [3, 0.20, 'sine'],
    [4, 0.08, 'sine'],
  ] as [number, number, OscillatorType][]).forEach(([mult, vol, type]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = type; o.frequency.value = freq * mult;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.01, t + dur / mult);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

function playKey(noteKey: string): void {
  const f = FREQ[noteKey]; if (!f) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const go = () => tone(ctx, f, ctx.currentTime);
    if (ctx.state === 'suspended') { ctx.resume().then(go).catch(() => {}); } else { go(); }
  } catch { /* ignore */ }
}

// ─── フレーズ生成 ────────────────────────────────────────────────
function genPhrase(pool: string[], count: number): string[] {
  const phrase: string[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    const cands = pool.filter(n => n !== prev) ;
    const src   = cands.length > 0 ? cands : pool;
    const n     = src[Math.floor(Math.random() * src.length)];
    phrase.push(n);
    prev = n;
  }
  return phrase;
}

// ─── PhraseStaff SVG ─────────────────────────────────────────────
function PhraseStaff({ phrase, cursor, clef }: { phrase: string[]; cursor: number; clef: Clef }) {
  const yMap    = clef === 'treble' ? TY : BY;
  const staffYs = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY = L1 - LS * 2;   // B4 (treble) / D3 (bass)
  const VW      = 520;

  // X positions per note
  const n    = phrase.length;
  const gap  = n <= 4 ? 92 : 54;
  const x0   = n <= 4 ? 105 : 82;
  const noteXs = Array.from({ length: n }, (_, i) => x0 + i * gap);

  // Dynamic viewBox Y
  const ys  = phrase.map(k => yMap[k] ?? L1);
  const PAD = 22;
  const vTop    = Math.min(Math.min(...ys) - PAD, TOP_LINE_Y - PAD);
  const vBottom = Math.max(Math.max(...ys) + PAD, L1 + PAD);
  const vH      = vBottom - vTop;

  const clefFontSize = clef === 'treble' ? 72 : 46;
  const clefX        = clef === 'treble' ? 13 : 18;
  const clefY        = clef === 'treble' ? L1 + 12 : L1 - LS * 1.5 + 4;

  return (
    <svg
      viewBox={`0 ${vTop} ${VW} ${vH}`}
      className="w-full"
      style={{ userSelect: 'none' }}
      aria-hidden="true"
    >
      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={STAFF_XS} x2={STAFF_XE} y1={y} y2={y} stroke="#374151" strokeWidth="1.2" />
      ))}

      {/* 音部記号 */}
      <text
        x={clefX} y={clefY}
        fontSize={clefFontSize}
        fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>

      {/* カーソル背景 */}
      {cursor < n && (
        <rect
          x={noteXs[cursor] - 20}
          y={vTop}
          width={40}
          height={vH}
          fill="#fed7aa"
          opacity={0.45}
          rx={6}
        />
      )}

      {/* 各音符 */}
      {phrase.map((noteKey, i) => {
        const x       = noteXs[i];
        const y       = yMap[noteKey] ?? L1;
        const isDone  = i < cursor;
        const isCur   = i === cursor;
        const fill    = isDone ? '#16a34a' : isCur ? '#ea580c' : '#374151';
        const stemUp  = y >= middleY;
        const stemX   = stemUp ? x + NR - 0.5 : x - NR + 0.5;
        const stemEnd = stemUp ? y - LS * 3.5  : y + LS * 3.5;
        const ledgers = getLedgers(noteKey, clef);

        return (
          <g key={i}>
            {/* 加線 */}
            {ledgers.map(ly => (
              <line key={ly}
                x1={x - NR * 2.6} x2={x + NR * 2.6}
                y1={ly} y2={ly}
                stroke={fill} strokeWidth="1.4"
              />
            ))}
            {/* 符幹 */}
            <line x1={stemX} y1={y} x2={stemX} y2={stemEnd} stroke={fill} strokeWidth="1.5" />
            {/* 符頭 */}
            <ellipse
              cx={x} cy={y} rx={NR} ry={NY}
              fill={fill}
              transform={`rotate(-12,${x},${y})`}
            />
            {/* ✓ 完了マーク */}
            {isDone && (
              <text x={x} y={y - LS * 3 - 8} textAnchor="middle" fontSize={13} fill="#16a34a">✓</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────
export function SightReading() {
  const [level,     setLevel]     = useState<SRLevel>(1);
  const [phrase,    setPhrase]    = useState<string[]>([]);
  const [cursor,    setCursor]    = useState(0);
  const [shake,     setShake]     = useState(false);
  const [clearAnim, setClearAnim] = useState(false);
  const [started,   setStarted]   = useState(false);
  const [stats,     setStats]     = useState({ correct: 0, total: 0, phrases: 0 });

  const cfg = LEVEL_CFG[level];

  const startPhrase = useCallback((lv: SRLevel) => {
    const c = LEVEL_CFG[lv];
    setPhrase(genPhrase(c.pool, c.count));
    setCursor(0);
    setClearAnim(false);
    setShake(false);
    setStarted(true);
  }, []);

  const handleLevel = (lv: SRLevel) => {
    setLevel(lv);
    setStarted(false);
    setPhrase([]);
    setCursor(0);
    setStats({ correct: 0, total: 0, phrases: 0 });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleTap = (letter: string) => {
    if (!started || clearAnim || cursor >= phrase.length) return;

    const correctNote = phrase[cursor];
    const isCorrect   = correctNote[0] === letter;

    if (isCorrect) {
      playKey(correctNote);
      const nextCursor = cursor + 1;
      setStats(s => ({ ...s, correct: s.correct + 1, total: s.total + 1 }));
      setCursor(nextCursor);

      if (nextCursor >= phrase.length) {
        // フレーズクリア！
        setClearAnim(true);
        setStats(s => ({ ...s, phrases: s.phrases + 1 }));
        setTimeout(() => {
          startPhrase(level);
        }, 1200);
      }
    } else {
      // 不正解：押したボタンのノートを鳴らす
      const wrongKey = letter + (cfg.clef === 'treble' ? '4' : '3');
      playKey(wrongKey);
      setStats(s => ({ ...s, total: s.total + 1 }));
      triggerShake();
    }
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="pb-32">
      <style>{`
        @keyframes sr-shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-7px); }
          40%,80%  { transform: translateX(7px); }
        }
        .sr-shake { animation: sr-shake 0.42s ease; }
        @keyframes sr-clear {
          0%   { opacity:0; transform:scale(0.7); }
          40%  { opacity:1; transform:scale(1.08); }
          80%  { opacity:1; transform:scale(1.0); }
          100% { opacity:0; transform:scale(1.0); }
        }
        .sr-clear { animation: sr-clear 1.2s ease forwards; }
      `}</style>

      {/* ── レベル選択 ── */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {([1,2,3,4] as SRLevel[]).map(lv => (
          <button
            key={lv}
            onClick={() => handleLevel(lv)}
            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              level === lv
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-gray-800 text-gray-300 border-gray-700'
            }`}
          >
            <div>Lv{lv}</div>
            <div className="text-[10px] font-normal opacity-80">
              {lv <= 2 ? 'ト音' : 'ヘ音'} {LEVEL_CFG[lv].count}音
            </div>
          </button>
        ))}
      </div>

      {/* ── スコア ── */}
      {started && (
        <div className="flex gap-3 justify-center mb-3 text-sm text-gray-300">
          <span>フレーズ <strong className="text-yellow-400">{stats.phrases}</strong></span>
          <span>正解率 <strong className="text-green-400">{accuracy}%</strong></span>
          <span className="text-gray-500">{stats.correct}/{stats.total}</span>
        </div>
      )}

      {/* ── 五線譜 ── */}
      {started && phrase.length > 0 ? (
        <div className="relative mb-4">
          <div className={shake ? 'sr-shake' : ''}>
            <div className="bg-white rounded-2xl px-2 py-2 shadow-lg">
              <PhraseStaff phrase={phrase} cursor={cursor} clef={cfg.clef} />
            </div>
          </div>

          {/* Clear アニメーション */}
          {clearAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="sr-clear bg-green-500 text-white text-3xl font-black px-8 py-4 rounded-2xl shadow-2xl">
                🎉 Clear!
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 text-center mb-4">
          <div className="text-5xl mb-3">👁️</div>
          <div className="text-gray-300 text-sm mb-1">{cfg.label}</div>
          <div className="text-gray-500 text-xs">
            {cfg.clef === 'treble' ? 'ト音記号' : 'ヘ音記号'} — {cfg.count}音フレーズ
          </div>
        </div>
      )}

      {/* ── スタート / 次のフレーズ ── */}
      {!started ? (
        <button
          onClick={() => startPhrase(level)}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-lg rounded-2xl mb-4 transition-colors"
        >
          スタート 🎵
        </button>
      ) : !clearAnim && cursor < phrase.length ? (
        <button
          onClick={() => startPhrase(level)}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl mb-4 transition-colors"
        >
          フレーズを変える
        </button>
      ) : null}

      {/* ── 音名ボタン ── */}
      {started && (
        <div className="grid grid-cols-7 gap-1.5">
          {NOTE_BTNS.map(letter => (
            <button
              key={letter}
              onPointerDown={() => handleTap(letter)}
              disabled={clearAnim || cursor >= phrase.length}
              className={`py-3 rounded-xl font-bold text-sm transition-all select-none
                ${clearAnim || cursor >= phrase.length
                  ? 'bg-gray-800 text-gray-600 opacity-40'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-800 active:scale-95 text-white shadow-md'
                }`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
            >
              <div>{letter}</div>
              <div className="text-[9px] font-normal opacity-75">{NOTE_JP[letter]}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── ヒント ── */}
      {started && cursor < phrase.length && !clearAnim && (
        <p className="text-center text-gray-500 text-xs mt-3">
          カーソル（オレンジ）の音符の音名をタップ
        </p>
      )}
    </div>
  );
}
