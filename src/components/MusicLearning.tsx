'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SightReading }  from './SightReading';
import { ChordReading }  from './ChordReading';

// ─────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────
type NoteName  = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Clef      = 'treble' | 'bass';
type LernMode  = 'kiso' | 'note' | 'advanced' | 'chord' | 'sightread' | 'chordread';
type ClefOpt   = 'treble' | 'bass' | 'mix';
type KisoDir   = 'ja-en' | 'en-ja';
type Verdict   = 'correct' | 'wrong' | null;
type ChordLevel = 1 | 2 | 3 | 4;

// ─────────────────────────────────────────────────────────────────
// 周波数テーブル
// ─────────────────────────────────────────────────────────────────
function mf(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }

const FREQ: Record<string, number> = {
  C2:mf(36), D2:mf(38), E2:mf(40), F2:mf(41), G2:mf(43), A2:mf(45), B2:mf(47),
  C3:mf(48), D3:mf(50), E3:mf(52), F3:mf(53), G3:mf(55), A3:mf(57), B3:mf(59),
  C4:mf(60), D4:mf(62), E4:mf(64), F4:mf(65), G4:mf(67), A4:mf(69), B4:mf(71),
  C5:mf(72), D5:mf(74), E5:mf(76), F5:mf(77), G5:mf(79), A5:mf(81), B5:mf(83),
  C6:mf(84),
};

// ─────────────────────────────────────────────────────────────────
// コードデータ — 4レベル全種定義
// ─────────────────────────────────────────────────────────────────
const CHORD_NOTES: Record<string, string[]> = {
  // Level 1: 基礎三和音
  C:     ['C4','E4','G4'],
  Dm:    ['D4','F4','A4'],
  Em:    ['E4','G4','B4'],
  F:     ['F4','A4','C5'],
  G:     ['G4','B4','D5'],
  Am:    ['A4','C5','E5'],
  // Level 2: セブンス
  Cmaj7: ['C4','E4','G4','B4'],
  G7:    ['G4','B4','D5','F5'],
  Am7:   ['A4','C5','E5','G5'],
  Dm7:   ['D4','F4','A4','C5'],
  Fmaj7: ['F4','A4','C5','E5'],
  Em7:   ['E4','G4','B4','D5'],
  // Level 3: sus / dim / 特殊
  Csus4: ['C4','F4','G4'],
  Gsus4: ['G4','C5','D5'],
  Asus4: ['A4','D5','E5'],
  Gsus2: ['G4','A4','D5'],
  Dsus2: ['D4','E4','A4'],
  Bdim:  ['B4','D5','F5'],
  Bm7b5: ['B4','D5','F5','A5'],
  // Level 4: 転回形（スラッシュコード）
  'C/E':  ['E4','G4','C5'],
  'G/B':  ['B4','D5','G5'],
  'F/A':  ['A4','C5','F5'],
  'Am/C': ['C5','E5','A5'],
  'Dm/F': ['F4','A4','D5'],
  'Em/G': ['G4','B4','E5'],
};

const CHORD_LEVELS: string[][] = [
  ['C','Dm','Em','F','G','Am'],
  ['Cmaj7','G7','Am7','Dm7','Fmaj7','Em7'],
  ['Csus4','Gsus4','Asus4','Bdim','Bm7b5','Gsus2'],
  ['C/E','G/B','F/A','Am/C','Dm/F','Em/G'],
];

const CHORD_LEVEL_LABELS = [
  { title:'基礎三和音', sub:'Triads' },
  { title:'セブンス',  sub:'7th' },
  { title:'sus・dim',  sub:'Special' },
  { title:'転回形',    sub:'Inversions' },
];

// ─────────────────────────────────────────────────────────────────
// SVG 五線譜 定数
// ─────────────────────────────────────────────────────────────────
const LS         = 14;
const L1         = 106;
const TOP_LINE_Y = L1 - LS * 4;
const NR         = 6.5;
const NY         = 4.7;
const NOTE_X     = 175;

