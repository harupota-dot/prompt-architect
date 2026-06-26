'use client';

import { useState, useCallback } from 'react';

// ─── 定数 ─────────────────────────────────────────────────────────
const LS         = 14;
const L1         = 106;
const TOP_LINE_Y = L1 - LS * 4;
const NR         = 6.5;
const NY         = 4.7;

type WinAC  = typeof window & { webkitAudioContext?: typeof AudioContext };
type CRLevel = 1 | 2 | 3 | 4;
type Verdict = 'correct' | 'wrong' | null;

// ─── 音名→Y座標（ト音記号）────────────────────────────────────────
const TY: Record<string, number> = {
  C4:L1+LS,     D4:L1+LS/2,   E4:L1,        F4:L1-LS/2,
  G4:L1-LS,     A4:L1-LS*1.5, B4:L1-LS*2,   C5:L1-LS*2.5,
  D5:L1-LS*3,   E5:L1-LS*3.5, F5:L1-LS*4,   G5:L1-LS*4.5,
  A5:L1-LS*5,
};

// ─── コード定義 ───────────────────────────────────────────────────
const CHORD_NOTES: Record<string, string[]> = {
  // Lv1: 主要三和音
  C:    ['C4','E4','G4'],
  F:    ['F4','A4','C5'],
  G:    ['G4','B4','D5'],
  // Lv2: ダイアトニック7コード（セブンス）
  Dm:   ['D4','F4','A4'],
  Em:   ['E4','G4','B4'],
  Am:   ['A4','C5','E5'],
  Bdim: ['B4','D5','F5'],
  Cmaj7:['C4','E4','G4','B4'],
  G7:   ['G4','B4','D5','F5'],
  Am7:  ['A4','C5','E5','G5'],
  Dm7:  ['D4','F4','A4','C5'],
  Fmaj7:['F4','A4','C5','E5'],
  Em7:  ['E4','G4','B4','D5'],
  // Lv3: sus・dim
  Csus4:['C4','F4','G4'],
  Gsus4:['G4','C5','D5'],
  Asus4:['A4','D5','E5'],
  Gsus2:['G4','A4','D5'],
  Bm7b5:['B4','D5','F5','A5'],
  // Lv4: 転回形
  'C/E': ['E4','G4','C5'],
  'G/B': ['B4','D5','G5'],
  'F/A': ['A4','C5','F5'],
  'Am/C':['C5','E5','A5'],
  'Dm/F':['F4','A4','D5'],
  'Em/G':['G4','B4','E5'],
};

const CHORD_JP: Record<string, string> = {
  C:'ドミソ', F:'ファラド', G:'ソシレ',
  Dm:'レファラ', Em:'ミソシ', Am:'ラドミ', Bdim:'シレファ',
  Cmaj7:'ドミソシ', G7:'ソシレファ', Am7:'ラドミソ',
  Dm7:'レファラド', Fmaj7:'ファラドミ', Em7:'ミソシレ',
  Csus4:'ドファソ', Gsus4:'ソドレ', Asus4:'ラレミ',
  Gsus2:'ソラレ', Bm7b5:'シレファラ',
  'C/E':'ミソド', 'G/B':'シレソ', 'F/A':'ラドファ',
  'Am/C':'ドミラ', 'Dm/F':'ファラレ', 'Em/G':'ソシミ',
};

const LEVEL_POOL: Record<CRLevel, string[]> = {
  1: ['C','F','G'],
  2: ['Cmaj7','G7','Am7','Dm7','Fmaj7','Em7'],
  3: ['Csus4','Gsus4','Asus4','Gsus2','Bm7b5'],
  4: ['C/E','G/B','F/A','Am/C','Dm/F','Em/G'],
};

// ─── 周波数テーブル ───────────────────────────────────────────────
function mf(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }
const FREQ: Record<string, number> = {
  C4:mf(60), D4:mf(62), E4:mf(64), F4:mf(65), G4:mf(67), A4:mf(69), B4:mf(71),
  C5:mf(72), D5:mf(74), E5:mf(76), F5:mf(77), G5:mf(79), A5:mf(81),
};

