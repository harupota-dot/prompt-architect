'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────
const MASTERY_THRESHOLD = 3;          // この回数正解したら「習得済み」
const RECENT_MAX = 15;                // セッション内で直近何問を除外するか
const LS_WORDS           = 'basic-words-v3';        // localStorage キー（単語）
const LS_QA              = 'qa-progress-v3';        // localStorage キー（Q&A）
const LS_QA_MASTERED     = 'qa-mastered-v3';        // Q&A 正解済みセット

// ─────────────────────────────────────────────────────────────────
// 単語データ（4段階ティア）
// ─────────────────────────────────────────────────────────────────
interface Word { en: string; emoji: string; ja: string; }

// Tier 1 — 超・基礎（8単語のみでスタート）
const TIER1: Word[] = [
  { en:'apple',    emoji:'🍎', ja:'りんご'      },
  { en:'dog',      emoji:'🐶', ja:'いぬ'        },
  { en:'cat',      emoji:'🐱', ja:'ねこ'        },
  { en:'hello',    emoji:'👋', ja:'こんにちは'  },
  { en:'thank you',emoji:'🙏', ja:'ありがとう'  },
  { en:'water',    emoji:'💧', ja:'みず'         },
  { en:'book',     emoji:'📚', ja:'ほん'         },
  { en:'sun',      emoji:'☀️', ja:'たいよう'    },
];

// Tier 2 — 基礎（全 Tier1 習得後に解放）
const TIER2: Word[] = [
  { en:'banana',       emoji:'🍌', ja:'バナナ'             },
  { en:'bird',         emoji:'🐦', ja:'とり'               },
  { en:'car',          emoji:'🚗', ja:'くるま'             },
  { en:'house',        emoji:'🏠', ja:'いえ'               },
  { en:'milk',         emoji:'🥛', ja:'ぎゅうにゅう'       },
  { en:'flower',       emoji:'🌸', ja:'はな'               },
  { en:'moon',         emoji:'🌙', ja:'つき'               },
  { en:'fish',         emoji:'🐟', ja:'さかな'             },
  { en:'good morning', emoji:'🌅', ja:'おはようございます' },
  { en:'good night',   emoji:'💤', ja:'おやすみなさい'     },
];

// Tier 3 — 初級（全 Tier2 習得後に解放）
const TIER3: Word[] = [
  { en:'orange',   emoji:'🍊', ja:'オレンジ'           },
  { en:'bread',    emoji:'🍞', ja:'パン'               },
  { en:'star',     emoji:'⭐', ja:'ほし'               },
  { en:'bear',     emoji:'🐻', ja:'くま'               },
  { en:'train',    emoji:'🚂', ja:'でんしゃ'           },
  { en:'red',      emoji:'🔴', ja:'あか'               },
  { en:'blue',     emoji:'🔵', ja:'あお'               },
  { en:'green',    emoji:'🟢', ja:'みどり'             },
  { en:'school',   emoji:'🏫', ja:'がっこう'           },
  { en:'please',   emoji:'🤲', ja:'おねがいします'     },
  { en:'sorry',    emoji:'😔', ja:'ごめんなさい'       },
  { en:'see you',  emoji:'👋', ja:'またね'             },
];

// Tier 4 — 中級（全 Tier3 習得後に解放）
const TIER4: Word[] = [
  { en:'ice cream',   emoji:'🍦', ja:'アイスクリーム'  },
  { en:'chocolate',   emoji:'🍫', ja:'チョコレート'    },
  { en:'airplane',    emoji:'✈️', ja:'ひこうき'        },
  { en:'mountain',    emoji:'⛰️', ja:'やま'            },
  { en:'beautiful',   emoji:'✨', ja:'うつくしい'      },
  { en:'delicious',   emoji:'😋', ja:'おいしい'        },
  { en:'excuse me',   emoji:'🙋', ja:'すみません'      },
  { en:'I love you',  emoji:'❤️', ja:'だいすき'        },
  { en:'how are you', emoji:'😊', ja:'げんきですか'    },
  { en:'cold',        emoji:'🥶', ja:'さむい'          },
  { en:'hot',         emoji:'🔥', ja:'あつい'          },
  { en:'big',         emoji:'🐘', ja:'おおきい'        },
  { en:'small',       emoji:'🐭', ja:'ちいさい'        },
  { en:'happy',       emoji:'😄', ja:'うれしい'        },
  { en:'tired',       emoji:'😴', ja:'つかれた'        },
];

