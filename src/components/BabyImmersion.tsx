'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Level 1 — Vocabulary dataset
// ─────────────────────────────────────────────────────────────────
interface VocabItem {
  word:  string;
  emoji: string;
}

const VOCAB: VocabItem[] = [
  // Food
  { word: 'Apple',      emoji: '🍎' },
  { word: 'Banana',     emoji: '🍌' },
  { word: 'Orange',     emoji: '🍊' },
  { word: 'Strawberry', emoji: '🍓' },
  { word: 'Grape',      emoji: '🍇' },
  { word: 'Bread',      emoji: '🍞' },
  { word: 'Pizza',      emoji: '🍕' },
  { word: 'Rice',       emoji: '🍚' },
  { word: 'Egg',        emoji: '🥚' },
  { word: 'Milk',       emoji: '🥛' },
  { word: 'Cake',       emoji: '🎂' },
  { word: 'Cookie',     emoji: '🍪' },
  // Animals
  { word: 'Dog',        emoji: '🐶' },
  { word: 'Cat',        emoji: '🐱' },
  { word: 'Bird',       emoji: '🐦' },
  { word: 'Fish',       emoji: '🐟' },
  { word: 'Rabbit',     emoji: '🐰' },
  { word: 'Bear',       emoji: '🐻' },
  { word: 'Lion',       emoji: '🦁' },
  { word: 'Monkey',     emoji: '🐵' },
  { word: 'Elephant',   emoji: '🐘' },
  { word: 'Frog',       emoji: '🐸' },
  // Vehicles
  { word: 'Car',        emoji: '🚗' },
  { word: 'Bus',        emoji: '🚌' },
  { word: 'Train',      emoji: '🚂' },
  { word: 'Airplane',   emoji: '✈️' },
  { word: 'Bicycle',    emoji: '🚲' },
  { word: 'Boat',       emoji: '⛵' },
  // Things / Places
  { word: 'House',      emoji: '🏠' },
  { word: 'Book',       emoji: '📚' },
  { word: 'Ball',       emoji: '⚽' },
  { word: 'Sun',        emoji: '☀️' },
  { word: 'Moon',       emoji: '🌙' },
  { word: 'Star',       emoji: '⭐' },
  { word: 'Tree',       emoji: '🌳' },
  { word: 'Flower',     emoji: '🌸' },
  { word: 'Heart',      emoji: '❤️' },
  { word: 'Music',      emoji: '🎵' },
];

// ─────────────────────────────────────────────────────────────────
// Level 2 — Simple Sentences dataset
// ─────────────────────────────────────────────────────────────────
interface SentenceItem {
  sentence: string;
  answer:   string;   // correct emoji combo
  choices:  string[]; // 4 emoji combos (includes answer)
}

