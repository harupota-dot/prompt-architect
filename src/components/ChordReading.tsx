'use client';

import { useState, useCallback } from 'react';

// ─── 定数（MusicLearning と完全一致）──────────────────────────────
const LS         = 14;
const L1         = 106;
const TOP_LINE_Y = L1 - LS * 4;  // 50
const NR         = 6.5;
const NY         = 4.7;

type WinAC  = typeof window & { webkitAudioContext?: typeof AudioContext };
type CRLevel = 1 | 2 | 3;
type Verdict = 'correct' | 'wrong' | null;

// ─── 音名→Y座標（ト音記号）────────────────────────────────────────
const TY: Record<string, number> = {
  C4:L1+LS,     D4:L1+LS/2,   E4:L1,        F4:L1-LS/2,
  G4:L1-LS,     A4:L1-LS*1.5, B4:L1-LS*2,   C5:L1-LS*2.5,
  D5:L1-LS*3,   E5:L1-LS*3.5, F5:L1-LS*4,   G5:L1-LS*4.5,
};

// ─── コード定義 ───────────────────────────────────────────────────
const CHORD_NOTES: Record<string, string[]> = {
  C:    ['C4','E4','G4'],
  Dm:   ['D4','F4','A4'],
  Em:   ['E4','G4','B4'],
  F:    ['F4','A4','C5'],
  G:    ['G4','B4','D5'],
  Am:   ['A4','C5','E5'],
  Bdim: ['B4','D5','F5'],
};
const CHORD_JP: Record<string, string> = {
  C:'ドミソ', Dm:'レファラ', Em:'ミソシ', F:'ファラド', G:'ソシレ', Am:'ラドミ', Bdim:'シレファ',
};

const LEVEL_POOL: Record<CRLevel, string[]> = {
  1: ['C','F','G'],
  2: ['C','Dm','Em','F','G','Am','Bdim'],
  3: ['C','Dm','Em','F','G','Am','Bdim'],
};

// ─── 周波数テーブル ───────────────────────────────────────────────
function mf(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }
const FREQ: Record<string, number> = {
  C4:mf(60), D4:mf(62), E4:mf(64), F4:mf(65), G4:mf(67), A4:mf(69), B4:mf(71),
  C5:mf(72), D5:mf(74), E5:mf(76), F5:mf(77), G5:mf(79),
};

// ─── 音声エンジン ────────────────────────────────────────────────
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