const ALL_TIERS = [TIER1, TIER2, TIER3, TIER4];
const TIER_NAMES = ['超・基礎', '基礎', '初級', '中級'];

// ─────────────────────────────────────────────────────────────────
// Q&A データ（3段階ティア）
// ─────────────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string, string]; hint?: string; }

const QA_T1: QAItem[] = [
  { question:'Hello!',           answer:"Hi there!",             wrongs:['Goodbye.','Thank you.'] },
  { question:"What's your name?",answer:'My name is Tom.',        wrongs:['It is red.','Yes, it is.'] },
  { question:'How old are you?', answer:'I am seven years old.',  wrongs:['I like dogs.','It is sunny.'] },
  { question:'Do you like cats?',answer:'Yes, I love cats!',      wrongs:['No, I am a bird.','It is big.'] },
  { question:'What color is the sky?', answer:'The sky is blue.', wrongs:['It is a dog.','I am happy.'] },
  { question:'Goodbye!',         answer:'Goodbye! See you later!',wrongs:['I am hungry.','It is a cat.'] },
  { question:'Are you happy?',   answer:'Yes, I am very happy!',  wrongs:['No, it is blue.','I like trains.'] },
  { question:'Thank you!',       answer:"You're welcome!",        wrongs:['It is cold.','I like fish.'] },
];

const QA_T2: QAItem[] = [
  { question:'How are you today?',   answer:'I am fine, thank you.',       wrongs:['I am a cat.','It is raining.'] },
  { question:"Where are you from?",  answer:'I am from Japan.',            wrongs:['I like apples.','It is five o\'clock.'] },
  { question:'Do you speak English?',answer:'Just a little, but I try!',   wrongs:['I want coffee.','The train is late.'] },
  { question:'Nice to meet you!',    answer:'Nice to meet you too!',       wrongs:['I am going home.','Where is the bus?'] },
  { question:'How was your day?',    answer:'It was great, thank you!',    wrongs:['I have two cats.','Please turn left.'] },
  { question:'What do you do?',      answer:'I am a student.',             wrongs:['I am hungry.','The sky is blue.'] },
  { question:'Do you like sushi?',   answer:'Yes! It is delicious!',       wrongs:['No, I am a bird.','It is Monday.'] },
];

const QA_T3: QAItem[] = [
  { question:'Welcome! How was your trip?',        answer:'It was great, thank you.',        wrongs:['My name is John.','I want to sleep.'], hint:'ホテル' },
  { question:'May I have your name, please?',      answer:"Sure, I have a reservation.",     wrongs:['I like sushi.','The weather is nice.'], hint:'ホテル' },
  { question:'How many nights will you be staying?',answer:'I will be staying for two nights.',wrongs:['I am very tired.','Yes, I like it.'], hint:'ホテル' },
  { question:'What time is check-out?',            answer:'Check-out is at 10 AM.',          wrongs:['I like coffee.','Yes, please.'], hint:'ホテル' },
  { question:'Is breakfast included?',             answer:'Yes, served from 7 to 9 AM.',    wrongs:['The room is on the left.','I need a taxi.'], hint:'ホテル' },
  { question:'Excuse me, where is the station?',   answer:"It's a five-minute walk.",        wrongs:['I like pizza.','The dog is sleeping.'], hint:'道案内' },
  { question:'Can I pay by credit card?',          answer:'Yes, we accept all major cards.', wrongs:['The park is lovely.','I am from Tokyo.'], hint:'お会計' },
  { question:'What can I get you?',               answer:"I'd like a latte, please.",       wrongs:['Where is the restroom?','The bus is coming.'], hint:'カフェ' },
  { question:'Would you like that to go?',         answer:'To stay, please.',                wrongs:['Yes, I am fine.','The bus is coming.'], hint:'カフェ' },
  { question:'Did you enjoy your stay?',           answer:'It was absolutely wonderful!',    wrongs:['I need a new phone.','The train is fast.'], hint:'ホテル' },
];

