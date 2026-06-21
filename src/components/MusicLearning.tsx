'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SightReading }  from './SightReading';
import { ChordReading }  from './ChordReading';

// ─────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────
type NoteName  = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type ChordName = 'C' | 'Dm' | 'Em' | 'F' | 'G' | 'Am';
type Clef      = 'treble' | 'bass';
type LernMode  = 'kiso' | 'note' | 'advanced' | 'chord' | 'sightread' | 'chordread';
type ClefOpt   = 'treble' | 'bass' | 'mix';
type KisoDir   = 'ja-en' | 'en-ja';   // ← 基礎モード出題方向
type Verdict   = 'correct' | 'wrong' | null;

// ─────────────────────────────────────────────────────────────────
// 【修正①】周波数テーブル — A4=440Hz / 十二平均律の厳密な値
//   式: 440 × 2^((MIDI番号 - 69) / 12)
//   各値はピアノ鍵盤の正確なピッチと完全に一致します。
// ─────────────────────────────────────────────────────────────────
function mf(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }

const FREQ: Record<string, number> = {
  // ヘ音記号域（MIDI 36〜59）
  C2: mf(36),  // 65.406 Hz
  D2: mf(38),  // 73.416
  E2: mf(40),  // 82.407
  F2: mf(41),  // 87.307
  G2: mf(43),  // 98.000
  A2: mf(45),  // 110.000
  B2: mf(47),  // 123.471
  C3: mf(48),  // 130.813
  D3: mf(50),  // 146.832
  E3: mf(52),  // 164.814
  F3: mf(53),  // 174.614
  G3: mf(55),  // 196.000
  A3: mf(57),  // 220.000
  B3: mf(59),  // 246.942
  // 中央オクターブ（MIDI 60〜71）
  C4: mf(60),  // 261.626
  D4: mf(62),  // 293.665
  E4: mf(64),  // 329.628
  F4: mf(65),  // 349.228
  G4: mf(67),  // 391.995
  A4: mf(69),  // 440.000
  B4: mf(71),  // 493.883
  // ト音記号域（MIDI 72〜84）
  C5: mf(72),  // 523.251
  D5: mf(74),  // 587.330
  E5: mf(76),  // 659.255
  F5: mf(77),  // 698.456
  G5: mf(79),  // 783.991
  A5: mf(81),  // 880.000
  B5: mf(83),  // 987.767
  C6: mf(84),  // 1046.502
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
const LS         = 14;
const L1         = 106;          // 第1線（最下線）の Y 座標
const TOP_LINE_Y = L1 - LS * 4; // 50 — 第5線（最上線）
const NR         = 6.5;
const NY         = 4.7;
const NOTE_X     = 175;

// ト音記号：音名→Y座標（E3〜C6）
const TY: Record<string, number> = {
  E3: L1 + LS*3.5, F3: L1 + LS*3,   G3: L1 + LS*2.5,
  A3: L1 + LS*2,   B3: L1 + LS*1.5, C4: L1 + LS,
  D4: L1 + LS/2,   E4: L1,          F4: L1 - LS/2,
  G4: L1 - LS,     A4: L1 - LS*1.5, B4: L1 - LS*2,
  C5: L1 - LS*2.5, D5: L1 - LS*3,   E5: L1 - LS*3.5,
  F5: L1 - LS*4,   G5: L1 - LS*4.5, A5: L1 - LS*5,
  B5: L1 - LS*5.5, C6: L1 - LS*6,
};

// ヘ音記号：音名→Y座標（C2〜E4）
const BY: Record<string, number> = {
  C2: L1 + LS*2,   D2: L1 + LS*1.5, E2: L1 + LS,
  F2: L1 + LS/2,   G2: L1,          A2: L1 - LS/2,
  B2: L1 - LS,     C3: L1 - LS*1.5, D3: L1 - LS*2,
  E3: L1 - LS*2.5, F3: L1 - LS*3,   G3: L1 - LS*3.5,
  A3: L1 - LS*4,   B3: L1 - LS*4.5, C4: L1 - LS*5,
  D4: L1 - LS*5.5, E4: L1 - LS*6,
};

// 加線計算（系統的アルゴリズム）
function getLedgers(noteKey: string, clef: Clef): number[] {
  const yMap = clef === 'treble' ? TY : BY;
  const y = yMap[noteKey];
  if (y === undefined) return [];
  const lines: number[] = [];
  if (y > L1) {
    for (let ly = L1 + LS; ly <= y; ly += LS) lines.push(ly);
  } else if (y < TOP_LINE_Y) {
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

const TREBLE_STD: NQ[] = mk(['C4','D4','E4','F4','G4','A4','B4','C5'], 'treble');
const BASS_STD:   NQ[] = mk(['C3','D3','E3','F3','G3','A3','B3','C4'], 'bass');
const TREBLE_ADV: NQ[] = mk(
  ['E3','F3','G3','A3','B3', 'D5','E5','F5','G5','A5','B5','C6'], 'treble');
const BASS_ADV:   NQ[] = mk(
  ['C2','D2','E2','F2','G2','A2','B2', 'D4','E4'], 'bass');

const CHORD_LIST: ChordName[] = ['C','Dm','Em','F','G','Am'];
const NOTE_BTNS:  NoteName[]  = ['C','D','E','F','G','A','B'];
const NOTE_JP: Record<NoteName, string> = {
  C:'ド', D:'レ', E:'ミ', F:'ファ', G:'ソ', A:'ラ', B:'シ',
};
const KISO_LIST: NoteName[] = ['C','D','E','F','G','A','B'];

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
// 【修正②③】Web Audio エンジン — ピッチ完全修正 + 音色改善
//
//   旧コード: o2.frequency.value = freq * 2.003
//     → 0.15% sharp なので beat frequency（うなり）が生じ音が "ズレて" 聴こえた
//
//   新コード: 純正倍音（1f / 2f / 3f / 4f）を sine/triangle でミックス
//     → 正確なピッチ + ピアノに近いアタック感の音色
// ─────────────────────────────────────────────────────────────────
type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };

function makeAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    return AC ? new AC() : null;
  } catch { return null; }
}

