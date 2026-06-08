'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────
type NoteName  = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type ChordName = 'C' | 'Dm' | 'Em' | 'F' | 'G' | 'Am';
type Clef      = 'treble' | 'bass';
type LernMode  = 'note' | 'chord';
type ClefOpt   = 'treble' | 'bass' | 'mix';
type Verdict   = 'correct' | 'wrong' | null;

// ─────────────────────────────────────────────────────────────────
// 周波数テーブル
// ─────────────────────────────────────────────────────────────────
const FREQ: Record<string, number> = {
  C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, B2:123.47,
  C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196.00,A3:220.00,B3:246.94,
  C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,
  C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880.00,B5:987.77,
  C6:1046.50,
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
const LS      = 14;   // 線間隔 (px)
const L1      = 106;  // 第1線（最下線）の Y 座標
const NR      = 6.5;  // 符頭 楕円 rx
const NY      = 4.7;  // 符頭 楕円 ry
const NOTE_X  = 180;  // 音符の X 位置

// ト音記号：音名→Y座標 (C4〜C6)
const TY: Record<string, number> = {
  C4: L1 + LS,        D4: L1 + LS/2,    E4: L1,
  F4: L1 - LS/2,      G4: L1 - LS,      A4: L1 - LS*1.5,
  B4: L1 - LS*2,      C5: L1 - LS*2.5,  D5: L1 - LS*3,
  E5: L1 - LS*3.5,    F5: L1 - LS*4,    G5: L1 - LS*4.5,
  A5: L1 - LS*5,      B5: L1 - LS*5.5,  C6: L1 - LS*6,
};

// ヘ音記号：音名→Y座標 (C2〜C4)
const BY: Record<string, number> = {
  C2: L1 + LS*2,      D2: L1 + LS*1.5,  E2: L1 + LS,
  F2: L1 + LS/2,      G2: L1,           A2: L1 - LS/2,
  B2: L1 - LS,        C3: L1 - LS*1.5,  D3: L1 - LS*2,
  E3: L1 - LS*2.5,    F3: L1 - LS*3,    G3: L1 - LS*3.5,
  A3: L1 - LS*4,      B3: L1 - LS*4.5,  C4: L1 - LS*5,
};

// 加線が必要な音符
function getLedgers(noteKey: string, clef: Clef): number[] {
  if (clef === 'treble') {
    if (noteKey === 'C4')               return [TY.C4];
    if (noteKey === 'A5')               return [TY.A5];
    if (noteKey === 'B5')               return [TY.A5];
    if (noteKey === 'C6')               return [TY.A5, TY.C6];
  } else {
    if (noteKey === 'E2')               return [BY.E2];
    if (noteKey === 'D2')               return [BY.E2];
    if (noteKey === 'C2')               return [BY.E2, BY.C2];
    if (noteKey === 'C4')               return [BY.C4];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────
// 出題データ
// ─────────────────────────────────────────────────────────────────
interface NQ { note: string; name: NoteName; clef: Clef }

const TREBLE_POOL: NQ[] = [
  'C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5','C6'
].map(n => ({ note: n, name: n[0] as NoteName, clef: 'treble' as Clef }));

const BASS_POOL: NQ[] = [
  'C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4'
].map(n => ({ note: n, name: n[0] as NoteName, clef: 'bass' as Clef }));

const CHORD_LIST: ChordName[] = ['C','Dm','Em','F','G','Am'];
const NOTE_BTNS: NoteName[]   = ['C','D','E','F','G','A','B'];
const NOTE_JP: Record<NoteName, string> = { C:'ド', D:'レ', E:'ミ', F:'ファ', G:'ソ', A:'ラ', B:'シ' };

function pickNote(pool: NQ[], prev?: string): NQ {
  const arr = pool.filter(n => n.note !== prev);
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickChord(prev?: ChordName): ChordName {
  const arr = CHORD_LIST.filter(c => c !== prev);
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────
// Web Audio エンジン（都度 AudioContext を生成 → 既存タイマーと競合しない）
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
  g1.gain.linearRampToValueAtTime(vol, t + 0.008);
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
// NoteStaff — SVG 五線譜描画
// ─────────────────────────────────────────────────────────────────
function NoteStaff({ notes, clef }: { notes: string[]; clef: Clef }) {
  const yMap      = clef === 'treble' ? TY : BY;
  const staffYs   = [L1, L1-LS, L1-LS*2, L1-LS*3, L1-LS*4];
  const middleY   = L1 - LS * 2; // 第3線（B4/D3）

  // 加線セット
  const ledgerSet = new Set<number>();
  notes.forEach(n => getLedgers(n, clef).forEach(y => ledgerSet.add(y)));

  // 最高・最低音符の Y
  const noteYs    = notes.map(n => yMap[n] ?? L1);
  const topY      = noteYs.length ? Math.min(...noteYs) : L1;
  const bottomY   = noteYs.length ? Math.max(...noteYs) : L1;

  // 符尾方向：第3線より下（y大）→ 上向き
  const stemUp    = bottomY > middleY;
  const stemX     = stemUp ? NOTE_X + NR - 0.5 : NOTE_X - NR + 0.5;
  const stemStart = stemUp ? bottomY : topY;
  const stemEnd   = stemUp
    ? Math.max(topY - LS * 3.5,  8)
    : Math.min(bottomY + LS * 3.5, 145);

  return (
    <svg
      viewBox="0 0 280 152"
      className="w-full"
      style={{ maxHeight: 152, userSelect: 'none' }}
      aria-hidden="true"
    >
      {/* 五線 */}
      {staffYs.map(y => (
        <line key={y} x1={40} x2={266} y1={y} y2={y}
          stroke="#374151" strokeWidth="1.2" />
      ))}

      {/* 音部記号（Unicode Musical Symbols） */}
      <text
        x={clef === 'treble' ? 13 : 18}
        y={clef === 'treble' ? L1 + 12 : L1 - LS * 1.5 + 4}
        fontSize={clef === 'treble' ? 72 : 46}
        fill="#374151"
        fontFamily="'Segoe UI Symbol','Segoe UI Historic','Apple Symbols','FreeSerif','Times New Roman',serif"
      >
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>

      {/* 加線 */}
      {[...ledgerSet].map(y => (
        <line key={`l${y}`}
          x1={NOTE_X - NR * 2.4} x2={NOTE_X + NR * 2.4}
          y1={y} y2={y}
          stroke="#374151" strokeWidth="1.3" />
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
export function MusicLearning() {
  const [mode,     setMode]     = useState<LernMode>('note');
  const [clefOpt,  setClefOpt]  = useState<ClefOpt>('treble');
  const [question, setQuestion] = useState<NQ | null>(null);
  const [chord,    setChord]    = useState<ChordName | null>(null);
  const [verdict,  setVerdict]  = useState<Verdict>(null);
  const [locked,   setLocked]   = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [total,    setTotal]    = useState(0);

  const prevNoteRef  = useRef<string | undefined>(undefined);
  const prevChordRef = useRef<ChordName | undefined>(undefined);

  const newQuestion = useCallback(() => {
    if (mode === 'note') {
      const pool = clefOpt === 'treble' ? TREBLE_POOL
                 : clefOpt === 'bass'   ? BASS_POOL
                 : [...TREBLE_POOL, ...BASS_POOL];
      const q = pickNote(pool, prevNoteRef.current);
      prevNoteRef.current = q.note;
      setQuestion(q);
      setChord(null);
      setTimeout(() => playNoteAudio(q.note), 180);
    } else {
      const c = pickChord(prevChordRef.current);
      prevChordRef.current = c;
      setChord(c);
      setQuestion(null);
      setTimeout(() => playChordAudio(c), 180);
    }
    setVerdict(null);
    setLocked(false);
  }, [mode, clefOpt]);

  // mode / clefOpt 変更時に新問題を生成
  useEffect(() => { newQuestion(); }, [newQuestion]);

  // ── 単音回答 ──────────────────────────────────────────────────
  const handleNoteAnswer = useCallback((name: NoteName) => {
    if (!question) return;
    // 押したボタンの音を鳴らす（正誤に関わらず）
    playNoteAudio(`${name}4`);
    const ok = name === question.name;

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
      // ロック中：正解したら進む（スコアには加算しない）
      if (ok) {
        setVerdict('correct');
        setTimeout(newQuestion, 900);
      } else {
        setVerdict('wrong');
        setTimeout(() => setVerdict(null), 800);
      }
    }
  }, [question, locked, newQuestion]);

  // ── 和音回答 ──────────────────────────────────────────────────
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
      if (ok) {
        setVerdict('correct');
        setTimeout(newQuestion, 1000);
      } else {
        setVerdict('wrong');
        setTimeout(() => setVerdict(null), 800);
      }
    }
  }, [chord, locked, newQuestion]);

  const replay = () => {
    if (mode === 'note' && question) playNoteAudio(question.note);
    if (mode === 'chord' && chord)   playChordAudio(chord);
  };

  // 表示する音符
  const staffNotes = mode === 'note' && question
    ? [question.note]
    : mode === 'chord' && chord
    ? CHORD_NOTES[chord]
    : [];
  const staffClef = mode === 'chord' ? 'treble' : (question?.clef ?? 'treble');
  const accuracy  = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 pb-6 max-w-md mx-auto px-4">

      {/* ── モード切り替え ── */}
      <div className="flex gap-2">
        {(['note', 'chord'] as LernMode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setCorrect(0); setTotal(0); }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {m === 'note' ? '🎵 単音モード' : '🎼 コードモード'}
          </button>
        ))}
      </div>

      {/* ── 音部記号選択（単音モード時のみ） ── */}
      {mode === 'note' && (
        <div className="flex gap-1.5">
          {(['treble', 'bass', 'mix'] as ClefOpt[]).map(c => (
            <button key={c} onClick={() => { setClefOpt(c); setCorrect(0); setTotal(0); }}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                clefOpt === c
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {c === 'treble' ? 'ト音記号' : c === 'bass' ? 'ヘ音記号' : 'ミックス'}
            </button>
          ))}
        </div>
      )}

      {/* ── 五線譜カード ── */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-2 select-none">
        <NoteStaff notes={staffNotes} clef={staffClef} />

        {/* 正誤オーバーレイ */}
        {verdict && (
          <div className={`absolute inset-0 flex items-center justify-end pr-8 rounded-2xl pointer-events-none ${
            verdict === 'correct' ? 'bg-emerald-500/15' : 'bg-red-500/15'
          }`}>
            <span className={`text-6xl font-black drop-shadow ${
              verdict === 'correct' ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {verdict === 'correct' ? '◯' : '✕'}
            </span>
          </div>
        )}
      </div>

      {/* ── 再生 / ロック中メッセージ ── */}
      <div className="flex items-center gap-3 min-h-[32px]">
        <button onClick={replay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all">
          🔊 再生
        </button>
        {locked && verdict === null && (
          <p className="text-xs text-red-600 font-semibold">
            正解するまで次へ進めません！
          </p>
        )}
      </div>

      {/* ── 回答ボタン ── */}
      {mode === 'note' ? (
        <div className="grid grid-cols-7 gap-1">
          {NOTE_BTNS.map(name => {
            const isAnswer = question?.name === name;
            const showHint = verdict === 'wrong' && isAnswer;
            return (
              <button key={name} onClick={() => handleNoteAnswer(name)}
                disabled={verdict === 'correct'}
                className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                  showHint
                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                    : verdict === 'correct' && isAnswer
                    ? 'bg-emerald-500 text-white shadow-md'
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
        <div className="grid grid-cols-3 gap-2">
          {CHORD_LIST.map(c => {
            const isAnswer = chord === c;
            const showHint = verdict === 'wrong' && isAnswer;
            return (
              <button key={c} onClick={() => handleChordAnswer(c)}
                disabled={verdict === 'correct'}
                className={`py-3 rounded-xl font-black text-base transition-all active:scale-95 ${
                  showHint
                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                    : verdict === 'correct' && isAnswer
                    ? 'bg-emerald-500 text-white shadow-md'
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
