'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────
type NoteName  = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type ChordName = 'C' | 'Dm' | 'Em' | 'F' | 'G' | 'Am';
type Clef      = 'treble' | 'bass';
type LernMode  = 'kiso' | 'note' | 'advanced' | 'chord';
type ClefOpt   = 'treble' | 'bass' | 'mix';
type Verdict   = 'correct' | 'wrong' | null;

// ─────────────────────────────────────────────────────────────────
// 周波数テーブル（E3〜C6）
// ─────────────────────────────────────────────────────────────────
const FREQ: Record<string, number> = {
  E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  C6:1046.50,
  // 低音域（ヘ音記号）
  C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, B2:123.47,
  C3:130.81, D3:146.83,
};

const CHORD_NOTES: Record<ChordName, string[]> = {
  C:  ['C4','E4','G4'],
  Dm: ['D4','F4','A4'],
  Em: ['E4','G4','B4'],
  F:  ['F4','A4','C5'],
  G:  ['G4','B4','D5'],
  Am: ['A4','C5','E5'],
};

// ─────────────────────────────────────────────────────────────────
// SVG 五線譜 定数
// ─────────────────────────────────────────────────────────────────
const LS          = 14;            // 線間隔 (px)
const L1          = 106;           // 第1線（最下線）の Y 座標
const TOP_LINE_Y  = L1 - LS * 4;  // 50 — 第5線（最上線）
const NR          = 6.5;           // 符頭 楕円 rx
const NY          = 4.7;           // 符頭 楕円 ry
const NOTE_X      = 175;           // 音符の X 位置

// ── ト音記号：音名→Y座標（E3〜C6 拡張済み） ─────────────────────
const TY: Record<string, number> = {
  // 五線の下（加線域）
  E3: L1 + LS * 3.5,   // 155
  F3: L1 + LS * 3,     // 148
  G3: L1 + LS * 2.5,   // 141
  A3: L1 + LS * 2,     // 134
  B3: L1 + LS * 1.5,   // 127
  C4: L1 + LS,         // 120  ← 中央C（加線）
  D4: L1 + LS / 2,     // 113
  // 五線内
  E4: L1,              // 106  ← 第1線
  F4: L1 - LS / 2,     // 99
  G4: L1 - LS,         // 92   ← 第2線
  A4: L1 - LS * 1.5,   // 85
  B4: L1 - LS * 2,     // 78   ← 第3線
  C5: L1 - LS * 2.5,   // 71
  D5: L1 - LS * 3,     // 64   ← 第4線
  E5: L1 - LS * 3.5,   // 57
  F5: L1 - LS * 4,     // 50   ← 第5線
  // 五線の上（加線域）
  G5: L1 - LS * 4.5,   // 43
  A5: L1 - LS * 5,     // 36   ← 加線
  B5: L1 - LS * 5.5,   // 29
  C6: L1 - LS * 6,     // 22   ← 加線
};

// ── ヘ音記号：音名→Y座標（C2〜E4 拡張済み） ─────────────────────
const BY: Record<string, number> = {
  // 五線の下（加線域）
  C2: L1 + LS * 2,     // 134  ← 加線
  D2: L1 + LS * 1.5,   // 127
  E2: L1 + LS,         // 120  ← 加線
  F2: L1 + LS / 2,     // 113
  // 五線内
  G2: L1,              // 106  ← 第1線
  A2: L1 - LS / 2,     // 99
  B2: L1 - LS,         // 92   ← 第2線
  C3: L1 - LS * 1.5,   // 85
  D3: L1 - LS * 2,     // 78   ← 第3線
  E3: L1 - LS * 2.5,   // 71
  F3: L1 - LS * 3,     // 64   ← 第4線
  G3: L1 - LS * 3.5,   // 57
  A3: L1 - LS * 4,     // 50   ← 第5線
  B3: L1 - LS * 4.5,   // 43
  // 五線の上（加線域）
  C4: L1 - LS * 5,     // 36   ← 加線（中央C）
  D4: L1 - LS * 5.5,   // 29
  E4: L1 - LS * 6,     // 22   ← 加線
};