const SENTENCES: SentenceItem[] = [
  {
    sentence: 'The dog is sleeping.',
    answer:   '🐶💤',
    choices:  ['🐶💤', '🐶🏃', '🐱💤', '🐶🍎'],
  },
  {
    sentence: 'I am eating an apple.',
    answer:   '😋🍎',
    choices:  ['😋🍎', '😋🍌', '😴🍎', '🍎🚗'],
  },
  {
    sentence: 'The cat is running.',
    answer:   '🐱🏃',
    choices:  ['🐱🏃', '🐱💤', '🐶🏃', '🐱🍎'],
  },
  {
    sentence: 'She is drinking milk.',
    answer:   '😊🥛',
    choices:  ['😊🥛', '😊🍎', '😴🥛', '🥛🐶'],
  },
  {
    sentence: 'The bird is flying.',
    answer:   '🐦✈️',
    choices:  ['🐦✈️', '🐦💤', '🐶✈️', '🐦🍎'],
  },
  {
    sentence: 'I am reading a book.',
    answer:   '😊📚',
    choices:  ['😊📚', '😊🎵', '😴📚', '📚🐶'],
  },
  {
    sentence: 'The baby is sleeping.',
    answer:   '👶💤',
    choices:  ['👶💤', '👶🏃', '👶🍎', '🐶💤'],
  },
  {
    sentence: 'We are playing music.',
    answer:   '🎵🎉',
    choices:  ['🎵🎉', '🎵💤', '🎵🍎', '📚🎉'],
  },
  {
    sentence: 'The lion is eating.',
    answer:   '🦁😋',
    choices:  ['🦁😋', '🦁💤', '🐶😋', '🦁🚗'],
  },
  {
    sentence: 'I am going to school.',
    answer:   '🎒🏫',
    choices:  ['🎒🏫', '🎒🏠', '🎒🍎', '📚🏫'],
  },
  {
    sentence: 'The sun is shining.',
    answer:   '☀️😊',
    choices:  ['☀️😊', '🌙😊', '☀️💤', '⭐😊'],
  },
  {
    sentence: 'She is singing a song.',
    answer:   '🎤🎵',
    choices:  ['🎤🎵', '🎤📚', '🎵💤', '🎤🍎'],
  },
  {
    sentence: 'The rabbit is jumping.',
    answer:   '🐰⬆️',
    choices:  ['🐰⬆️', '🐰💤', '🐶⬆️', '🐰🍎'],
  },
  {
    sentence: 'I love you.',
    answer:   '😊❤️',
    choices:  ['😊❤️', '😴❤️', '😊⭐', '❤️🐶'],
  },
  {
    sentence: 'It is raining.',
    answer:   '🌧️💧',
    choices:  ['🌧️💧', '☀️💧', '🌧️😊', '💧🐶'],
  },
];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string, onEnd?: () => void, rate = 0.88): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-US';
  utt.rate   = rate;
  utt.pitch  = 1.1;
  utt.volume = 1.0;
  if (onEnd) utt.onend = onEnd;
  setTimeout(() => window.speechSynthesis.speak(utt), 80);
}

// ─────────────────────────────────────────────────────────────────
// Level 1 — Vocabulary Quiz
// ─────────────────────────────────────────────────────────────────
interface VocabQuiz {
  correct:  VocabItem;
  choices:  VocabItem[];
}

function buildVocabQuiz(prevWord?: string): VocabQuiz {
  const pool    = VOCAB.filter(v => v.word !== prevWord);
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const others  = shuffle(VOCAB.filter(v => v.word !== correct.word)).slice(0, 3);
  return { correct, choices: shuffle([correct, ...others]) };
}

function VocabLevel({ onScore }: { onScore: (ok: boolean) => void }) {
  const [quiz,      setQuiz]      = useState<VocabQuiz>(() => buildVocabQuiz());
  const [result,    setResult]    = useState<'correct' | 'wrong' | null>(null);
  const [locked,    setLocked]    = useState(false);
  const [speaking,  setSpeaking]  = useState(false);
  const prevWordRef = useRef<string | undefined>(undefined);

  const playWord = useCallback(() => {
    setSpeaking(true);
    speak(quiz.correct.word, () => setSpeaking(false));
  }, [quiz]);

  // Auto-play on mount and new question
  useEffect(() => { playWord(); }, [quiz.correct.word]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    prevWordRef.current = quiz.correct.word;
    setQuiz(buildVocabQuiz(prevWordRef.current));
    setResult(null);
    setLocked(false);
  }, [quiz]);

  const handleTap = (item: VocabItem) => {
    if (locked) return;
    const ok = item.word === quiz.correct.word;
    onScore(ok);
    if (ok) {
      setResult('correct');
      setLocked(true);
      setTimeout(next, 1200);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Word display + Listen button */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which one is it?</p>
        <button onClick={playWord}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-lg transition-all active:scale-95 ${
            speaking
              ? 'bg-blue-500 text-white animate-pulse shadow-md'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          }`}>
          <span className="text-2xl">🔊</span>
          <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
        </button>
        {result === 'correct' && (
          <p className="text-emerald-600 font-black text-base animate-bounce">✓ Correct!</p>
        )}
        {result === 'wrong' && (
          <p className="text-red-500 font-black text-base">Try again!</p>
        )}
      </div>

      {/* 2×2 emoji grid */}
      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(item => (
          <button key={item.word} onClick={() => handleTap(item)}
            className={`py-6 rounded-2xl text-6xl flex items-center justify-center border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && item.word === quiz.correct.word
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}>
            {item.emoji}
          </button>
        ))}
      </div>

      <button onClick={next}
        className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all active:scale-95">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Level 2 — Simple Sentence Quiz