function tone(ctx: AudioContext, freq: number, t: number, dur = 1.8, vol = 0.28): void {
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(vol,       t + 0.006);
  master.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.18);
  master.gain.exponentialRampToValueAtTime(vol * 0.18, t + 0.90);
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  ([
    [1, 1.00, 'triangle'], [2, 0.50, 'triangle'],
    [3, 0.20, 'sine'],     [4, 0.08, 'sine'],
  ] as [number, number, OscillatorType][]).forEach(([mult, relVol, type]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = type; o.frequency.value = freq * mult;
    g.gain.setValueAtTime(relVol, t);
    g.gain.exponentialRampToValueAtTime(relVol * 0.01, t + dur / mult);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

function playChord(chordName: string): void {
  const notes = CHORD_NOTES[chordName]; if (!notes) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const go = () => notes.forEach(n => { const f = FREQ[n]; if (f) tone(ctx, f, ctx.currentTime); });
    if (ctx.state === 'suspended') { ctx.resume().then(go).catch(() => {}); } else { go(); }
  } catch { /* ignore */ }
}

// ─── 加線計算 ─────────────────────────────────────────────────────
function getLedgers(noteKey: string): number[] {
  const y = TY[noteKey]; if (y === undefined) return [];
  const lines: number[] = [];
  if (y > L1) { for (let ly = L1+LS; ly <= y; ly += LS) lines.push(ly); }
  else if (y < TOP_LINE_Y) { for (let ly = TOP_LINE_Y-LS; ly >= y; ly -= LS) lines.push(ly); }
  return lines;
}

// 音符の X オフセット計算（隣接する 2 度の音程は符頭をずらす）
function xOffsets(notes: string[], stemUp: boolean): number[] {
  const ys  = notes.map(n => TY[n] ?? L1);
  const off = new Array(notes.length).fill(0);
  for (let i = 0; i < ys.length - 1; i++) {
    if (Math.abs(ys[i] - ys[i + 1]) === LS / 2) {
      // 符幹が上向き → 高音（低 Y）を右へ; 下向き → 低音（高 Y）を右へ
      stemUp ? (off[i + 1] = NR * 2) : (off[i] = NR * 2);
    }
  }
  return off;
}

// ─── 単一コード SVG ──────────────────────────────────────────────
function ChordStaff({
  chordName, verdict, cx = 175,
}: { chordName: string; verdict?: Verdict; cx?: number }) {
  const notes = CHORD_NOTES[chordName] ?? [];
  const ys    = notes.map(n => TY[n] ?? L1);
  const staffYs = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY = L1 - LS * 2;

  const topY    = ys.length ? Math.min(...ys) : TOP_LINE_Y;
  const bottomY = ys.length ? Math.max(...ys) : L1;
  const stemUp  = bottomY > middleY;
  const stemX   = stemUp ? cx + NR - 0.5 : cx - NR + 0.5;
  const stemEnd = stemUp ? topY - LS * 3.5 : bottomY + LS * 3.5;

  const ledgerSet = new Set<number>();
  notes.forEach(n => getLedgers(n).forEach(y => ledgerSet.add(y)));

  const off = xOffsets(notes, stemUp);

  const PAD     = 22;
  const vTop    = Math.min(topY - PAD, TOP_LINE_Y - PAD);
  const vBottom = Math.max(bottomY + PAD, L1 + PAD);
  const vH      = vBottom - vTop;

  const verdictColor = verdict === 'correct' ? '#16a34a' : verdict === 'wrong' ? '#dc2626' : null;

  return (
    <svg viewBox={`0 ${vTop} 280 ${vH}`} className="w-full" aria-hidden="true">
      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={40} x2={240} y1={y} y2={y} stroke="#374151" strokeWidth="1.2" />
      ))}
      {/* 音部記号 */}
      <text
        x={13} y={L1 + 12}
        fontSize={72} fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >𝄞</text>
      {/* 加線 */}
      {[...ledgerSet].map(y => (
        <line key={y}
          x1={cx - NR * 2.6} x2={cx + NR * 2.6}
          y1={y} y2={y} stroke="#1f2937" strokeWidth="1.4"
        />
      ))}
      {/* 符幹 */}
      {notes.length > 0 && (
        <line x1={stemX} y1={stemUp ? bottomY : topY} x2={stemX} y2={stemEnd}
          stroke="#1f2937" strokeWidth="1.5" />
      )}
      {/* 符頭 */}
      {notes.map((n, i) => {
        const y  = TY[n] ?? L1;
        const dx = off[i];
        return (
          <ellipse key={n}
            cx={cx + dx} cy={y} rx={NR} ry={NY}
            fill="#1f2937"
            transform={`rotate(-12,${cx + dx},${y})`}
          />
        );
      })}
      {/* ○ / ✕ */}
      {verdictColor && (
        <text
          x={cx} y={vTop + 18}
          textAnchor="middle" fontSize={26} fill={verdictColor} fontWeight="bold"
        >
          {verdict === 'correct' ? '○' : '✕'}
        </text>
      )}
    </svg>
  );
}

// ─── コード進行 SVG（Level 3）────────────────────────────────────
const PROG_XS = [110, 205, 300, 395];