// ─── 音声エンジン — モジュールレベルシングルトン ─────────────────
let _ac: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ac || _ac.state === 'closed') {
    try {
      const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
      if (AC) _ac = new AC();
    } catch { /* ignore */ }
  }
  return _ac;
}

/** ピアノ風トーン: 5倍音 + 微デチューン + ADSR。destを指定するとコンプレッサー経由にできる */
function tone(ctx: AudioContext, freq: number, t: number, dur = 1.8, vol = 0.30, dest: AudioNode = ctx.destination): void {
  const master = ctx.createGain();
  master.connect(dest);

  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(vol,         t + 0.007);
  master.gain.exponentialRampToValueAtTime(vol * 0.50, t + 0.14);
  master.gain.exponentialRampToValueAtTime(vol * 0.22, t + 0.65);
  master.gain.exponentialRampToValueAtTime(0.0001,  t + dur);

  const harmonics: [number, number, OscillatorType, number][] = [
    [1, 1.00, 'triangle',  0   ],
    [2, 0.42, 'triangle',  1.5 ],
    [3, 0.16, 'sine',     -1.0 ],
    [4, 0.06, 'sine',      2.0 ],
    [5, 0.02, 'sine',     -1.5 ],
  ];

  harmonics.forEach(([mult, relVol, waveType, detuneC]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = waveType; o.frequency.value = freq * mult; o.detune.value = detuneC;
    g.gain.setValueAtTime(relVol, t);
    g.gain.exponentialRampToValueAtTime(Math.max(relVol * 0.004, 0.0001), t + dur / Math.sqrt(mult));
    o.start(t); o.stop(t + dur + 0.05);
  });
}

function playChord(chordName: string): void {
  const notes = CHORD_NOTES[chordName]; if (!notes) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const go = () => {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5;
      comp.connect(ctx.destination);
      const n = notes.length;
      notes.forEach(k => { const f = FREQ[k]; if (f) tone(ctx, f, ctx.currentTime, 2.0, 0.28 / Math.sqrt(n), comp); });
    };
    ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go();
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

function xOffsets(notes: string[], stemUp: boolean): number[] {
  const ys  = notes.map(n => TY[n] ?? L1);
  const off = new Array(notes.length).fill(0);
  for (let i = 0; i < ys.length - 1; i++) {
    if (Math.abs(ys[i] - ys[i + 1]) === LS / 2) {
      stemUp ? (off[i + 1] = NR * 2) : (off[i] = NR * 2);
    }
  }
  return off;
}

// ─── 単一コード SVG ──────────────────────────────────────────────
function ChordStaff({ chordName, verdict, cx = 175 }: { chordName: string; verdict?: Verdict; cx?: number }) {
  const notes   = CHORD_NOTES[chordName] ?? [];
  const ys      = notes.map(n => TY[n] ?? L1);
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
      {staffYs.map(y => (
        <line key={y} x1={40} x2={240} y1={y} y2={y} stroke="#374151" strokeWidth="1.2" />
      ))}
      <text x={13} y={L1 + 12} fontSize={72} fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif">𝄞</text>
      {[...ledgerSet].map(y => (
        <line key={y} x1={cx - NR * 2.6} x2={cx + NR * 2.6} y1={y} y2={y} stroke="#1f2937" strokeWidth="1.4" />
      ))}
      {notes.length > 0 && (
        <line x1={stemX} y1={stemUp ? bottomY : topY} x2={stemX} y2={stemEnd} stroke="#1f2937" strokeWidth="1.5" />
      )}
      {notes.map((n, i) => {
        const y = TY[n] ?? L1;
        const dx = off[i];
        return (
          <ellipse key={n} cx={cx + dx} cy={y} rx={NR} ry={NY}
            fill="#1f2937" transform={`rotate(-12,${cx + dx},${y})`} />
        );
      })}
      {verdictColor && (
        <text x={cx} y={vTop + 18} textAnchor="middle" fontSize={26} fill={verdictColor} fontWeight="bold">
          {verdict === 'correct' ? '○' : '✕'}
        </text>
      )}
    </svg>
  );
}