// ─────────────────────────────────────────────────────────────────
// 加線計算（系統的アルゴリズム）
//   五線の下：bottomLine+LS, +2LS, … ≤ noteY まで
//   五線の上：topLine-LS, -2LS, … ≥ noteY まで
// ─────────────────────────────────────────────────────────────────
function getLedgers(noteKey: string, clef: Clef): number[] {
  const yMap = clef === 'treble' ? TY : BY;
  const y = yMap[noteKey];
  if (y === undefined) return [];
  const lines: number[] = [];
  if (y > L1) {
    // 五線より下：L1+LS, L1+2LS, … (note の Y 以下まで)
    for (let ly = L1 + LS; ly <= y; ly += LS) lines.push(ly);
  } else if (y < TOP_LINE_Y) {
    // 五線より上：TOP_LINE_Y-LS, -2LS, … (note の Y 以上まで)
    for (let ly = TOP_LINE_Y - LS; ly >= y; ly -= LS) lines.push(ly);
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────
// 出題プール
// ─────────────────────────────────────────────────────────────────
interface NQ { note: string; name: NoteName; clef: Clef }
const mk = (notes: string[], clef: Clef): NQ[] =>
  notes.map(n => ({ note: n, name: n[0] as NoteName, clef }));

// 標準：C〜C の1オクターブ（五線＋中央C 加線1本）
const TREBLE_STD: NQ[] = mk(['C4','D4','E4','F4','G4','A4','B4','C5'], 'treble');
const BASS_STD:   NQ[] = mk(['C3','D3','E3','F3','G3','A3','B3','C4'], 'bass');

// 発展：五線から飛び出した加線域のみ
const TREBLE_ADV: NQ[] = mk(
  ['E3','F3','G3','A3','B3',               // ト音記号 C4 より低い
   'D5','E5','F5','G5','A5','B5','C6'],    // ト音記号 C5 より高い
  'treble'
);
const BASS_ADV: NQ[] = mk(
  ['C2','D2','E2','F2','G2','A2','B2',     // ヘ音記号 C3 より低い
   'D4','E4'],                             // ヘ音記号 C4 より高い
  'bass'
);

const CHORD_LIST: ChordName[] = ['C','Dm','Em','F','G','Am'];
const NOTE_BTNS:  NoteName[]  = ['C','D','E','F','G','A','B'];
const NOTE_JP: Record<NoteName, string> = {
  C:'ド', D:'レ', E:'ミ', F:'ファ', G:'ソ', A:'ラ', B:'シ',
};
const KISO_LIST: NoteName[] = ['C','D','E','F','G','A','B'];

// ランダム選択（連続同一防止）
function pickNQ(pool: NQ[], prev?: string): NQ {
  const arr = pool.filter(x => x.note !== prev);
  const src = arr.length > 0 ? arr : pool;
  return src[Math.floor(Math.random() * src.length)];
}
function pickKiso(prev?: NoteName): NoteName {
  const arr = KISO_LIST.filter(n => n !== prev);
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickChord(prev?: ChordName): ChordName {
  const arr = CHORD_LIST.filter(c => c !== prev);
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────
// Web Audio エンジン（都度 new AudioContext → 既存タイマーと競合しない）
// ─────────────────────────────────────────────────────────────────
type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };

function makeAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    return AC ? new AC() : null;
  } catch { return null; }
}

function tone(ctx: AudioContext, freq: number, t: number, dur = 1.8, vol = 0.42): void {
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o2.connect(g2); g2.connect(ctx.destination);
  o1.type = 'triangle'; o1.frequency.value = freq;
  o2.type = 'sine';     o2.frequency.value = freq * 2.003;
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(vol,       t + 0.008);
  g1.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.25);
  g1.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(vol * 0.22, t + 0.008);
  g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.45);
  o1.start(t); o1.stop(t + dur + 0.05);
  o2.start(t); o2.stop(t + dur * 0.45 + 0.05);
}

function playNoteAudio(noteKey: string): void {
  const f = FREQ[noteKey];
  if (!f) return;
  const ctx = makeAC();
  if (!ctx) return;
  tone(ctx, f, ctx.currentTime);
}

function playChordAudio(chord: ChordName): void {
  const ctx = makeAC();
  if (!ctx) return;
  CHORD_NOTES[chord].forEach(n => {
    const f = FREQ[n];
    if (f) tone(ctx, f, ctx.currentTime, 2.2, 0.33);
  });
}