function ProgressionStaff({ prog, cursor }: { prog: string[]; cursor: number }) {
  const allNotes = prog.flatMap(c => CHORD_NOTES[c] ?? []);
  const allYs    = allNotes.map(n => TY[n] ?? L1);
  const PAD      = 22;
  const vTop     = Math.min(Math.min(...allYs) - PAD, TOP_LINE_Y - PAD);
  const vBottom  = Math.max(Math.max(...allYs) + PAD, L1 + PAD);
  const vH       = vBottom - vTop;
  const staffYs  = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY  = L1 - LS * 2;

  return (
    <svg viewBox={`0 ${vTop} 520 ${vH}`} className="w-full" aria-hidden="true">
      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={40} x2={490} y1={y} y2={y} stroke="#374151" strokeWidth="1.2" />
      ))}
      {/* 音部記号 */}
      <text
        x={5} y={L1 + 12}
        fontSize={72} fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >𝄞</text>

      {prog.map((chordName, ci) => {
        const notes   = CHORD_NOTES[chordName] ?? [];
        const ys      = notes.map(n => TY[n] ?? L1);
        const cx      = PROG_XS[ci];
        const topY    = ys.length ? Math.min(...ys) : TOP_LINE_Y;
        const bottomY = ys.length ? Math.max(...ys) : L1;
        const stemUp  = bottomY > middleY;
        const stemX   = stemUp ? cx + NR - 0.5 : cx - NR + 0.5;
        const stemEnd = stemUp ? topY - LS * 3.5 : bottomY + LS * 3.5;
        const off     = xOffsets(notes, stemUp);
        const isDone  = ci < cursor;
        const isCur   = ci === cursor;
        const fill    = isDone ? '#16a34a' : isCur ? '#ea580c' : '#374151';
        const ledgers = new Set<number>();
        notes.forEach(n => getLedgers(n).forEach(y => ledgers.add(y)));

        return (
          <g key={ci}>
            {/* カーソル背景 */}
            {isCur && (
              <rect x={cx - 22} y={vTop} width={44} height={vH}
                fill="#fed7aa" opacity={0.45} rx={6} />
            )}
            {/* コードネームラベル */}
            <text x={cx} y={vTop + 14} textAnchor="middle" fontSize={11} fontWeight="bold"
              fill={isDone ? '#16a34a' : isCur ? '#ea580c' : '#6b7280'}>
              {isDone ? '✓' : chordName}
            </text>
            {/* 加線 */}
            {[...ledgers].map(y => (
              <line key={y}
                x1={cx - NR * 2.6} x2={cx + NR * 2.6}
                y1={y} y2={y} stroke={fill} strokeWidth="1.4"
              />
            ))}
            {/* 符幹 */}
            <line x1={stemX} y1={stemUp ? bottomY : topY} x2={stemX} y2={stemEnd}
              stroke={fill} strokeWidth="1.5" />
            {/* 符頭 */}
            {notes.map((n, i) => {
              const y = TY[n] ?? L1;
              const dx = off[i];
              return (
                <ellipse key={n}
                  cx={cx + dx} cy={y} rx={NR} ry={NY}
                  fill={fill}
                  transform={`rotate(-12,${cx + dx},${y})`}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── フレーズ生成 ────────────────────────────────────────────────
function genProg(pool: string[]): string[] {
  const result: string[] = [];
  let prev = '';
  for (let i = 0; i < 4; i++) {
    const cands = pool.filter(c => c !== prev);
    const c = cands[Math.floor(Math.random() * cands.length)];
    result.push(c);
    prev = c;
  }
  return result;
}

function pickFrom(pool: string[], prev: string): string {
  const cands = pool.filter(c => c !== prev);
  const src   = cands.length ? cands : pool;
  return src[Math.floor(Math.random() * src.length)];
}

// ─── メインコンポーネント ────────────────────────────────────────
export function ChordReading() {
  const [level,      setLevel]      = useState<CRLevel>(1);
  const [question,   setQuestion]   = useState<string>('');
  const [verdict,    setVerdict]    = useState<Verdict>(null);
  const [locked,     setLocked]     = useState(false);
  const [stats,      setStats]      = useState({ correct: 0, total: 0 });

  // Level 3 progression
  const [prog,       setProg]       = useState<string[]>([]);
  const [cursor,     setCursor]     = useState(0);
  const [shake,      setShake]      = useState(false);
  const [clearAnim,  setClearAnim]  = useState(false);
  const [progActive, setProgActive] = useState(false);

  const pool = LEVEL_POOL[level];

  // ── Level 1 / 2 ──────────────────────────────────────────────
  const nextQuestion = useCallback((prevQ = '') => {
    setQuestion(pickFrom(LEVEL_POOL[level] as string[], prevQ));
    setVerdict(null);
    setLocked(false);
  }, [level]);

  const startQuiz = () => {
    const q = pickFrom(LEVEL_POOL[level] as string[], '');
    setQuestion(q);
    setVerdict(null);
    setLocked(false);
    setStats({ correct: 0, total: 0 });
  };

  const handleAnswer = (chosen: string) => {
    if (locked || !question) return;
    if (chosen === question) {
      playChord(chosen);
      setVerdict('correct');
      setStats(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setTimeout(() => nextQuestion(question), 900);
    } else {
      playChord(chosen);
      setVerdict('wrong');
      setStats(s => ({ ...s, total: s.total + 1 }));
      setLocked(true);
    }
  };

  const unlock = () => { if (locked) { setLocked(false); setVerdict(null); } };

  // ── Level 3 ──────────────────────────────────────────────────
  const startProg = () => {
    setProg(genProg(pool));
    setCursor(0);
    setClearAnim(false);
    setShake(false);
    setProgActive(true);
    setStats({ correct: 0, total: 0 });
  };

  const handleProgAnswer = (chosen: string) => {
    if (clearAnim || cursor >= prog.length) return;
    const correct = prog[cursor];
    if (chosen === correct) {
      playChord(chosen);
      setStats(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      const next = cursor + 1;
      setCursor(next);
      if (next >= prog.length) {
        setClearAnim(true);
        setTimeout(() => {
          setProg(genProg(pool));
          setCursor(0);
          setClearAnim(false);
        }, 1300);
      }
    } else {
      playChord(chosen);
      setStats(s => ({ ...s, total: s.total + 1 }));
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  const changeLevel = (lv: CRLevel) => {
    setLevel(lv);
    setQuestion('');
    setVerdict(null);
    setLocked(false);
    setProg([]);
    setProgActive(false);
    setCursor(0);
    setStats({ correct: 0, total: 0 });
  };

  const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const btns = pool;
  const isL3 = level === 3;

  return (
    <div className="pb-32">
      <style>{`
        @keyframes cr-shake {
          0%,100%{transform:translateX(0)}
          20%,60%{transform:translateX(-7px)}
          40%,80%{transform:translateX(7px)}
        }
        .cr-shake{animation:cr-shake 0.42s ease}
        @keyframes cr-clear {
          0%  {opacity:0;transform:scale(0.7)}
          40% {opacity:1;transform:scale(1.08)}
          80% {opacity:1;transform:scale(1.0)}
          100%{opacity:0;transform:scale(1.0)}
        }
        .cr-clear{animation:cr-clear 1.3s ease forwards}
      `}</style>

      {/* ── レベル選択 ── */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {([1, 2, 3] as CRLevel[]).map(lv => (
          <button key={lv} onClick={() => changeLevel(lv)}
            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              level === lv
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-gray-800 text-gray-300 border-gray-700'
            }`}>
            <div>Lv{lv}</div>
            <div className="text-[10px] font-normal opacity-80">
              {lv === 1 ? '主要三和音' : lv === 2 ? 'ダイアトニック' : 'コード進行'}
            </div>
          </button>
        ))}
      </div>

      {/* ── スコア ── */}
      {(question || progActive) && (
        <div className="flex gap-3 justify-center mb-3 text-sm text-gray-300">
          <span>正解率 <strong className="text-green-400">{acc}%</strong></span>
          <span className="text-gray-500">{stats.correct}/{stats.total}</span>
          {isL3 && progActive && (
            <span>進行 <strong className="text-yellow-400">{cursor}/4</strong></span>
          )}
        </div>
      )}

      {/* ── 五線譜エリア ── */}
      {isL3 ? (
        progActive && prog.length > 0 ? (
          <div className="relative mb-4">
            <div className={shake ? 'cr-shake' : ''}>
              <div className="bg-white rounded-2xl px-2 py-2 shadow-lg">
                <ProgressionStaff prog={prog} cursor={cursor} />
              </div>
            </div>
            {clearAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="cr-clear bg-teal-500 text-white text-3xl font-black px-8 py-4 rounded-2xl shadow-2xl">
                  🎉 Clear!
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-2xl p-6 text-center mb-4">
            <div className="text-5xl mb-3">🎼</div>
            <div className="text-gray-300 text-sm">コード進行スラスラ読み</div>
            <div className="text-gray-500 text-xs mt-1">4つのコードを連続で当てよう</div>
          </div>
        )
      ) : question ? (
        <div className="relative mb-4">
          <div
            className="bg-white rounded-2xl px-2 py-2 shadow-lg cursor-pointer"
            onClick={unlock}
          >
            <ChordStaff chordName={question} verdict={verdict} />
          </div>
          {locked && (
            <p className="text-center text-amber-400 text-xs mt-1">
              もう一度タップで解除 → 正解を選んでね
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 text-center mb-4">
          <div className="text-5xl mb-3">🎼</div>
          <div className="text-gray-300 text-sm">
            {level === 1 ? '主要三和音（C・F・G）' : 'ダイアトニックコード 7種類'}
          </div>
          <div className="text-gray-500 text-xs mt-1">コードネームを当てよう</div>
        </div>
      )}

      {/* ── スタートボタン ── */}
      {isL3 ? (
        <button
          onClick={startProg}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-lg rounded-2xl mb-4 transition-colors"
        >
          {progActive ? '新しい進行' : 'スタート 🎵'}
        </button>
      ) : !question ? (
        <button
          onClick={startQuiz}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-lg rounded-2xl mb-4 transition-colors"
        >
          スタート 🎵
        </button>
      ) : null}

      {/* ── 解答ボタン ── */}
      {(question || (isL3 && progActive)) && (
        <div className={`grid gap-2 ${btns.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {btns.map(name => {
            const isCorrectVerdict = verdict === 'correct' && name === question;
            const isWrongVerdict   = verdict === 'wrong'   && locked;
            return (
              <button
                key={name}
                onPointerDown={() => isL3 ? handleProgAnswer(name) : handleAnswer(name)}
                disabled={isL3 ? (clearAnim || cursor >= prog.length) : false}
                className={`py-3 rounded-xl font-bold text-sm transition-all select-none ${
                  isCorrectVerdict
                    ? 'bg-green-600 text-white scale-105 shadow-lg'
                    : isWrongVerdict && name !== question
                      ? 'bg-gray-800 text-gray-500 opacity-60'
                      : 'bg-teal-700 hover:bg-teal-600 active:bg-teal-800 active:scale-95 text-white shadow-md'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
              >
                <div className="text-base">{name}</div>
                <div className="text-[9px] font-normal opacity-75">{CHORD_JP[name]}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* ヒント */}
      {(question || (isL3 && progActive && cursor < prog.length)) && !clearAnim && (
        <p className="text-center text-gray-500 text-xs mt-3">
          {isL3 ? 'オレンジのコードのコードネームをタップ' : '五線譜のコードのコードネームを選ぼう'}
        </p>
      )}
    </div>
  );
}