// ─────────────────────────────────────────────────────────────────
// 称賛メッセージ
// ─────────────────────────────────────────────────────────────────
const PRAISES = [
  { text:'Excellent! 🌟', speech:'Excellent!' },
  { text:'Great! 🎉',     speech:'Great!'     },
  { text:'Perfect! ✨',   speech:'Perfect!'   },
  { text:'Amazing! 🔥',   speech:'Amazing!'   },
  { text:'Super! 👏',     speech:'Super!'     },
  { text:'Wonderful! 🎊', speech:'Wonderful!' },
  { text:'Nice! 💪',      speech:'Nice!'      },
];
function randomPraise() { return PRAISES[Math.floor(Math.random() * PRAISES.length)]; }

// ─────────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakText(text: string, onEnd?: () => void, rate = 0.88): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return; }
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = rate; utt.pitch = 1.05; utt.volume = 1.0;
    if (onEnd) {
      let fired = false;
      const done = () => { if (!fired) { fired = true; onEnd(); } };
      utt.onend = done; utt.onerror = done;
    }
    setTimeout(() => {
      try { window.speechSynthesis.speak(utt); } catch { onEnd?.(); }
    }, 80);
  } catch { onEnd?.(); }
}

// ─────────────────────────────────────────────────────────────────
// 習得マップからアクティブプールを計算
// ─────────────────────────────────────────────────────────────────
function getActivePool(masteryMap: Record<string, number>): { pool: Word[]; tierIdx: number } {
  let tierIdx = 0;
  const pool: Word[] = [...TIER1];

  for (let t = 0; t < ALL_TIERS.length - 1; t++) {
    const allMastered = ALL_TIERS[t].every(w => (masteryMap[w.en] ?? 0) >= MASTERY_THRESHOLD);
    if (allMastered) {
      pool.push(...ALL_TIERS[t + 1]);
      tierIdx = t + 1;
    } else {
      break;
    }
  }
  return { pool, tierIdx };
}

// 習得済み単語数のカウント
function countMastered(masteryMap: Record<string, number>, pool: Word[]): number {
  return pool.filter(w => (masteryMap[w.en] ?? 0) >= MASTERY_THRESHOLD).length;
}

// ─────────────────────────────────────────────────────────────────
// 直近履歴ユーティリティ
// ─────────────────────────────────────────────────────────────────
function pushRecent(recent: string[], key: string): string[] {
  const next = [key, ...recent.filter(k => k !== key)];
  return next.slice(0, RECENT_MAX);
}

// ─────────────────────────────────────────────────────────────────
// 3択クイズ構築（重複バグ防止 + 履歴 + 未正解優先）
// ─────────────────────────────────────────────────────────────────
interface WordQuiz { correct: Word; choices: string[]; }

function pickWordCorrect(
  pool: Word[],
  recent: string[],
  masteryMap: Record<string, number>,
): Word {
  const recentSet   = new Set(recent);
  const isMastered  = (w: Word) => (masteryMap[w.en] ?? 0) >= MASTERY_THRESHOLD;
  const notRecent   = (w: Word) => !recentSet.has(w.en);

  // 優先度1: 未習得 かつ 直近履歴外
  let cands = pool.filter(w => !isMastered(w) && notRecent(w));
  // 優先度2: 未習得（履歴制約を外す）
  if (!cands.length) cands = pool.filter(w => !isMastered(w));
  // 優先度3: 直近履歴外（習得済みも含む）
  if (!cands.length) cands = pool.filter(notRecent);
  // フォールバック: 全体から（直近履歴リセット相当）
  if (!cands.length) cands = pool;

  return cands[Math.floor(Math.random() * cands.length)];
}