// ─── コード進行 SVG（Level 3・4）────────────────────────────────
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
      {staffYs.map(y => (
        <line key={y} x1={40} x2={490} y1={y} y2={y} stroke="#374151" strokeWidth="1.2" />
      ))}
      <text x={5} y={L1 + 12} fontSize={72} fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif">𝄞</text>

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
            {isCur && (
              <rect x={cx - 22} y={vTop} width={44} height={vH}
                fill="#fed7aa" opacity={0.45} rx={6} />
            )}
            <text x={cx} y={vTop + 14} textAnchor="middle" fontSize={11} fontWeight="bold"
              fill={isDone ? '#16a34a' : isCur ? '#ea580c' : '#6b7280'}>
              {isDone ? '✓' : chordName}
            </text>
            {[...ledgers].map(y => (
              <line key={y} x1={cx - NR * 2.6} x2={cx + NR * 2.6} y1={y} y2={y} stroke={fill} strokeWidth="1.4" />
            ))}
            <line x1={stemX} y1={stemUp ? bottomY : topY} x2={stemX} y2={stemEnd} stroke={fill} strokeWidth="1.5" />
            {notes.map((n, i) => {
              const y = TY[n] ?? L1;
              const dx = off[i];
              return (
                <ellipse key={n} cx={cx + dx} cy={y} rx={NR} ry={NY}
                  fill={fill} transform={`rotate(-12,${cx + dx},${y})`} />
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
    result.push(c); prev = c;
  }
  return result;
}

function pickFrom(pool: string[], prev: string): string {
  const cands = pool.filter(c => c !== prev);
  const src   = cands.length ? cands : pool;
  return src[Math.floor(Math.random() * src.length)];
}

// ─── レベル設定 ──────────────────────────────────────────────────
const LEVEL_LABEL: Record<CRLevel, { title: string; sub: string }> = {
  1: { title: '主要三和音', sub: 'Triads' },
  2: { title: 'セブンス',  sub: '7th Chords' },
  3: { title: 'sus・dim',  sub: 'Special' },
  4: { title: '転回形',    sub: 'Inversions' },
};

// ─── メインコンポーネント ────────────────────────────────────────
export function ChordReading() {
  const [level,      setLevel]      = useState<CRLevel>(1);
  const [question,   setQuestion]   = useState<string>('');
  const [verdict,    setVerdict]    = useState<Verdict>(null);
  const [locked,     setLocked]     = useState(false);
  const [stats,      setStats]      = useState({ correct: 0, total: 0 });

  // Level 3・4 progression
  const [prog,       setProg]       = useState<string[]>([]);
  const [cursor,     setCursor]     = useState(0);
  const [shake,      setShake]      = useState(false);
  const [clearAnim,  setClearAnim]  = useState(false);
  const [progActive, setProgActive] = useState(false);

  const pool   = LEVEL_POOL[level];
  const isProgMode = level === 3 || level === 4;

  // ── Level 1 / 2 ──────────────────────────────────────────────
  const nextQuestion = useCallback((prevQ = '') => {
    setQuestion(pickFrom(LEVEL_POOL[level] as string[], prevQ));
    setVerdict(null); setLocked(false);
  }, [level]);

  const startQuiz = () => {
    const q = pickFrom(LEVEL_POOL[level] as string[], '');
    setQuestion(q); setVerdict(null); setLocked(false);
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

  // ── Level 3 / 4 ──────────────────────────────────────────────
  const startProg = () => {
    setProg(genProg(pool)); setCursor(0);
    setClearAnim(false); setShake(false);
    setProgActive(true); setStats({ correct: 0, total: 0 });
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
        setTimeout(() => { setProg(genProg(pool)); setCursor(0); setClearAnim(false); }, 1300);
      }
    } else {
      playChord(chosen);
      setStats(s => ({ ...s, total: s.total + 1 }));
      setShake(true); setTimeout(() => setShake(false), 420);
    }
  };

  const changeLevel = (lv: CRLevel) => {
    setLevel(lv); setQuestion(''); setVerdict(null); setLocked(false);
    setProg([]); setProgActive(false); setCursor(0);
    setStats({ correct: 0, total: 0 });
  };

  const acc  = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const btns = pool;

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
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {([1, 2, 3, 4] as CRLevel[]).map(lv => (
          <button key={lv} onClick={() => changeLevel(lv)}
            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              level === lv
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-gray-800 text-gray-300 border-gray-700'
            }`}>
            <div>Lv{lv}</div>
            <div className="text-[10px] font-normal opacity-80">{LEVEL_LABEL[lv].title}</div>
          </button>
        ))}
      </div>

      {/* ── スコア ── */}
      {(question || progActive) && (
        <div className="flex gap-3 justify-center mb-3 text-sm text-gray-300">
          <span>正解率 <strong className="text-green-400">{acc}%</strong></span>
          <span className="text-gray-500">{stats.correct}/{stats.total}</span>
          {isProgMode && progActive && (
            <span>進行 <strong className="text-yellow-400">{cursor}/4</strong></span>
          )}
        </div>
      )}

      {/* ── 五線譜エリア ── */}
      {isProgMode ? (
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
            <div className="text-gray-300 text-sm">
              {level === 3 ? 'sus・dim コード進行' : '転回形コード進行'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {LEVEL_LABEL[level].sub} — 4コードを連続で当てよう
            </div>
          </div>
        )
      ) : question ? (
        <div className="relative mb-4">
          <div className="bg-white rounded-2xl px-2 py-2 shadow-lg cursor-pointer" onClick={unlock}>
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
            {LEVEL_LABEL[level].title}（{LEVEL_LABEL[level].sub}）
          </div>
          <div className="text-gray-500 text-xs mt-1">コードネームを当てよう</div>
        </div>
      )}

      {/* ── スタートボタン ── */}
      {isProgMode ? (
        <button onClick={startProg}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-lg rounded-2xl mb-4 transition-colors">
          {progActive ? '新しい進行' : 'スタート 🎵'}
        </button>
      ) : !question ? (
        <button onClick={startQuiz}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-lg rounded-2xl mb-4 transition-colors">
          スタート 🎵
        </button>
      ) : null}

      {/* ── 解答ボタン ── */}
      {(question || (isProgMode && progActive)) && (
        <div className={`grid gap-2 ${btns.length <= 3 ? 'grid-cols-3' : btns.length <= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {btns.map(name => {
            const isCorrectVerdict = verdict === 'correct' && name === question;
            const isWrongVerdict   = verdict === 'wrong'   && locked;
            return (
              <button key={name}
                onPointerDown={() => isProgMode ? handleProgAnswer(name) : handleAnswer(name)}
                disabled={isProgMode ? (clearAnim || cursor >= prog.length) : false}
                className={`py-3 rounded-xl font-bold text-sm transition-all select-none ${
                  isCorrectVerdict
                    ? 'bg-green-600 text-white scale-105 shadow-lg'
                    : isWrongVerdict && name !== question
                      ? 'bg-gray-800 text-gray-500 opacity-60'
                      : 'bg-teal-700 hover:bg-teal-600 active:bg-teal-800 active:scale-95 text-white shadow-md'
                }`}
                style={{ WebkitTapHighlightColor:'transparent', touchAction:'none' }}>
                <div className="text-base">{name}</div>
                <div className="text-[9px] font-normal opacity-75">{CHORD_JP[name] ?? ''}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* ヒント */}
      {(question || (isProgMode && progActive && cursor < prog.length)) && !clearAnim && (
        <p className="text-center text-gray-500 text-xs mt-3">
          {isProgMode ? 'オレンジのコードのコードネームをタップ' : '五線譜のコードのコードネームを選ぼう'}
        </p>
      )}
    </div>
  );
}