// ─────────────────────────────────────────────────────────────────
function buildSentenceQuiz(prevSentence?: string): SentenceItem {
  const pool = SENTENCES.filter(s => s.sentence !== prevSentence);
  return pool[Math.floor(Math.random() * pool.length)];
}

function SentenceLevel({ onScore }: { onScore: (ok: boolean) => void }) {
  const [quiz,     setQuiz]     = useState<SentenceItem>(() => buildSentenceQuiz());
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevRef = useRef<string | undefined>(undefined);

  const playSentence = useCallback(() => {
    setSpeaking(true);
    speak(quiz.sentence, () => setSpeaking(false), 0.80);
  }, [quiz]);

  useEffect(() => { playSentence(); }, [quiz.sentence]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    prevRef.current = quiz.sentence;
    setQuiz(buildSentenceQuiz(prevRef.current));
    setResult(null);
    setLocked(false);
  }, [quiz]);

  const handleTap = (choice: string) => {
    if (locked) return;
    const ok = choice === quiz.answer;
    onScore(ok);
    if (ok) {
      setResult('correct');
      setLocked(true);
      setTimeout(next, 1300);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Sentence + Listen */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which picture matches?</p>
        <button onClick={playSentence}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking
              ? 'bg-indigo-500 text-white animate-pulse shadow-md'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}>
          <span className="text-2xl">🔊</span>
          <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
        </button>
        {result === 'correct' && (
          <p className="text-emerald-600 font-black text-base animate-bounce">✓ Correct!</p>
        )}
        {result === 'wrong' && (
          <p className="text-red-500 font-black text-base">Try again!</p>
        )}
      </div>

      {/* 2×2 emoji-combo grid */}
      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(choice => (
          <button key={choice} onClick={() => handleTap(choice)}
            className={`py-5 rounded-2xl text-4xl flex items-center justify-center gap-1 border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
            }`}>
            {choice}
          </button>
        ))}
      </div>

      <button onClick={next}
        className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all active:scale-95">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — root component
// ─────────────────────────────────────────────────────────────────
type Level = 1 | 2;

export function BabyImmersion() {
  const [level,   setLevel]   = useState<Level>(1);
  const [correct, setCorrect] = useState(0);
  const [total,   setTotal]   = useState(0);

  const onScore = (ok: boolean) => {
    setTotal(t => t + 1);
    if (ok) setCorrect(c => c + 1);
  };

  const switchLevel = (l: Level) => {
    window.speechSynthesis?.cancel();
    setLevel(l);
    setCorrect(0);
    setTotal(0);
  };

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* ── Header ── */}
      <div className="text-center pt-1">
        <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Baby Immersion Mode</p>
        <p className="text-[10px] text-gray-300 mt-0.5">Learn English like a native child 🌱</p>
      </div>

      {/* ── Level toggle ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          [1, '🧩', 'Vocabulary',       'Emoji → Word'],
          [2, '💬', 'Simple Sentences', 'Listen & Match'],
        ] as [Level, string, string, string][]).map(([lv, icon, label, sub]) => (
          <button key={lv} onClick={() => switchLevel(lv)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              level === lv
                ? lv === 1
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{icon} {label}</span>
            <span className={`block text-[9px] mt-0.5 ${level === lv ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── Quiz content ── */}
      {level === 1
        ? <VocabLevel    onScore={onScore} />
        : <SentenceLevel onScore={onScore} />
      }

      {/* ── Score ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Accuracy</span>
          <span className="text-base font-black text-blue-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{correct} / {total} correct</span>
        <button onClick={() => { setCorrect(0); setTotal(0); }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
          Reset
        </button>
      </div>

    </div>
  );
}