// ─────────────────────────────────────────────────────────────────
// NoteStaff — SVG 五線譜描画（動的 viewBox で加線域も完全対応）
// ─────────────────────────────────────────────────────────────────
function NoteStaff({ notes, clef }: { notes: string[]; clef: Clef }) {
  const yMap    = clef === 'treble' ? TY : BY;
  const staffYs = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY = L1 - LS * 2; // 第3線（B4 / D3）

  // 加線セット（系統的に計算）
  const ledgerSet = new Set<number>();
  notes.forEach(n => getLedgers(n, clef).forEach(y => ledgerSet.add(y)));

  // 音符 Y 座標群
  const noteYs  = notes.map(n => yMap[n] ?? L1);
  const topY    = noteYs.length ? Math.min(...noteYs) : TOP_LINE_Y;
  const bottomY = noteYs.length ? Math.max(...noteYs) : L1;

  // 符尾方向
  const stemUp    = bottomY > middleY;
  const stemX     = stemUp ? NOTE_X + NR - 0.5 : NOTE_X - NR + 0.5;
  const stemStart = stemUp ? bottomY           : topY;
  const stemEnd   = stemUp ? topY   - LS * 3.5 : bottomY + LS * 3.5;

  // 動的 viewBox：音符が加線域に出ても全体が見えるよう調整
  const PAD  = 20;
  const vTop    = Math.min(topY    - PAD, TOP_LINE_Y - PAD);
  const vBottom = Math.max(bottomY + PAD, L1         + PAD);
  const vH      = vBottom - vTop;
  const viewBox = `0 ${vTop} 280 ${vH}`;

  return (
    <svg
      viewBox={viewBox}
      className="w-full"
      style={{ userSelect: 'none' }}
      aria-hidden="true"
    >
      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={40} x2={266} y1={y} y2={y}
          stroke="#374151" strokeWidth="1.2" />
      ))}

      {/* 音部記号 */}
      <text
        x={clef === 'treble' ? 13 : 18}
        y={clef === 'treble' ? L1 + 12 : L1 - LS * 1.5 + 4}
        fontSize={clef === 'treble' ? 72 : 46}
        fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>

      {/* 加線（音符を貫く短い横線） */}
      {[...ledgerSet].map(y => (
        <line key={`l${y}`}
          x1={NOTE_X - NR * 2.6} x2={NOTE_X + NR * 2.6}
          y1={y} y2={y}
          stroke="#374151" strokeWidth="1.4" />
      ))}

      {/* 符尾 */}
      {notes.length > 0 && (
        <line x1={stemX} x2={stemX} y1={stemStart} y2={stemEnd}
          stroke="#1f2937" strokeWidth="1.5" />
      )}

      {/* 符頭 */}
      {notes.map(n => {
        const y = yMap[n];
        if (y === undefined) return null;
        return (
          <ellipse key={n}
            cx={NOTE_X} cy={y}
            rx={NR} ry={NY}
            fill="#1f2937"
            transform={`rotate(-12,${NOTE_X},${y})`}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// MusicLearning — メインコンポーネント
// ─────────────────────────────────────────────────────────────────
const MODE_TABS: { id: LernMode; label: string; sub: string }[] = [
  { id: 'kiso',     label: '🎹 基礎',  sub: 'ドレミと音名' },
  { id: 'note',     label: '🎵 標準',  sub: '五線譜 ド〜ド' },
  { id: 'advanced', label: '🌟 発展',  sub: '加線・範囲外' },
  { id: 'chord',    label: '🎼 コード', sub: '和音' },
];

export function MusicLearning() {
  const [mode,     setMode]     = useState<LernMode>('kiso');
  const [clefOpt,  setClefOpt]  = useState<ClefOpt>('treble');
  const [question, setQuestion] = useState<NQ | null>(null);
  const [kisoQ,    setKisoQ]    = useState<NoteName | null>(null);
  const [chord,    setChord]    = useState<ChordName | null>(null);
  const [verdict,  setVerdict]  = useState<Verdict>(null);
  const [locked,   setLocked]   = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [total,    setTotal]    = useState(0);

  const prevNoteRef  = useRef<string | undefined>(undefined);
  const prevKisoRef  = useRef<NoteName | undefined>(undefined);
  const prevChordRef = useRef<ChordName | undefined>(undefined);

  // mode / clefOpt に対応したプールを返す
  const getPool = useCallback((): NQ[] => {
    if (mode === 'note') {
      return clefOpt === 'treble' ? TREBLE_STD
           : clefOpt === 'bass'   ? BASS_STD
           : [...TREBLE_STD, ...BASS_STD];
    }
    // advanced
    return clefOpt === 'treble' ? TREBLE_ADV
         : clefOpt === 'bass'   ? BASS_ADV
         : [...TREBLE_ADV, ...BASS_ADV];
  }, [mode, clefOpt]);

  const newQuestion = useCallback(() => {
    setVerdict(null);
    setLocked(false);

    if (mode === 'kiso') {
      const n = pickKiso(prevKisoRef.current);
      prevKisoRef.current = n;
      setKisoQ(n); setQuestion(null); setChord(null);
      setTimeout(() => playNoteAudio(`${n}4`), 180);

    } else if (mode === 'chord') {
      const c = pickChord(prevChordRef.current);
      prevChordRef.current = c;
      setChord(c); setQuestion(null); setKisoQ(null);
      setTimeout(() => playChordAudio(c), 180);

    } else {
      // note / advanced
      const q = pickNQ(getPool(), prevNoteRef.current);
      prevNoteRef.current = q.note;
      setQuestion(q); setKisoQ(null); setChord(null);
      setTimeout(() => playNoteAudio(q.note), 180);
    }
  }, [mode, getPool]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // ── 単音・基礎モード 回答 ──────────────────────────────────────
  const handleNoteAnswer = useCallback((name: NoteName) => {
    const target = mode === 'kiso' ? kisoQ : question?.name;
    if (!target) return;

    // 押したボタンの音を鳴らす（正誤に関わらず）
    playNoteAudio(`${name}4`);
    const ok = name === target;

    if (!locked) {
      setTotal(t => t + 1);
      if (ok) {
        setVerdict('correct');
        setCorrect(c => c + 1);
        setTimeout(newQuestion, 1100);
      } else {
        setVerdict('wrong');
        setLocked(true);
        setTimeout(() => setVerdict(null), 1100);
      }
    } else {
      if (ok) { setVerdict('correct'); setTimeout(newQuestion, 900); }
      else    { setVerdict('wrong');   setTimeout(() => setVerdict(null), 800); }
    }
  }, [mode, kisoQ, question, locked, newQuestion]);

  // ── 和音モード 回答 ────────────────────────────────────────────
  const handleChordAnswer = useCallback((c: ChordName) => {
    if (!chord) return;
    playChordAudio(c);
    const ok = c === chord;

    if (!locked) {
      setTotal(t => t + 1);
      if (ok) {
        setVerdict('correct');
        setCorrect(cnt => cnt + 1);
        setTimeout(newQuestion, 1400);
      } else {
        setVerdict('wrong');
        setLocked(true);
        setTimeout(() => setVerdict(null), 1100);
      }
    } else {
      if (ok) { setVerdict('correct'); setTimeout(newQuestion, 1000); }
      else    { setVerdict('wrong');   setTimeout(() => setVerdict(null), 800); }
    }
  }, [chord, locked, newQuestion]);

  const replay = () => {
    if (mode === 'kiso' && kisoQ)                          playNoteAudio(`${kisoQ}4`);
    if ((mode === 'note' || mode === 'advanced') && question) playNoteAudio(question.note);
    if (mode === 'chord' && chord)                         playChordAudio(chord);
  };

  // 五線譜に渡す音符リスト・記号
  const staffNotes = (mode === 'note' || mode === 'advanced') && question
    ? [question.note]
    : mode === 'chord' && chord
    ? CHORD_NOTES[chord]
    : [];
  const staffClef  = mode === 'chord' ? 'treble' : (question?.clef ?? 'treble');
  const accuracy   = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isNoteMode = mode !== 'chord'; // 単音系モード（kiso / note / advanced）
  const showClef   = mode === 'note' || mode === 'advanced';

  const changeMode = (m: LernMode) => {
    setMode(m); setCorrect(0); setTotal(0);
  };
  const changeClef = (c: ClefOpt) => {
    setClefOpt(c); setCorrect(0); setTotal(0);
  };

  return (
    <div className="flex flex-col gap-3 pb-28 max-w-md mx-auto px-4">

      {/* ── モードタブ（4つ） ── */}
      <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-2xl">
        {MODE_TABS.map(({ id, label, sub }) => (
          <button key={id} onClick={() => changeMode(id)}
            className={`py-2 px-0.5 rounded-xl text-center transition-all ${
              mode === id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block text-[11px] font-black leading-tight">{label}</span>
            <span className={`block text-[8px] leading-none mt-0.5 ${
              mode === id ? 'text-indigo-200' : 'text-gray-400'
            }`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── 音部記号選択（標準・発展モード時のみ） ── */}
      {showClef && (
        <div className="flex gap-1.5">
          {(['treble', 'bass', 'mix'] as ClefOpt[]).map(c => (
            <button key={c} onClick={() => changeClef(c)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                clefOpt === c
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {c === 'treble' ? '𝄞 ト音記号' : c === 'bass' ? '𝄢 ヘ音記号' : '🔀 ミックス'}
            </button>
          ))}
        </div>
      )}

      {/* ── 問題エリア ── */}
      {mode === 'kiso' ? (
        /* 基礎モード：カタカナテキストで出題 */
        <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          style={{ minHeight: 130 }}>
          <div className="flex flex-col items-center justify-center h-full py-6 gap-2">
            <p className="text-xs text-gray-400 font-medium">この音のアルファベット名は？</p>
            <span className="text-8xl font-black text-indigo-700 leading-none select-none">
              {kisoQ ? NOTE_JP[kisoQ] : '…'}
            </span>
          </div>
          {verdict && (
            <div className={`absolute inset-0 flex items-center justify-end pr-8 pointer-events-none ${
              verdict === 'correct' ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              <span className={`text-6xl font-black drop-shadow ${
                verdict === 'correct' ? 'text-emerald-500' : 'text-red-500'
              }`}>{verdict === 'correct' ? '◯' : '✕'}</span>
            </div>
          )}
        </div>
      ) : (
        /* 標準・発展・コードモード：SVG 五線譜 */
        <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-2 select-none overflow-hidden">
          <NoteStaff notes={staffNotes} clef={staffClef} />
          {verdict && (
            <div className={`absolute inset-0 flex items-center justify-end pr-8 pointer-events-none ${
              verdict === 'correct' ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              <span className={`text-6xl font-black drop-shadow ${
                verdict === 'correct' ? 'text-emerald-500' : 'text-red-500'
              }`}>{verdict === 'correct' ? '◯' : '✕'}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 再生 / ロック中メッセージ ── */}
      <div className="flex items-center gap-3 min-h-[32px]">
        <button onClick={replay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all">
          🔊 再生
        </button>
        {locked && verdict === null && (
          <p className="text-xs text-red-600 font-semibold animate-pulse">
            正解するまで次へ進めません！
          </p>
        )}
      </div>

      {/* ── 回答ボタン ── */}
      {isNoteMode ? (
        /* C/D/E/F/G/A/B ボタン（基礎・標準・発展） */
        <div className="grid grid-cols-7 gap-1">
          {NOTE_BTNS.map(name => {
            const target   = mode === 'kiso' ? kisoQ : question?.name;
            const isAnswer = target === name;
            const showHint = verdict === 'wrong'   && isAnswer;
            const showWin  = verdict === 'correct' && isAnswer;
            return (
              <button key={name} onClick={() => handleNoteAnswer(name)}
                disabled={verdict === 'correct'}
                className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                  showHint ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : showWin ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
                }`}>
                <span className="block">{name}</span>
                <span className="block text-[8px] font-medium opacity-60 leading-none mt-0.5">
                  {NOTE_JP[name]}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* コードボタン */
        <div className="grid grid-cols-3 gap-2">
          {CHORD_LIST.map(c => {
            const isAnswer = chord === c;
            const showHint = verdict === 'wrong'   && isAnswer;
            const showWin  = verdict === 'correct' && isAnswer;
            return (
              <button key={c} onClick={() => handleChordAnswer(c)}
                disabled={verdict === 'correct'}
                className={`py-3 rounded-xl font-black text-base transition-all active:scale-95 ${
                  showHint ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : showWin ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                }`}>
                {c}
              </button>
            );
          })}
        </div>
      )}

      {/* ── スコア ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">正答率</span>
          <span className="text-base font-black text-indigo-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{correct} / {total} 問</span>
        <button onClick={() => { setCorrect(0); setTotal(0); }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
          リセット
        </button>
      </div>

    </div>
  );
}