const TY: Record<string, number> = {
  E3:L1+LS*3.5, F3:L1+LS*3,   G3:L1+LS*2.5,
  A3:L1+LS*2,   B3:L1+LS*1.5, C4:L1+LS,
  D4:L1+LS/2,   E4:L1,        F4:L1-LS/2,
  G4:L1-LS,     A4:L1-LS*1.5, B4:L1-LS*2,
  C5:L1-LS*2.5, D5:L1-LS*3,   E5:L1-LS*3.5,
  F5:L1-LS*4,   G5:L1-LS*4.5, A5:L1-LS*5,
  B5:L1-LS*5.5, C6:L1-LS*6,
};
const BY: Record<string, number> = {
  C2:L1+LS*2,   D2:L1+LS*1.5, E2:L1+LS,
  F2:L1+LS/2,   G2:L1,        A2:L1-LS/2,
  B2:L1-LS,     C3:L1-LS*1.5, D3:L1-LS*2,
  E3:L1-LS*2.5, F3:L1-LS*3,   G3:L1-LS*3.5,
  A3:L1-LS*4,   B3:L1-LS*4.5, C4:L1-LS*5,
  D4:L1-LS*5.5, E4:L1-LS*6,
};

function getLedgers(noteKey: string, clef: Clef): number[] {
  const y = (clef === 'treble' ? TY : BY)[noteKey];
  if (y === undefined) return [];
  const lines: number[] = [];
  if (y > L1) { for (let ly = L1+LS; ly <= y; ly += LS) lines.push(ly); }
  else if (y < TOP_LINE_Y) { for (let ly = TOP_LINE_Y-LS; ly >= y; ly -= LS) lines.push(ly); }
  return lines;
}

// ─────────────────────────────────────────────────────────────────
// 調号（Key Signature）
// ─────────────────────────────────────────────────────────────────
type KeySig = 'C' | 'G' | 'D' | 'A' | 'E' | 'F' | 'Bb' | 'Eb';

// 各調で変化する音名 → 半音オフセット (+1=♯, -1=♭)
const KEY_SIG_MAP: Record<KeySig, Partial<Record<NoteName, number>>> = {
  C:  {},
  G:  { F: 1 },
  D:  { F: 1, C: 1 },
  A:  { F: 1, C: 1, G: 1 },
  E:  { F: 1, C: 1, G: 1, D: 1 },
  F:  { B: -1 },
  Bb: { B: -1, E: -1 },
  Eb: { B: -1, E: -1, A: -1 },
};

const SHARP_ORDER: NoteName[] = ['F','C','G','D','A','E','B'];
const FLAT_ORDER:  NoteName[] = ['B','E','A','D','G','C','F'];

// ト音記号の調号 Y座標 (TYマップに対応)
const TREBLE_SHARP_KS_Y: Partial<Record<NoteName,number>> = {
  F: L1-LS*4,    C: L1-LS*2.5,  G: L1-LS*4.5,
  D: L1-LS*3,    A: L1-LS*1.5,  E: L1-LS*3.5,  B: L1-LS*2,
};
const TREBLE_FLAT_KS_Y: Partial<Record<NoteName,number>> = {
  B: L1-LS*2,    E: L1,          A: L1-LS*1.5,
  D: L1-LS*3,    G: L1-LS,       C: L1-LS*2.5,  F: L1-LS*4,
};
// ヘ音記号の調号 Y座標 (BYマップに対応)
const BASS_SHARP_KS_Y: Partial<Record<NoteName,number>> = {
  F: L1-LS*3,    C: L1-LS*1.5,  G: L1-LS*3.5,
  D: L1-LS*2,    A: L1-LS/2,    E: L1-LS*2.5,  B: L1-LS,
};
const BASS_FLAT_KS_Y: Partial<Record<NoteName,number>> = {
  B: L1-LS,      E: L1-LS*2.5,  A: L1-LS/2,
  D: L1-LS*2,    G: L1,          C: L1-LS*1.5,  F: L1-LS*3,
};

// MIDI番号計算用ベース (octave 4)
const BASE_MIDI: Record<NoteName, number> = {
  C:60, D:62, E:64, F:65, G:67, A:69, B:71,
};