function buildWordQuiz(
  pool: Word[],
  recent: string[],
  masteryMap: Record<string, number>,
): WordQuiz {
  const correct = pickWordCorrect(pool, recent, masteryMap);

  // ja が異なる単語からダミーを 2 つ選ぶ（重複排除）
  const distPool = pool.filter(w => w.en !== correct.en && w.ja !== correct.ja);
  const wrongs   = shuffle(distPool).slice(0, 2).map(w => w.ja);
  // プールが小さい場合のフォールバック
  const fallbacks = ['その他', 'わかりません', 'ちがう'];
  while (wrongs.length < 2) wrongs.push(fallbacks[wrongs.length]);

  return { correct, choices: shuffle([correct.ja, ...wrongs]) };
}

interface QAQuiz extends QAItem { choices: string[]; }

function pickQAItem(
  pool: QAItem[],
  recent: string[],
  masteredSet: Set<string>,
): QAItem {
  const recentSet  = new Set(recent);
  const notMastered = (q: QAItem) => !masteredSet.has(q.question);
  const notRecent   = (q: QAItem) => !recentSet.has(q.question);

  // 優先度1: 未正解 かつ 直近履歴外
  let cands = pool.filter(q => notMastered(q) && notRecent(q));
  // 優先度2: 未正解（履歴制約を外す）
  if (!cands.length) cands = pool.filter(notMastered);
  // 優先度3: 直近履歴外（正解済みも含む）
  if (!cands.length) cands = pool.filter(notRecent);
  // フォールバック: 全体
  if (!cands.length) cands = pool;

  return cands[Math.floor(Math.random() * cands.length)];
}

function buildQAQuiz(
  pool: QAItem[],
  recent: string[],
  masteredSet: Set<string>,
): QAQuiz {
  const item = pickQAItem(pool, recent, masteredSet);
  return { ...item, choices: shuffle([item.answer, item.wrongs[0], item.wrongs[1]]) };
}

