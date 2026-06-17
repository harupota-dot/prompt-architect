'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Growth Level definitions
// ─────────────────────────────────────────────────────────────────
interface GrowthLevel {
  level:    number;
  title:    string;
  emoji:    string;
  color:    string;   // Tailwind gradient
  badge:    string;   // Tailwind badge bg
  scoreReq: number;   // cumulative correct answers required
}

const GROWTH_LEVELS: GrowthLevel[] = [
  { level: 1, title: 'Baby',        emoji: '👶', color: 'from-blue-400 to-cyan-400',      badge: 'bg-blue-100 text-blue-700',    scoreReq: 0  },
  { level: 2, title: 'Toddler',     emoji: '🧒', color: 'from-green-400 to-emerald-500',  badge: 'bg-green-100 text-green-700',  scoreReq: 10 },
  { level: 3, title: 'Child',       emoji: '🧑', color: 'from-yellow-400 to-amber-500',   badge: 'bg-yellow-100 text-yellow-700',scoreReq: 20 },
  { level: 4, title: 'Teen',        emoji: '🧑‍🎓', color: 'from-orange-400 to-rose-500',   badge: 'bg-orange-100 text-orange-700',scoreReq: 30 },
  { level: 5, title: 'Adult',       emoji: '👔', color: 'from-violet-500 to-indigo-600',  badge: 'bg-violet-100 text-violet-700',scoreReq: 40 },
  { level: 6, title: 'Pro',         emoji: '🌍', color: 'from-rose-500 to-pink-600',      badge: 'bg-rose-100 text-rose-700',    scoreReq: 55 },
];

function getGrowthLevel(totalCorrect: number): GrowthLevel {
  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--) {
    if (totalCorrect >= GROWTH_LEVELS[i].scoreReq) return GROWTH_LEVELS[i];
  }
  return GROWTH_LEVELS[0];
}

// ─────────────────────────────────────────────────────────────────
// Shared quiz item format
// ─────────────────────────────────────────────────────────────────
interface QuizItem {
  sentence: string;  // spoken text
  answer:   string;  // correct emoji
  choices:  string[]; // 4 emoji options (includes answer)
  hint?:    string;  // optional sub-label shown under emoji
}

// ─────────────────────────────────────────────────────────────────
// Level 1 — Baby: single nouns (emoji tap)
// ─────────────────────────────────────────────────────────────────
const BABY_ITEMS: { word: string; emoji: string }[] = [
  { word: 'Apple',      emoji: '🍎' }, { word: 'Banana',     emoji: '🍌' },
  { word: 'Orange',     emoji: '🍊' }, { word: 'Strawberry', emoji: '🍓' },
  { word: 'Grape',      emoji: '🍇' }, { word: 'Bread',      emoji: '🍞' },
  { word: 'Pizza',      emoji: '🍕' }, { word: 'Egg',        emoji: '🥚' },
  { word: 'Milk',       emoji: '🥛' }, { word: 'Cake',       emoji: '🎂' },
  { word: 'Dog',        emoji: '🐶' }, { word: 'Cat',        emoji: '🐱' },
  { word: 'Bird',       emoji: '🐦' }, { word: 'Fish',       emoji: '🐟' },
  { word: 'Rabbit',     emoji: '🐰' }, { word: 'Bear',       emoji: '🐻' },
  { word: 'Lion',       emoji: '🦁' }, { word: 'Elephant',   emoji: '🐘' },
  { word: 'Car',        emoji: '🚗' }, { word: 'Bus',        emoji: '🚌' },
  { word: 'Train',      emoji: '🚂' }, { word: 'Airplane',   emoji: '✈️' },
  { word: 'House',      emoji: '🏠' }, { word: 'Book',       emoji: '📚' },
  { word: 'Ball',       emoji: '⚽' }, { word: 'Sun',        emoji: '☀️' },
  { word: 'Moon',       emoji: '🌙' }, { word: 'Star',       emoji: '⭐' },
  { word: 'Tree',       emoji: '🌳' }, { word: 'Flower',     emoji: '🌸' },
];