function playNoteAudioWithAcc(name: NoteName, acc: number): void {
  const midi = BASE_MIDI[name] + acc;
  const freq  = 440 * Math.pow(2, (midi - 69) / 12);
  const ctx = getAC(); if (!ctx) return;
  try {
    const go = () => tone(ctx, freq, ctx.currentTime);
    ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go();
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// 出題プール
// ─────────────────────────────────────────────────────────────────
interface NQ { note: string; name: NoteName; clef: Clef; natural?: boolean }
const mk = (notes: string[], clef: Clef): NQ[] =>
  notes.map(n => ({ note: n, name: n[0] as NoteName, clef }));

const TREBLE_STD: NQ[] = mk(['C4','D4','E4','F4','G4','A4','B4','C5'], 'treble');
const BASS_STD:   NQ[] = mk(['C3','D3','E3','F3','G3','A3','B3','C4'], 'bass');
const TREBLE_ADV: NQ[] = mk(
  ['E3','F3','G3','A3','B3', 'D5','E5','F5','G5','A5','B5','C6'], 'treble');
const BASS_ADV:   NQ[] = mk(
  ['C2','D2','E2','F2','G2','A2','B2', 'D4','E4'], 'bass');

const NOTE_BTNS: NoteName[] = ['C','D','E','F','G','A','B'];
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
function pickChordFrom(pool: string[], prev?: string): string {
  const arr = pool.filter(c => c !== prev);
  const src = arr.length > 0 ? arr : pool;
  return src[Math.floor(Math.random() * src.length)];
}

// ─────────────────────────────────────────────────────────────────
// Web Audio — モジュールレベルシングルトン（遅延生成）
// ─────────────────────────────────────────────────────────────────
type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };
let _ac: AudioContext | null = null;
const _activeOscs: Set<OscillatorNode> = new Set();

function getAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ac || _ac.state === 'closed') {
    try {
      const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
      _ac = AC ? new AC() : null;
    } catch { return null; }
  }
  return _ac;
}

/** コンポーネントアンマウント時にすべての音を即停止 */
function stopAllMusicAudio(): void {
  _activeOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch { /* already stopped */ } });
  _activeOscs.clear();
  if (_ac && _ac.state !== 'closed') _ac.suspend().catch(() => {});
}

/**
 * ピアノ風トーン: 5倍音 + 微デチューン + ADSR エンベロープ
 * dest を指定することでコンプレッサー経由の出力に対応
 */