// ─────────────────────────────────────────────────────────────────
// BasicWordsMode（単語 3 択）
// ─────────────────────────────────────────────────────────────────
function BasicWordsMode({ onCorrect }: { onCorrect: () => void }) {
  const [masteryMap, setMasteryMap] = useState<Record<string, number>>({});
  const [quiz,       setQuiz]       = useState<WordQuiz | null>(null);
  const [result,     setResult]     = useState<'correct' | 'wrong' | null>(null);
  const [locked,     setLocked]     = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [showText,   setShowText]   = useState(false);
  const [hydrated,   setHydrated]   = useState(false);
  // 直近出題履歴（セッション内、localStorage 不要）
  const recentRef = useRef<string[]>([]);

  // localStorage からロード
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WORDS);
      if (raw) setMasteryMap(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // 最初のクイズ生成
  useEffect(() => {
    if (!hydrated) return;
    const { pool } = getActivePool(masteryMap);
    const q = buildWordQuiz(pool, recentRef.current, masteryMap);
    recentRef.current = pushRecent(recentRef.current, q.correct.en);
    setQuiz(q);
  }, [hydrated]); // eslint-disable-line

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.correct.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setShowText(false); playWord(); }
  }, [quiz?.correct.en]); // eslint-disable-line

  const next = useCallback((currentMastery?: Record<string, number>) => {
    const mastery = currentMastery ?? masteryMap;
    const { pool } = getActivePool(mastery);
    const q = buildWordQuiz(pool, recentRef.current, mastery);
    recentRef.current = pushRecent(recentRef.current, q.correct.en);
    setQuiz(q);
    setResult(null); setLocked(false);
  }, [masteryMap]);

  const handleTap = (ja: string) => {
    if (locked || !quiz) return;
    if (ja === quiz.correct.ja) {
      setResult('correct'); setLocked(true);

      // 習得カウント更新
      const updated = { ...masteryMap, [quiz.correct.en]: (masteryMap[quiz.correct.en] ?? 0) + 1 };
      setMasteryMap(updated);
      try { localStorage.setItem(LS_WORDS, JSON.stringify(updated)); } catch { /* ignore */ }

      onCorrect();
      // 最新の masteryMap を next() に渡す（stale closure 防止）
      setTimeout(() => next(updated), 1400);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  if (!hydrated || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const { pool, tierIdx } = getActivePool(masteryMap);
  const mastered = countMastered(masteryMap, pool);

  return (
    <div className="flex flex-col gap-4">
      {/* ティア進捗 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-indigo-600">
          📖 {TIER_NAMES[tierIdx]} — 習得 {mastered}/{pool.length}語
        </span>
        <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pool.length ? (mastered / pool.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400">Lv{tierIdx + 1}</span>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">日本語の意味はどれ？</p>

        {/* 再生ボタン */}
        <button onClick={playWord}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-blue-400 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>

        {/* テキスト表示トグル */}
        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}>
          {showText ? '🙈 かくす' : '👁️ テキストを見る'}
        </button>

        {showText && (
          <div className="px-5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-2xl font-black text-amber-800">{quiz.correct.emoji}</p>
            <p className="text-xl font-black text-amber-700 mt-1">{quiz.correct.en}</p>
          </div>
        )}

        {result === 'wrong' && (
          <p className="text-gray-500 font-bold text-sm">Try again 💪</p>
        )}
      </div>

      {/* 3択ボタン（日本語）*/}
      <div className="flex flex-col gap-3">
        {quiz.choices.map((ja, idx) => (
          <button key={idx}
            onPointerDown={() => handleTap(ja)}
            disabled={locked}
            className={`w-full px-5 py-4 rounded-2xl text-center font-black text-lg border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && ja === quiz.correct.ja
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked
                ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
            {ja}
          </button>
        ))}
      </div>

      <button onClick={() => next()}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm transition-all">
        スキップ →
      </button>

      {/* 次のティア解放ヒント */}
      {tierIdx < ALL_TIERS.length - 1 && (() => {
        const needed = ALL_TIERS[tierIdx].filter(w => (masteryMap[w.en] ?? 0) < MASTERY_THRESHOLD).length;
        return needed > 0 ? (
          <p className="text-center text-[10px] text-gray-400">
            あと {needed} 語習得で「{TIER_NAMES[tierIdx + 1]}」の単語が解放されます！
          </p>
        ) : null;
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// QAModeSimple（会話 Q&A 3択）
// ─────────────────────────────────────────────────────────────────
function QAModeSimple({ onCorrect }: { onCorrect: () => void }) {
  const [qaCorrect,   setQaCorrect]   = useState(0);
  const [masteredQA,  setMasteredQA]  = useState<Set<string>>(new Set());
  const [quiz,        setQuiz]        = useState<QAQuiz | null>(null);
  const [result,      setResult]      = useState<'correct' | 'wrong' | null>(null);
  const [locked,      setLocked]      = useState(false);
  const [speaking,    setSpeaking]    = useState(false);
  const [showText,    setShowText]    = useState(false);
  const [hydrated,    setHydrated]    = useState(false);
  // 直近出題履歴（セッション内）
  const recentRef = useRef<string[]>([]);

  function getQAPool(correct: number): QAItem[] {
    if (correct < 20) return QA_T1;
    if (correct < 50) return [...QA_T1, ...QA_T2];
    return [...QA_T1, ...QA_T2, ...QA_T3];
  }
  function qaTierLabel(n: number) {
    if (n < 20) return '入門';
    if (n < 50) return '初級';
    return '中級';
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QA);
      const n   = raw ? (JSON.parse(raw).correct ?? 0) : 0;
      setQaCorrect(n);

      // 正解済みセットをロード
      const rawM = localStorage.getItem(LS_QA_MASTERED);
      const mSet: Set<string> = rawM ? new Set(JSON.parse(rawM)) : new Set();
      setMasteredQA(mSet);

      const q = buildQAQuiz(getQAPool(n), recentRef.current, mSet);
      recentRef.current = pushRecent(recentRef.current, q.question);
      setQuiz(q);
    } catch {
      const q = buildQAQuiz(QA_T1, [], new Set());
      recentRef.current = pushRecent(recentRef.current, q.question);
      setQuiz(q);
    }
    setHydrated(true);
  }, []);

  const playQuestion = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.question, () => setSpeaking(false), 0.84);
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setResult(null); setLocked(false); setShowText(false); playQuestion(); }
  }, [quiz?.question]); // eslint-disable-line

  const next = useCallback((currentCorrect?: number, currentMastered?: Set<string>) => {
    const n  = currentCorrect  ?? qaCorrect;
    const ms = currentMastered ?? masteredQA;
    const q = buildQAQuiz(getQAPool(n), recentRef.current, ms);
    recentRef.current = pushRecent(recentRef.current, q.question);
    setQuiz(q);
  }, [qaCorrect, masteredQA]);

  const handleTap = (choice: string) => {
    if (locked || !quiz) return;
    if (choice === quiz.answer) {
      setResult('correct'); setLocked(true);
      const next_n = qaCorrect + 1;
      setQaCorrect(next_n);
      try { localStorage.setItem(LS_QA, JSON.stringify({ correct: next_n })); } catch { /* ignore */ }

      // 正解済みに追加して localStorage へ保存
      const newMastered = new Set(masteredQA).add(quiz.question);
      setMasteredQA(newMastered);
      try { localStorage.setItem(LS_QA_MASTERED, JSON.stringify([...newMastered])); } catch { /* ignore */ }

      onCorrect();
      setTimeout(() => next(next_n, newMastered), 1400);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  if (!hydrated || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ティア表示 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-teal-600">
          💬 会話 ({qaTierLabel(qaCorrect)}) — 正解 {qaCorrect} 問
        </span>
        {qaCorrect < 50 && (
          <span className="text-[10px] text-gray-400">
            あと {(qaCorrect < 20 ? 20 : 50) - qaCorrect} 問で次のステージ
          </span>
        )}
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">
          正しい返答を選んでね
        </p>
        {quiz.hint && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
            {quiz.hint}
          </span>
        )}

        {/* 再生ボタン */}
        <button onClick={playQuestion}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-teal-400 text-white animate-pulse' : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>

        {/* テキスト表示トグル */}
        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}>
          {showText ? '🙈 かくす' : '👁️ 英文を見る'}
        </button>

        {showText && (
          <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800 text-center leading-relaxed">
              {quiz.question}
            </p>
          </div>
        )}

        {result === 'wrong' && (
          <p className="text-gray-500 font-bold text-sm">Try again 💪</p>
        )}
      </div>

      {/* 3択ボタン（英語返答）*/}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => (
          <button key={idx}
            onPointerDown={() => handleTap(choice)}
            disabled={locked}
            className={`w-full px-4 py-3.5 rounded-2xl text-left font-semibold text-sm leading-snug border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked
                ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-teal-50 hover:border-teal-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
            <span className="text-gray-400 font-black mr-2">{['A', 'B', 'C'][idx]}.</span>
            {choice}
          </button>
        ))}
      </div>

      <button onClick={() => next()}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm transition-all">
        スキップ →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — ルートコンポーネント
// ─────────────────────────────────────────────────────────────────
type ImMode = 'words' | 'qa';

export function BabyImmersion() {
  const [mode,      setMode]      = useState<ImMode>('words');
  const [celebText, setCelebText] = useState('');
  const [showCeleb, setShowCeleb] = useState(false);

  const celebrate = useCallback(() => {
    const praise = randomPraise();
    setCelebText(praise.text);
    setShowCeleb(true);
    speakText(praise.speech, undefined, 1.0);
    setTimeout(() => setShowCeleb(false), 1300);
  }, []);

  const switchMode = (m: ImMode) => {
    window.speechSynthesis?.cancel();
    setMode(m);
  };

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* ── モードタブ ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          ['words', '📝', '単語3択',  'Basic Words'],
          ['qa',    '💬', '会話Q&A',  'Conversation'],
        ] as [ImMode, string, string, string][]).map(([m, icon, label, sub]) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              mode === m
                ? m === 'words' ? 'bg-blue-600 text-white shadow-md' : 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{icon} {label}</span>
            <span className={`block text-[9px] mt-0.5 ${mode === m ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── クイズ本体 ── */}
      {mode === 'words'
        ? <BasicWordsMode onCorrect={celebrate} />
        : <QAModeSimple   onCorrect={celebrate} />
      }

      {/* ── 「Excellent!」褒めちぎりポップアップ ── */}
      {showCeleb && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="bg-yellow-400 text-white font-black px-10 py-6 rounded-3xl shadow-2xl animate-bounce"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 2.8rem)' }}
          >
            {celebText}
          </div>
        </div>
      )}
    </div>
  );
}