/** 単一周波数の発音（ピアノ風 ADSR エンベロープ） */
function tone(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur = 1.6,
  masterVol = 0.38,
): void {
  // 倍音構成: [倍率, 相対音量, 波形]
  // 1f:triangle 100%, 2f:triangle 50%, 3f:sine 20%, 4f:sine 8%
  const harmonics: [number, number, OscillatorType][] = [
    [1, 1.00, 'triangle'],
    [2, 0.50, 'triangle'],
    [3, 0.20, 'sine'],
    [4, 0.08, 'sine'],
  ];

  // マスターゲイン（全倍音の合算音量を一括制御）
  const master = ctx.createGain();
  master.connect(ctx.destination);
  // ピアノ風 ADSR: 素早いアタック → 素早いディケイ → サスティン → リリース
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(masterVol,       t + 0.006); // Attack  6ms
  master.gain.exponentialRampToValueAtTime(masterVol * 0.45, t + 0.18);  // Decay
  master.gain.exponentialRampToValueAtTime(masterVol * 0.20, t + 0.80);  // Sustain
  master.gain.exponentialRampToValueAtTime(0.0001,     t + dur);         // Release

  harmonics.forEach(([mult, relVol, waveType]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(master);
    o.type = waveType;
    o.frequency.value = freq * mult;  // ← 純正倍音（2.003 ではなく 2.000 等）
    // 倍音ごとに減衰速度を変える（高次倍音は早く消える）
    g.gain.setValueAtTime(relVol, t);
    g.gain.exponentialRampToValueAtTime(relVol * 0.01, t + dur * (1 / mult));
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

function playNoteAudio(noteKey: string): void {
  const f = FREQ[noteKey];
  if (!f) return;
  const ctx = makeAC();
  if (!ctx) return;
  try {
    const go = () => tone(ctx, f, ctx.currentTime);
    if (ctx.state === 'suspended') { ctx.resume().then(go).catch(() => {}); } else { go(); }
  } catch { /* ignore */ }
}

function playChordAudio(chord: ChordName): void {
  const ctx = makeAC();
  if (!ctx) return;
  try {
    const go = () => CHORD_NOTES[chord].forEach(n => {
      const f = FREQ[n];
      if (f) tone(ctx, f, ctx.currentTime, 2.0, 0.28);
    });
    if (ctx.state === 'suspended') { ctx.resume().then(go).catch(() => {}); } else { go(); }
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// NoteStaff — SVG 五線譜描画（動的 viewBox で加線域も完全対応）
// ─────────────────────────────────────────────────────────────────
function NoteStaff({ notes, clef }: { notes: string[]; clef: Clef }) {
  const yMap    = clef === 'treble' ? TY : BY;
  const staffYs = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY = L1 - LS * 2;

  const ledgerSet = new Set<number>();
  notes.forEach(n => getLedgers(n, clef).forEach(y => ledgerSet.add(y)));

  const noteYs  = notes.map(n => yMap[n] ?? L1);
  const topY    = noteYs.length ? Math.min(...noteYs) : TOP_LINE_Y;
  const bottomY = noteYs.length ? Math.max(...noteYs) : L1;

  const stemUp    = bottomY > middleY;
  const stemX     = stemUp ? NOTE_X + NR - 0.5 : NOTE_X - NR + 0.5;
  const stemStart = stemUp ? bottomY : topY;
  const stemEnd   = stemUp ? topY - LS * 3.5 : bottomY + LS * 3.5;

  const PAD  = 22;
  const vTop    = Math.min(topY    - PAD, TOP_LINE_Y - PAD);
  const vBottom = Math.max(bottomY + PAD, L1         + PAD);
  const vH      = vBottom - vTop;

  return (
    <svg
      viewBox={`0 ${vTop} 280 ${vH}`}
      className="w-full"
      style={{ userSelect: 'none' }}
      aria-hidden="true"
    >
      {staffYs.map(y => (
        <line key={y} x1={40} x2={266} y1={y} y2={y}
          stroke="#374151" strokeWidth="1.2" />
      ))}
      <text
        x={clef === 'treble' ? 13 : 18}
        y={clef === 'treble' ? L1 + 12 : L1 - LS*1.5 + 4}
        fontSize={clef === 'treble' ? 72 : 46}
        fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>
      {[...ledgerSet].map(y => (
        <line key={`l${y}`}
          x1={NOTE_X - NR * 2.6} x2={NOTE_X + NR * 2.6}
          y1={y} y2={y}
          stroke="#374151" strokeWidth="1.4" />
      ))}
      {notes.length > 0 && (
        <line x1={stemX} x2={stemX} y1={stemStart} y2={stemEnd}
          stroke="#1f2937" strokeWidth="1.5" />
      )}
      {notes.map(n => {
        const y = yMap[n];
        if (y === undefined) return null;
        return (
          <ellipse key={n}
            cx={NOTE_X} cy={y} rx={NR} ry={NY}
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
  { id: 'kiso',     label: '🎹 基礎',   sub: 'ドレミ・音名' },
  { id: 'note',     label: '🎵 標準',   sub: '五線譜' },
  { id: 'advanced', label: '🌟 発展',   sub: '加線' },
  { id: 'chord',    label: '🎼 コード', sub: '和音' },
  { id: 'sightread', label: '👁️ スラスラ',   sub: 'Sight-Read' },
  { id: 'chordread', label: '🎹 コード読み', sub: 'Chords' },
];

export function MusicLearning() {
  const [mode,     setMode]     = useState<LernMode>('kiso');
  const [kisoDir,  setKisoDir]  = useState<KisoDir>('ja-en');
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

  const getPool = useCallback((): NQ[] => {
    if (mode === 'note') {
      return clefOpt === 'treble' ? TREBLE_STD
           : clefOpt === 'bass'   ? BASS_STD
           : [...TREBLE_STD, ...BASS_STD];
    }
    return clefOpt === 'treble' ? TREBLE_ADV
         : clefOpt === 'bass'   ? BASS_ADV
         : [...TREBLE_ADV, ...BASS_ADV];
  }, [mode, clefOpt]);

  const newQuestion = useCallback(() => {
    if (mode === 'sightread' || mode === 'chordread') return;
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
      const q = pickNQ(getPool(), prevNoteRef.current);
      prevNoteRef.current = q.note;
      setQuestion(q); setKisoQ(null); setChord(null);
      setTimeout(() => playNoteAudio(q.note), 180);
    }
  }, [mode, getPool]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // ── 単音・基礎 回答 ───────────────────────────────────────────
  const handleNoteAnswer = useCallback((name: NoteName) => {
    const target = mode === 'kiso' ? kisoQ : question?.name;
    if (!target) return;

    playNoteAudio(`${name}4`); // 押したボタンの音を正確なピッチで鳴らす
    const ok = name === target;

    if (!locked) {
      setTotal(t => t + 1);
      if (ok) {
        setVerdict('correct'); setCorrect(c => c + 1);
        setTimeout(newQuestion, 1100);
      } else {
        setVerdict('wrong'); setLocked(true);
        setTimeout(() => setVerdict(null), 1100);
      }
    } else {
      if (ok) { setVerdict('correct'); setTimeout(newQuestion, 900); }
      else    { setVerdict('wrong');   setTimeout(() => setVerdict(null), 800); }
    }
  }, [mode, kisoQ, question, locked, newQuestion]);

  // ── 和音 回答 ─────────────────────────────────────────────────
  const handleChordAnswer = useCallback((c: ChordName) => {
    if (!chord) return;
    playChordAudio(c);
    const ok = c === chord;

    if (!locked) {
      setTotal(t => t + 1);
      if (ok) {
        setVerdict('correct'); setCorrect(cnt => cnt + 1);
        setTimeout(newQuestion, 1400);
      } else {
        setVerdict('wrong'); setLocked(true);
        setTimeout(() => setVerdict(null), 1100);
      }
    } else {
      if (ok) { setVerdict('correct'); setTimeout(newQuestion, 1000); }
      else    { setVerdict('wrong');   setTimeout(() => setVerdict(null), 800); }
    }
  }, [chord, locked, newQuestion]);

  const replay = () => {
    if (mode === 'kiso' && kisoQ)                             playNoteAudio(`${kisoQ}4`);
    if ((mode === 'note' || mode === 'advanced') && question) playNoteAudio(question.note);
    if (mode === 'chord' && chord)                            playChordAudio(chord);
  };

  const staffNotes = (mode === 'note' || mode === 'advanced') && question
    ? [question.note]
    : mode === 'chord' && chord
    ? CHORD_NOTES[chord]
    : [];
  const staffClef   = mode === 'chord' ? 'treble' : (question?.clef ?? 'treble');
  const accuracy    = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isNoteMode  = mode !== 'chord';
  const showClef    = mode === 'note' || mode === 'advanced';

  const changeMode = (m: LernMode) => { setMode(m); setCorrect(0); setTotal(0); };
  const changeClef = (c: ClefOpt)  => { setClefOpt(c); setCorrect(0); setTotal(0); };

  // 基礎モード：出題テキストとボタンラベルを方向で切り替え
  const kisoDisplayText  = kisoQ
    ? (kisoDir === 'ja-en' ? NOTE_JP[kisoQ] : kisoQ)
    : '…';
  const kisoDisplaySub   = kisoDir === 'ja-en'
    ? 'このカタカナのアルファベット名は？'
    : 'この音名をカタカナで選んでください';
  // ボタンは常に NoteName で答えるが、ラベルだけ変える
  const kisoBtnLabel = (name: NoteName) =>
    kisoDir === 'ja-en' ? name : NOTE_JP[name];

  return (
    <div className="flex flex-col gap-3 pb-28 max-w-md mx-auto px-4">

      {/* ── モードタブ ── */}
      <div className="grid grid-cols-6 gap-0.5 bg-gray-100 p-1 rounded-2xl">
        {MODE_TABS.map(({ id, label, sub }) => (
          <button key={id} onClick={() => changeMode(id)}
            className={`py-2 px-0 rounded-xl text-center transition-all ${
              mode === id
                ? id === 'sightread'  ? 'bg-purple-600 text-white shadow-md'
                  : id === 'chordread'  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block text-[10px] font-black leading-tight">{label}</span>
            <span className={`block text-[7px] leading-none mt-0.5 ${
              mode === id ? 'text-white/70' : 'text-gray-400'
            }`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── スラスラ読みモード ── */}
      {mode === 'sightread' && <SightReading />}

      {/* ── コード読みモード ── */}
      {mode === 'chordread' && <ChordReading />}

      {/* ── 以下は sightread / chordread 以外のモードでのみ表示 ── */}
      {mode !== 'sightread' && mode !== 'chordread' && <>

      {/* ── 基礎モード：出題方向トグル ── */}
      {mode === 'kiso' && (
        <div className="flex gap-1.5">
          <button onClick={() => { setKisoDir('ja-en'); setCorrect(0); setTotal(0); }}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              kisoDir === 'ja-en'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            ド→C（カタカナ→英語）
          </button>
          <button onClick={() => { setKisoDir('en-ja'); setCorrect(0); setTotal(0); }}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              kisoDir === 'en-ja'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            C→ド（英語→カタカナ）
          </button>
        </div>
      )}

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
        <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          style={{ minHeight: 130 }}>
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <p className="text-xs text-gray-400 font-medium">{kisoDisplaySub}</p>
            <span className={`font-black text-indigo-700 leading-none select-none ${
              kisoDir === 'ja-en' ? 'text-7xl' : 'text-8xl tracking-widest'
            }`}>
              {kisoDisplayText}
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
        /* 基礎・標準・発展 */
        <div className={`grid gap-1.5 ${
          mode === 'kiso' && kisoDir === 'en-ja'
            ? 'grid-cols-4'   // カタカナは少し広め（ファ/ソが長い）
            : 'grid-cols-7'
        }`}>
          {NOTE_BTNS.map(name => {
            const target   = mode === 'kiso' ? kisoQ : question?.name;
            const isAnswer = target === name;
            const showHint = verdict === 'wrong'   && isAnswer;
            const showWin  = verdict === 'correct' && isAnswer;
            return (
              <button key={name} onClick={() => handleNoteAnswer(name)}
                disabled={verdict === 'correct'}
                className={`rounded-xl font-black transition-all active:scale-95 ${
                  mode === 'kiso' && kisoDir === 'en-ja' ? 'py-4 text-base' : 'py-3 text-sm'
                } ${
                  showHint ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : showWin  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
                }`}>
                <span className="block leading-tight">{kisoBtnLabel(name)}</span>
                {/* 英語ボタン時はカタカナをサブラベルとして表示（標準・発展モード） */}
                {mode !== 'kiso' && (
                  <span className="block text-[8px] font-medium opacity-50 leading-none mt-0.5">
                    {NOTE_JP[name]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* コード */
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
                  : showWin  ? 'bg-emerald-500 text-white shadow-md'
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

      </> /* end mode !== 'rhythm' */}

    </div>
  );
}