function tone(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur = 1.6,
  vol = 0.34,
  dest: AudioNode = ctx.destination,
): void {
  const master = ctx.createGain();
  master.connect(dest);

  // ピアノ ADSR
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(vol,         t + 0.007);   // アタック 7ms
  master.gain.exponentialRampToValueAtTime(vol * 0.50, t + 0.14); // ディケイ
  master.gain.exponentialRampToValueAtTime(vol * 0.22, t + 0.65); // サスティン
  master.gain.exponentialRampToValueAtTime(0.0001,  t + dur);    // リリース

  // 倍音: [倍率, 相対音量, 波形, デチューン(セント)]
  const harmonics: [number, number, OscillatorType, number][] = [
    [1,    1.00, 'triangle',  0   ],  // 基音
    [2,    0.42, 'triangle',  1.5 ],  // 2倍音: +1.5セント（温かみ）
    [3,    0.16, 'sine',     -1.0 ],  // 3倍音
    [4,    0.06, 'sine',      2.0 ],  // 4倍音
    [5,    0.02, 'sine',     -1.5 ],  // 5倍音（鍵盤の明るさ）
  ];

  harmonics.forEach(([mult, relVol, waveType, detuneC]) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(master);
    osc.type          = waveType;
    osc.frequency.value = freq * mult;
    osc.detune.value  = detuneC;
    g.gain.setValueAtTime(relVol, t);
    g.gain.exponentialRampToValueAtTime(
      Math.max(relVol * 0.004, 0.0001),
      t + dur / Math.sqrt(mult),
    );
    _activeOscs.add(osc);
    osc.onended = () => _activeOscs.delete(osc);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
}

function playNoteAudio(noteKey: string): void {
  const f = FREQ[noteKey]; if (!f) return;
  const ctx = getAC(); if (!ctx) return;
  try {
    const go = () => tone(ctx, f, ctx.currentTime);
    ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go();
  } catch { /* ignore */ }
}

function playChordAudio(chord: string): void {
  const notes = CHORD_NOTES[chord]; if (!notes) return;
  const ctx = getAC(); if (!ctx) return;
  try {
    const go = () => {
      // コンプレッサーで音割れ防止（和音再生時）
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value      = 6;
      comp.ratio.value     = 5;
      comp.attack.value    = 0.003;
      comp.release.value   = 0.15;
      comp.connect(ctx.destination);
      const n = notes.length;
      notes.forEach(k => {
        const f = FREQ[k]; if (!f) return;
        tone(ctx, f, ctx.currentTime, 2.0, 0.28 / Math.sqrt(n), comp);
      });
    };
    ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go();
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// NoteStaff — SVG 五線譜描画（調号対応）
// ─────────────────────────────────────────────────────────────────
function NoteStaff({
  notes, clef, keySig = 'C', naturalNote = false,
}: {
  notes: string[]; clef: Clef; keySig?: KeySig; naturalNote?: boolean;
}) {
  const yMap    = clef === 'treble' ? TY : BY;
  const staffYs = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY = L1 - LS * 2;

  // 調号シンボル計算
  const acc      = KEY_SIG_MAP[keySig];
  const isSharp  = Object.values(acc).some(v => (v ?? 0) > 0);
  const isFlat   = Object.values(acc).some(v => (v ?? 0) < 0);
  const sigCount = Object.keys(acc).length;
  const ksSymbols: NoteName[] = isSharp
    ? SHARP_ORDER.slice(0, sigCount)
    : isFlat ? FLAT_ORDER.slice(0, sigCount) : [];
  const ksYMap = clef === 'treble'
    ? (isSharp ? TREBLE_SHARP_KS_Y : TREBLE_FLAT_KS_Y)
    : (isSharp ? BASS_SHARP_KS_Y   : BASS_FLAT_KS_Y);
  const KS_X0   = 55;
  const KS_STEP = isSharp ? 13 : 11;

  const ledgerSet = new Set<number>();
  notes.forEach(n => getLedgers(n, clef).forEach(y => ledgerSet.add(y)));

  const noteYs  = notes.map(n => yMap[n] ?? L1);
  const topY    = noteYs.length ? Math.min(...noteYs) : TOP_LINE_Y;
  const bottomY = noteYs.length ? Math.max(...noteYs) : L1;

  const stemUp    = bottomY > middleY;
  const stemX     = stemUp ? NOTE_X + NR - 0.5 : NOTE_X - NR + 0.5;
  const stemStart = stemUp ? bottomY : topY;
  const stemEnd   = stemUp ? topY - LS * 3.5 : bottomY + LS * 3.5;

  // 調号が五線上部に出る場合（G# etc）を考慮してvTopを広げる
  const ksMinY   = ksSymbols.length > 0
    ? Math.min(...ksSymbols.map(n => ksYMap[n] ?? TOP_LINE_Y))
    : TOP_LINE_Y;
  const PAD      = 22;
  const vTop     = Math.min(topY - PAD, TOP_LINE_Y - PAD, ksMinY - 18);
  const vBottom  = Math.max(bottomY + PAD, L1 + PAD);
  const vH       = vBottom - vTop;

  return (
    <svg viewBox={`0 ${vTop} 280 ${vH}`} className="w-full"
      style={{ userSelect:'none' }} aria-hidden="true">

      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={40} x2={266} y1={y} y2={y} stroke="#111827" strokeWidth="1.4" />
      ))}

      {/* 音部記号 */}
      <text
        x={clef === 'treble' ? 13 : 18}
        y={clef === 'treble' ? L1+12 : L1-LS*1.5+4}
        fontSize={clef === 'treble' ? 72 : 46}
        fill="#111827"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >{clef === 'treble' ? '𝄞' : '𝄢'}</text>

      {/* 調号シンボル */}
      {ksSymbols.map((noteName, i) => {
        const ky = ksYMap[noteName];
        if (ky === undefined) return null;
        const kx = KS_X0 + i * KS_STEP;
        return (
          <text key={noteName} x={kx} y={ky}
            fontSize={isSharp ? 17 : 19}
            fill="#111827"
            fontFamily="'Segoe UI Symbol','FreeSerif','Times New Roman',serif"
            dominantBaseline="middle"
            textAnchor="middle"
          >{isSharp ? '♯' : '♭'}</text>
        );
      })}

      {/* 加線 */}
      {[...ledgerSet].map(y => (
        <line key={`l${y}`}
          x1={NOTE_X-NR*2.6} x2={NOTE_X+NR*2.6} y1={y} y2={y}
          stroke="#111827" strokeWidth="1.5" />
      ))}

      {/* 符幹 */}
      {notes.length > 0 && (
        <line x1={stemX} x2={stemX} y1={stemStart} y2={stemEnd}
          stroke="#111827" strokeWidth="1.6" />
      )}

      {/* ナチュラル記号（臨時記号） */}
      {naturalNote && notes.length > 0 && (() => {
        const ny = yMap[notes[0]];
        if (ny === undefined) return null;
        return (
          <text x={NOTE_X - NR*2.4} y={ny}
            fontSize={18} fill="#111827"
            fontFamily="'Segoe UI Symbol','FreeSerif','Times New Roman',serif"
            dominantBaseline="middle" textAnchor="middle"
          >♮</text>
        );
      })()}

      {/* 音符 */}
      {notes.map(n => {
        const y = yMap[n]; if (y === undefined) return null;
        return (
          <ellipse key={n} cx={NOTE_X} cy={y} rx={NR} ry={NY}
            fill="#111827" transform={`rotate(-12,${NOTE_X},${y})`} />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// MusicLearning — メインコンポーネント
// ─────────────────────────────────────────────────────────────────
const MODE_TABS: { id: LernMode; label: string; sub: string }[] = [
  { id:'kiso',      label:'🎹 基礎',    sub:'ドレミ・音名' },
  { id:'note',      label:'🎵 標準',    sub:'五線譜' },
  { id:'advanced',  label:'🌟 発展',    sub:'加線' },
  { id:'chord',     label:'🎼 コード',  sub:'和音' },
  { id:'sightread', label:'👁️ スラスラ',   sub:'Sight-Read' },
  { id:'chordread', label:'🎹 コード読み', sub:'Chords' },
];

export function MusicLearning() {
  const [mode,       setMode]       = useState<LernMode>('kiso');
  const [kisoDir,    setKisoDir]    = useState<KisoDir>('ja-en');
  const [clefOpt,    setClefOpt]    = useState<ClefOpt>('treble');
  const [question,   setQuestion]   = useState<NQ | null>(null);
  const [kisoQ,      setKisoQ]      = useState<NoteName | null>(null);
  const [chord,      setChord]      = useState<string | null>(null);
  const [chordLevel, setChordLevel] = useState<ChordLevel>(1);
  const [verdict,    setVerdict]    = useState<Verdict>(null);
  const [locked,     setLocked]     = useState(false);
  const [correct,    setCorrect]    = useState(0);
  const [total,      setTotal]      = useState(0);
  const [keySig,     setKeySig]     = useState<KeySig>('C');

  const prevNoteRef  = useRef<string | undefined>(undefined);
  const prevKisoRef  = useRef<NoteName | undefined>(undefined);
  const prevChordRef = useRef<string | undefined>(undefined);

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
    setVerdict(null); setLocked(false);

    if (mode === 'kiso') {
      const n = pickKiso(prevKisoRef.current);
      prevKisoRef.current = n;
      setKisoQ(n); setQuestion(null); setChord(null);
    } else if (mode === 'chord') {
      const pool = CHORD_LEVELS[chordLevel - 1];
      const c = pickChordFrom(pool, prevChordRef.current);
      prevChordRef.current = c;
      setChord(c); setQuestion(null); setKisoQ(null);
    } else {
      const base = pickNQ(getPool(), prevNoteRef.current);
      // 調号で変化する音に対して25%の確率でナチュラル記号を出題
      const hasAcc = (KEY_SIG_MAP[keySig][base.name] ?? 0) !== 0;
      const natural = hasAcc && Math.random() < 0.25;
      const q: NQ = { ...base, natural };
      prevNoteRef.current = q.note;
      setQuestion(q); setKisoQ(null); setChord(null);
    }
  }, [mode, chordLevel, getPool, keySig]);

  // アンマウント時に全音源を停止・AudioContextをsuspend
  useEffect(() => () => stopAllMusicAudio(), []);

  // 問題切替（音の自動再生なし — ユーザーの明示タップ時のみ鳴らす）
  useEffect(() => { newQuestion(); }, [newQuestion]);

  // chordLevel 変更時にリセット
  const handleChordLevel = (lv: ChordLevel) => {
    prevChordRef.current = undefined;
    setChordLevel(lv);
    setCorrect(0); setTotal(0);
  };

  const handleNoteAnswer = useCallback((name: NoteName) => {
    const target = mode === 'kiso' ? kisoQ : question?.name;
    if (!target) return;
    // 調号に応じた音高で発音（ナチュラルの場合は素の音）
    const pressAcc = (mode === 'kiso' || question?.natural)
      ? 0
      : (KEY_SIG_MAP[keySig][name] ?? 0);
    playNoteAudioWithAcc(name, pressAcc);
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

  const handleChordAnswer = useCallback((c: string) => {
    if (!chord) return;
    playChordAudio(c); // タップ即座に和音発音
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

  const handleKeySig = (k: KeySig) => {
    setKeySig(k);
    setCorrect(0); setTotal(0);
  };

  const replay = () => {
    if (mode === 'kiso' && kisoQ) {
      playNoteAudio(`${kisoQ}4`);
    } else if ((mode === 'note' || mode === 'advanced') && question) {
      const replayAcc = question.natural ? 0 : (KEY_SIG_MAP[keySig][question.name] ?? 0);
      // 正確な音域（question.noteのオクターブ）で再生
      const octave = parseInt(question.note.slice(-1));
      const midi = BASE_MIDI[question.name] + (octave - 4) * 12 + replayAcc;
      const freq  = 440 * Math.pow(2, (midi - 69) / 12);
      const ctx = getAC();
      if (ctx) {
        const go = () => tone(ctx, freq, ctx.currentTime);
        ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go();
      }
    } else if (mode === 'chord' && chord) {
      playChordAudio(chord);
    }
  };

  const staffNotes  = (mode === 'note' || mode === 'advanced') && question
    ? [question.note]
    : mode === 'chord' && chord
    ? (CHORD_NOTES[chord] ?? [])
    : [];
  const staffClef   = mode === 'chord' ? 'treble' : (question?.clef ?? 'treble');
  const accuracy    = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isNoteMode  = mode !== 'chord';
  const showClef    = mode === 'note' || mode === 'advanced';

  const changeMode = (m: LernMode) => { setMode(m); setCorrect(0); setTotal(0); };
  const changeClef = (c: ClefOpt)  => { setClefOpt(c); setCorrect(0); setTotal(0); };

  const kisoDisplayText = kisoQ ? (kisoDir === 'ja-en' ? NOTE_JP[kisoQ] : kisoQ) : '…';
  const kisoDisplaySub  = kisoDir === 'ja-en'
    ? 'このカタカナのアルファベット名は？'
    : 'この音名をカタカナで選んでください';

  // 回答ボタンのラベル（調号・ナチュラルを反映）
  const btnLabel = (name: NoteName): string => {
    if (mode === 'kiso') return kisoDir === 'en-ja' ? NOTE_JP[name] : name;
    // 調号モードでナチュラル問題: 該当音のみ ♮ 表示
    if (question?.natural && question.name === name) return `${name}♮`;
    const a = KEY_SIG_MAP[keySig][name];
    if (!a) return name;
    return a > 0 ? `${name}#` : `${name}♭`;
  };
  const kisoBtnLabel = (name: NoteName) => btnLabel(name);

  return (
    <div className="flex flex-col gap-3 pb-28 max-w-md mx-auto px-4">

      {/* ── モードタブ ── */}
      <div className="grid grid-cols-6 gap-0.5 bg-gray-100 p-1 rounded-2xl">
        {MODE_TABS.map(({ id, label, sub }) => (
          <button key={id} onClick={() => changeMode(id)}
            className={`py-2 px-0 rounded-xl text-center transition-all ${
              mode === id
                ? id === 'sightread' ? 'bg-purple-600 text-white shadow-md'
                  : id === 'chordread' ? 'bg-teal-600 text-white shadow-md'
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

      {mode === 'sightread' && <SightReading />}
      {mode === 'chordread' && <ChordReading />}

      {mode !== 'sightread' && mode !== 'chordread' && <>

      {/* ── 基礎モード：出題方向 ── */}
      {mode === 'kiso' && (
        <div className="flex gap-1.5">
          <button onClick={() => { setKisoDir('ja-en'); setCorrect(0); setTotal(0); }}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              kisoDir === 'ja-en' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            ド→C（カタカナ→英語）
          </button>
          <button onClick={() => { setKisoDir('en-ja'); setCorrect(0); setTotal(0); }}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              kisoDir === 'en-ja' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            C→ド（英語→カタカナ）
          </button>
        </div>
      )}

      {/* ── コードモード：レベル選択 ── */}
      {mode === 'chord' && (
        <div className="grid grid-cols-4 gap-1">
          {([1,2,3,4] as ChordLevel[]).map(lv => (
            <button key={lv} onClick={() => handleChordLevel(lv)}
              className={`py-2 rounded-xl text-center border-2 transition-all ${
                chordLevel === lv
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>
              <div className="text-[10px] font-black leading-tight">Lv{lv}</div>
              <div className={`text-[8px] leading-none mt-0.5 ${chordLevel === lv ? 'text-white/70' : 'text-gray-400'}`}>
                {CHORD_LEVEL_LABELS[lv-1].sub}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 音部記号選択（標準・発展モード） ── */}
      {showClef && (
        <div className="flex gap-1.5">
          {(['treble','bass','mix'] as ClefOpt[]).map(c => (
            <button key={c} onClick={() => changeClef(c)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                clefOpt === c ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {c === 'treble' ? '𝄞 ト音記号' : c === 'bass' ? '𝄢 ヘ音記号' : '🔀 ミックス'}
            </button>
          ))}
        </div>
      )}

      {/* ── 調号選択（標準・発展モード） ── */}
      {showClef && (
        <div>
          <p className="text-[9px] font-black text-gray-700 mb-1 tracking-widest uppercase">🎼 調号 (Key Signature)</p>
          <div className="grid grid-cols-8 gap-0.5">
            {(['C','G','D','A','E','F','Bb','Eb'] as KeySig[]).map(k => {
              const n = KEY_SIG_MAP[k];
              const cnt = Object.keys(n).length;
              const isS = Object.values(n).some(v => (v ?? 0) > 0);
              const sub = cnt === 0 ? '' : isS ? `${cnt}♯` : `${cnt}♭`;
              return (
                <button key={k} onClick={() => handleKeySig(k)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    keySig === k
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-800 hover:bg-amber-50'
                  }`}>
                  <span className="block text-[11px] font-black leading-tight">{k}</span>
                  <span className={`block text-[7px] font-bold leading-none ${keySig === k ? 'text-white/80' : 'text-gray-500'}`}>{sub || '♮'}</span>
                </button>
              );
            })}
          </div>
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
            }`}>{kisoDisplayText}</span>
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
          <NoteStaff
            notes={staffNotes}
            clef={staffClef}
            keySig={(mode === 'note' || mode === 'advanced') ? keySig : 'C'}
            naturalNote={question?.natural ?? false}
          />
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

      {/* ── 再生 ── */}
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
        <div className={`grid gap-1.5 ${
          mode === 'kiso' && kisoDir === 'en-ja' ? 'grid-cols-4' : 'grid-cols-7'
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
        /* コード回答ボタン — レベル別プール */
        <div className="grid grid-cols-3 gap-2">
          {CHORD_LEVELS[chordLevel - 1].map(c => {
            const isAnswer = chord === c;
            const showHint = verdict === 'wrong'   && isAnswer;
            const showWin  = verdict === 'correct' && isAnswer;
            return (
              <button key={c} onClick={() => handleChordAnswer(c)}
                disabled={verdict === 'correct'}
                className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
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

      </>}
    </div>
  );
}