// ─────────────────────────────────────────────────────────────────
// Level 2 — Toddler: simple action sentences
// ─────────────────────────────────────────────────────────────────
const TODDLER_ITEMS: QuizItem[] = [
  { sentence: 'The dog is sleeping.',    answer: '🐶💤', choices: ['🐶💤','🐶🏃','🐱💤','🐶🍎'] },
  { sentence: 'I am eating an apple.',   answer: '😋🍎', choices: ['😋🍎','😋🍌','😴🍎','🍎🚗'] },
  { sentence: 'The cat is running.',     answer: '🐱🏃', choices: ['🐱🏃','🐱💤','🐶🏃','🐱🍎'] },
  { sentence: 'She is drinking milk.',   answer: '😊🥛', choices: ['😊🥛','😊🍎','😴🥛','🥛🐶'] },
  { sentence: 'The bird is flying.',     answer: '🐦✈️', choices: ['🐦✈️','🐦💤','🐶✈️','🐦🍎'] },
  { sentence: 'I am reading a book.',    answer: '😊📚', choices: ['😊📚','😊🎵','😴📚','📚🐶'] },
  { sentence: 'The baby is sleeping.',   answer: '👶💤', choices: ['👶💤','👶🏃','👶🍎','🐶💤'] },
  { sentence: 'The lion is eating.',     answer: '🦁😋', choices: ['🦁😋','🦁💤','🐶😋','🦁🚗'] },
  { sentence: 'The sun is shining.',     answer: '☀️😊', choices: ['☀️😊','🌙😊','☀️💤','⭐😊'] },
  { sentence: 'It is raining.',          answer: '🌧️💧', choices: ['🌧️💧','☀️💧','🌧️😊','💧🐶'] },
  { sentence: 'I love you.',             answer: '😊❤️', choices: ['😊❤️','😴❤️','😊⭐','❤️🐶'] },
  { sentence: 'The rabbit is jumping.',  answer: '🐰⬆️', choices: ['🐰⬆️','🐰💤','🐶⬆️','🐰🍎'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 3 — Child: slightly longer sentences
// ─────────────────────────────────────────────────────────────────
const CHILD_ITEMS: QuizItem[] = [
  { sentence: 'I want to go to the park.',          answer: '🌳🏃', choices: ['🌳🏃','🏠🏃','🌳😴','🌳🚗'] },
  { sentence: 'Can I have some water, please?',     answer: '💧🙏', choices: ['💧🙏','🥛🙏','💧😊','🍎🙏'] },
  { sentence: 'Let\'s play outside together.',      answer: '⚽🌳', choices: ['⚽🌳','⚽🏠','📚🌳','⚽💤'] },
  { sentence: 'I am very hungry right now.',        answer: '😩🍽️', choices: ['😩🍽️','😩💤','😊🍽️','😩📚'] },
  { sentence: 'The stars are beautiful tonight.',   answer: '⭐🌙', choices: ['⭐🌙','⭐☀️','🌸🌙','⭐💧'] },
  { sentence: 'My dog loves to run in the garden.', answer: '🐶🌳', choices: ['🐶🌳','🐱🌳','🐶🏠','🐶💤'] },
  { sentence: 'She is drawing a beautiful picture.', answer: '🎨😊', choices: ['🎨😊','📚😊','🎨😴','🎨🐶'] },
  { sentence: 'I am going to school by bus.',       answer: '🚌🎒', choices: ['🚌🎒','🚗🎒','🚌🏠','🚌📚'] },
  { sentence: 'We are having a birthday party.',    answer: '🎂🎉', choices: ['🎂🎉','🍎🎉','🎂😴','🎂🐶'] },
  { sentence: 'It is cold outside today.',          answer: '🥶❄️', choices: ['🥶❄️','😊❄️','🥶☀️','🌧️❄️'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 4 — Teen: everyday situations
// ─────────────────────────────────────────────────────────────────
const TEEN_ITEMS: QuizItem[] = [
  { sentence: 'I missed the last train home.',              answer: '🚂😱', choices: ['🚂😱','🚌😱','🚂😊','🚂💤'] },
  { sentence: 'Can you turn up the music a bit?',          answer: '🎵🔊', choices: ['🎵🔊','🎵📉','📚🔊','🎵💤'] },
  { sentence: 'I have a big test tomorrow morning.',        answer: '📚😰', choices: ['📚😰','📚😊','🎵😰','📚🎉'] },
  { sentence: 'Let\'s grab some food after this.',         answer: '🍔🙌', choices: ['🍔🙌','🍎🙌','🍔😴','🍔📚'] },
  { sentence: 'My phone battery is almost dead.',          answer: '📱🔋', choices: ['📱🔋','💻🔋','📱😊','📱🎵'] },
  { sentence: 'She posted a new photo on social media.',   answer: '📸📱', choices: ['📸📱','📸📚','📱💤','📸🎵'] },
  { sentence: 'I stayed up all night studying.',           answer: '🌙📚', choices: ['🌙📚','☀️📚','🌙🎵','🌙💤'] },
  { sentence: 'We won the game in the final minute.',      answer: '⚽🏆', choices: ['⚽🏆','⚽😱','🏀🏆','⚽💤'] },
  { sentence: 'I\'m saving money to buy a new guitar.',   answer: '💰🎸', choices: ['💰🎸','💰📚','💰🎵','💸🎸'] },
  { sentence: 'The concert last night was amazing.',       answer: '🎤🔥', choices: ['🎤🔥','🎤😴','🎵🔥','🎤📚'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 5 — Adult: café / travel / emotions
// ─────────────────────────────────────────────────────────────────
const ADULT_ITEMS: QuizItem[] = [
  // Café
  { sentence: "I'd like a hot coffee, please.",                   answer: '☕🤲', choices: ['☕🤲','🧃🤲','☕😴','🍵🤲'],   hint: 'Café order' },
  { sentence: "Could I get this to go?",                          answer: '☕🛍️', choices: ['☕🛍️','☕😊','🍵🛍️','☕📚'],   hint: 'Café order' },
  { sentence: "Do you have any dairy-free options?",              answer: '🥛❌', choices: ['🥛❌','🥛😊','☕❌','🍰❌'],   hint: 'Café order' },
  { sentence: "I'll have the avocado toast, please.",             answer: '🥑🍞', choices: ['🥑🍞','🍳🍞','🥑😊','🥑☕'],  hint: 'Café order' },
  // Travel
  { sentence: "Where is the restroom?",                           answer: '🚹❓', choices: ['🚹❓','🚪❓','🚹😊','✈️❓'],    hint: 'Travel' },
  { sentence: "My flight has been delayed.",                      answer: '✈️⏰', choices: ['✈️⏰','✈️😊','🚂⏰','✈️❌'],  hint: 'Travel' },
  { sentence: "Can I have a window seat, please?",                answer: '💺🪟', choices: ['💺🪟','💺😊','🪟❓','💺✈️'],   hint: 'Travel' },
  { sentence: "I need to exchange some currency.",                answer: '💱💵', choices: ['💱💵','💰💵','💱😊','💵📚'],   hint: 'Travel' },
  { sentence: "Is there a pharmacy nearby?",                      answer: '💊📍', choices: ['💊📍','🏥📍','💊😊','💊❓'],   hint: 'Travel' },
  // Emotions / Greetings
  { sentence: "I'm so excited for today!",                        answer: '🔥😆', choices: ['🔥😆','😴😆','🔥😊','🎉😆'],   hint: 'Emotions' },
  { sentence: "I'm feeling a bit under the weather.",             answer: '🤒😔', choices: ['🤒😔','😊😔','🤒💪','🤒💤'],   hint: 'Emotions' },
  { sentence: "Long time no see! How have you been?",             answer: '👋😊', choices: ['👋😊','👋😴','👋📚','🤝😊'],   hint: 'Greetings' },
];

// ─────────────────────────────────────────────────────────────────
// Level 6 — Pro: business / advanced
// ─────────────────────────────────────────────────────────────────
const PRO_ITEMS: QuizItem[] = [
  { sentence: "Let's circle back on this after the meeting.",      answer: '🔄💼', choices: ['🔄💼','🔄😊','💼📅','🔄📚'],   hint: 'Business' },
  { sentence: "Could you send me the report by end of day?",       answer: '📊📨', choices: ['📊📨','📊💤','📧📊','📊🎉'],    hint: 'Business' },
  { sentence: "We need to align on the project timeline.",         answer: '📅✅', choices: ['📅✅','📅😊','✅💼','📅❌'],    hint: 'Business' },
  { sentence: "I appreciate your feedback on this proposal.",      answer: '🙏📄', choices: ['🙏📄','🙏😊','📄💼','🙏🎉'],    hint: 'Business' },
  { sentence: "The quarterly results exceeded our expectations.",  answer: '📈🎉', choices: ['📈🎉','📉🎉','📈😊','📈💼'],    hint: 'Business' },
  { sentence: "Could we schedule a call for next week?",           answer: '📞📅', choices: ['📞📅','📞😊','📅💼','📞❓'],    hint: 'Business' },
  { sentence: "I'd like to negotiate the terms of this contract.", answer: '🤝📄', choices: ['🤝📄','🤝😊','📄💼','🤝❌'],    hint: 'Business' },
  { sentence: "We're launching the new product next quarter.",     answer: '🚀📦', choices: ['🚀📦','🚀😊','📦💼','🚀📅'],    hint: 'Business' },
  { sentence: "Please keep this information confidential.",        answer: '🔒🤫', choices: ['🔒🤫','🔒😊','🤫💼','🔒📄'],    hint: 'Business' },
  { sentence: "The team delivered an outstanding performance.",    answer: '🏆👏', choices: ['🏆👏','🏆😊','👏💼','🏆📊'],    hint: 'Business' },
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
  utt.pitch  = 1.05;
  utt.volume = 1.0;
  if (onEnd) utt.onend = onEnd;
  setTimeout(() => window.speechSynthesis.speak(utt), 80);
}

function getItemsForLevel(growthLevel: number): QuizItem[] | null {
  // null = baby mode (word tap)
  if (growthLevel === 1) return null;
  if (growthLevel === 2) return TODDLER_ITEMS;
  if (growthLevel === 3) return CHILD_ITEMS;
  if (growthLevel === 4) return TEEN_ITEMS;
  if (growthLevel === 5) return ADULT_ITEMS;
  return PRO_ITEMS;
}

// ─────────────────────────────────────────────────────────────────
// Baby Word Quiz (Level 1)
// ─────────────────────────────────────────────────────────────────
interface WordQuiz { correct: { word: string; emoji: string }; choices: { word: string; emoji: string }[] }

function buildWordQuiz(prevWord?: string): WordQuiz {
  const pool    = BABY_ITEMS.filter(v => v.word !== prevWord);
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const others  = shuffle(BABY_ITEMS.filter(v => v.word !== correct.word)).slice(0, 3);
  return { correct, choices: shuffle([correct, ...others]) };
}

function WordQuizView({ onCorrect }: { onCorrect: () => void }) {
  const [quiz,     setQuiz]     = useState<WordQuiz>(() => buildWordQuiz());
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevRef = useRef<string | undefined>(undefined);

  const playWord = useCallback(() => {
    setSpeaking(true);
    speak(quiz.correct.word, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => { playWord(); }, [quiz.correct.word]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    prevRef.current = quiz.correct.word;
    setQuiz(buildWordQuiz(prevRef.current));
    setResult(null); setLocked(false);
  }, [quiz]);

  const handleTap = (item: { word: string; emoji: string }) => {
    if (locked) return;
    if (item.word === quiz.correct.word) {
      setResult('correct'); setLocked(true);
      onCorrect();
      setTimeout(next, 1100);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which one is it?</p>
        <button onClick={playWord}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-blue-400 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
          <span className="text-xl">🔊</span>
          <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
        </button>
        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(item => (
          <button key={item.word} onClick={() => handleTap(item)}
            className={`py-6 rounded-2xl text-5xl flex items-center justify-center border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && item.word === quiz.correct.word
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}>
            {item.emoji}
          </button>
        ))}
      </div>
      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sentence Quiz (Levels 2-6)
// ─────────────────────────────────────────────────────────────────
function buildSentenceQuiz(items: QuizItem[], prevSentence?: string): QuizItem {
  const pool = items.filter(s => s.sentence !== prevSentence);
  return pool[Math.floor(Math.random() * pool.length)];
}

function SentenceQuizView({
  items, accentColor, onCorrect,
}: {
  items: QuizItem[];
  accentColor: string;
  onCorrect: () => void;
}) {
  const [quiz,     setQuiz]     = useState<QuizItem>(() => buildSentenceQuiz(items));
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevRef = useRef<string | undefined>(undefined);

  const playSentence = useCallback(() => {
    setSpeaking(true);
    speak(quiz.sentence, () => setSpeaking(false), 0.82);
  }, [quiz]);

  useEffect(() => {
    setResult(null); setLocked(false);
    playSentence();
  }, [quiz.sentence]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when items set changes (level up)
  useEffect(() => {
    prevRef.current = undefined;
    setQuiz(buildSentenceQuiz(items));
  }, [items]);

  const next = useCallback(() => {
    prevRef.current = quiz.sentence;
    setQuiz(buildSentenceQuiz(items, prevRef.current));
  }, [quiz, items]);

  const handleTap = (choice: string) => {
    if (locked) return;
    if (choice === quiz.answer) {
      setResult('correct'); setLocked(true);
      onCorrect();
      setTimeout(next, 1200);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which picture matches?</p>
          {quiz.hint && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{quiz.hint}</span>
          )}
        </div>
        <button onClick={playSentence}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? `${accentColor} opacity-80 text-white animate-pulse` : `${accentColor} text-white hover:opacity-90`
          }`}>
          <span className="text-xl">🔊</span>
          <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
        </button>
        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(choice => (
          <button key={choice} onClick={() => handleTap(choice)}
            className={`py-5 rounded-2xl text-3xl flex items-center justify-center gap-1 border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-400'
            }`}>
            {choice}
          </button>
        ))}
      </div>
      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — root component
// ─────────────────────────────────────────────────────────────────
export function BabyImmersion() {
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [total,        setTotal]        = useState(0);
  const [justLevelUp,  setJustLevelUp]  = useState(false);

  const growthLevel    = getGrowthLevel(totalCorrect);
  const nextLevel      = GROWTH_LEVELS.find(l => l.scoreReq > totalCorrect);
  const toNext         = nextLevel ? nextLevel.scoreReq - totalCorrect : null;
  const progressPct    = nextLevel
    ? Math.round(((totalCorrect - growthLevel.scoreReq) / (nextLevel.scoreReq - growthLevel.scoreReq)) * 100)
    : 100;

  const prevLevelRef = useRef(growthLevel.level);
  const onCorrect = () => {
    setTotalCorrect(c => {
      const next = c + 1;
      const newLevel = getGrowthLevel(next);
      if (newLevel.level > prevLevelRef.current) {
        prevLevelRef.current = newLevel.level;
        setJustLevelUp(true);
        setTimeout(() => setJustLevelUp(false), 2500);
      }
      return next;
    });
    setTotal(t => t + 1);
  };
  const onWrong = () => setTotal(t => t + 1);

  const items         = getItemsForLevel(growthLevel.level);
  const accuracy      = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  // accent color for listen button
  const accentColors: Record<number, string> = {
    2: 'bg-green-600', 3: 'bg-yellow-500', 4: 'bg-orange-500',
    5: 'bg-violet-600', 6: 'bg-rose-600',
  };
  const accent = accentColors[growthLevel.level] ?? 'bg-blue-600';

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* ── Level Banner ── */}
      <div className={`rounded-2xl bg-gradient-to-r ${growthLevel.color} px-5 py-4 text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Level</p>
            <p className="text-2xl font-black leading-tight mt-0.5">
              {growthLevel.emoji} Level {growthLevel.level}: {growthLevel.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{totalCorrect}</p>
            <p className="text-[10px] opacity-70">correct</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] opacity-70 mb-1">
            <span>Progress</span>
            {toNext !== null
              ? <span>{toNext} more to level up!</span>
              : <span>🏆 Max Level!</span>
            }
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Level-up celebration */}
      {justLevelUp && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-2xl animate-bounce shadow">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="text-sm font-black text-yellow-800">Level Up! {growthLevel.emoji}</p>
            <p className="text-xs text-yellow-600">Welcome to {growthLevel.title} level!</p>
          </div>
        </div>
      )}

      {/* ── Quiz ── */}
      {items === null
        ? <WordQuizView    onCorrect={onCorrect} />
        : <SentenceQuizView items={items} accentColor={accent} onCorrect={onCorrect} />
      }

      {/* ── Score ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Accuracy</span>
          <span className="text-base font-black text-blue-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{totalCorrect} / {total} correct</span>
        <button
          onClick={() => { setTotalCorrect(0); setTotal(0); prevLevelRef.current = 1; }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
          Reset
        </button>
      </div>

    </div>
  );
}
