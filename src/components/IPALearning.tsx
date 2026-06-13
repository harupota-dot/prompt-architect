'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// データセット — 日本人洋楽歌唱でつまずく母音・子音 18音
// ─────────────────────────────────────────────────────────────────
interface Sound {
  id:       string;
  symbol:   string;    // '/æ/'
  keyword:  string;    // 代表単語（音声再生の基準）
  desc:     string;    // 日本語の発音ヒント
  examples: string[];  // 同じ音を含む単語（4語以上）
  confuse:  string[];  // 混同しやすい音の id
}

const SOUNDS: Sound[] = [
  // ── 母音 ─────────────────────────────────────────────────────
  {
    id:'ae', symbol:'/æ/', keyword:'cat',
    desc:'「ア」と「エ」の中間。口を横に大きく開く。洋楽では一番多い母音。',
    examples:['cat','bad','man','black','sang','back'],
    confuse:['uh','aa','e'],
  },
  {
    id:'uh', symbol:'/ʌ/', keyword:'cup',
    desc:'力を抜いて短くつぶす「ア」。love や come の母音。',
    examples:['cup','love','come','sun','blood','fun'],
    confuse:['ae','aa','schwa'],
  },
  {
    id:'aa', symbol:'/ɑː/', keyword:'father',
    desc:'口を最大限に縦に開ける長い「アー」。hot や father の母音（米音）。',
    examples:['hot','father','start','car','far','palm'],
    confuse:['ae','uh','oo'],
  },
  {
    id:'schwa', symbol:'/ə/', keyword:'about',
    desc:'力を完全に抜いた曖昧な「ア」。弱音節で非常に多く使われる。',
    examples:['about','sofa','ago','banana','circus','butter'],
    confuse:['uh','ae'],
  },
  {
    id:'i', symbol:'/ɪ/', keyword:'sit',
    desc:'短く弱い「イ」。日本語の「イ」より口の力を抜く。',
    examples:['sit','bit','big','this','with','gym'],
    confuse:['ii','e','ae'],
  },
  {
    id:'ii', symbol:'/iː/', keyword:'see',
    desc:'長く緊張させた「イー」。唇を横に引く。',
    examples:['see','feel','dream','team','key','clean'],
    confuse:['i','e'],
  },
  {
    id:'e', symbol:'/ɛ/', keyword:'bed',
    desc:'日本語より少し広めの「エ」。',
    examples:['bed','red','said','friend','head','death'],
    confuse:['ae','i','ii'],
  },
  {
    id:'oo', symbol:'/uː/', keyword:'moon',
    desc:'唇を丸めて前に突き出す長い「ウー」。',
    examples:['food','moon','blue','too','through','move'],
    confuse:['uh','aa'],
  },
  {
    id:'oo_short', symbol:'/ʊ/', keyword:'book',
    desc:'短く緩めの「ウ」。/uː/ より唇の力を抜く。',
    examples:['book','good','look','foot','push','pull'],
    confuse:['oo','uh'],
  },
  {
    id:'aw', symbol:'/ɔː/', keyword:'all',
    desc:'唇を丸く開ける長い「オー」。saw・door・thought の母音。',
    examples:['all','saw','more','door','thought','law'],
    confuse:['aa','oo'],
  },
  {
    id:'ei', symbol:'/eɪ/', keyword:'day',
    desc:'「エ」から「イ」へ滑らかにつなぐ二重母音。',
    examples:['day','make','rain','they','say','great'],
    confuse:['e','i'],
  },
  // ── 子音 ─────────────────────────────────────────────────────
  {
    id:'th_uv', symbol:'/θ/', keyword:'think',
    desc:'舌先を軽く上の歯に当て、息だけを出す（無声th）。',
    examples:['think','three','truth','both','bath','mouth'],
    confuse:['dh','s','f'],
  },
  {
    id:'dh', symbol:'/ð/', keyword:'this',
    desc:'舌先を軽く噛みながら声を出す（有声th）。',
    examples:['this','they','with','breathe','that','smooth'],
    confuse:['th_uv','z','v'],
  },
  {
    id:'sh', symbol:'/ʃ/', keyword:'she',
    desc:'唇を前に突き出しながら「シュ」。',
    examples:['she','show','rush','nation','fish','push'],
    confuse:['zh','s','th_uv'],
  },
  {
    id:'zh', symbol:'/ʒ/', keyword:'vision',
    desc:'有声の「ジュ」。日本語にない音で vision・measure に使われる。',
    examples:['vision','measure','beige','treasure','usual','garage'],
    confuse:['sh','dh'],
  },
  {
    id:'r_eng', symbol:'/r/', keyword:'red',
    desc:'舌を巻かず口の中央に浮かせる。日本語の「ら行」とは別物。',
    examples:['red','run','write','road','right','wrong'],
    confuse:['l_eng','w'],
  },
  {
    id:'l_eng', symbol:'/l/', keyword:'led',
    desc:'舌先を上の歯茎にしっかりつける「ル」。/r/ との区別が最重要。',
    examples:['led','love','feel','light','world','life'],
    confuse:['r_eng','n'],
  },
  {
    id:'v_eng', symbol:'/v/', keyword:'van',
    desc:'上の歯を下唇に軽く当て、声を出しながら振動させる（有声）。',
    examples:['van','love','voice','vine','wave','save'],
    confuse:['b','f_eng','dh'],
  },
  {
    id:'f_eng', symbol:'/f/', keyword:'fan',
    desc:'上の歯を下唇に当て、息だけを出す（無声）。/v/ とペア。',
    examples:['fan','feel','life','phone','enough','leaf'],
    confuse:['v_eng','th_uv'],
  },
];

// ─────────────────────────────────────────────────────────────────
// クイズ生成
// ─────────────────────────────────────────────────────────────────
type IpaMode = 'sym-word' | 'word-sym';
type Verdict = 'correct' | 'wrong' | null;

interface Quiz {
  sound:      Sound;
  word:       string;   // 出題単語
  choices:    string[]; // 4択（sym-word→単語, word-sym→記号）
  correctIdx: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractorSounds(correct: Sound, n: number): Sound[] {
  const prefer  = SOUNDS.filter(s => s.id !== correct.id &&  correct.confuse.includes(s.id));
  const others  = SOUNDS.filter(s => s.id !== correct.id && !correct.confuse.includes(s.id));
  return [...shuffle(prefer), ...shuffle(others)].slice(0, n);
}

function buildQuiz(mode: IpaMode, prevId?: string): Quiz {
  const pool  = SOUNDS.filter(s => s.id !== prevId);
  const sound = pool[Math.floor(Math.random() * pool.length)];
  const word  = sound.examples[Math.floor(Math.random() * sound.examples.length)];
  const dists = distractorSounds(sound, 3);

  if (mode === 'sym-word') {
    // 正解=単語、選択肢=他の音の単語
    const distWords = dists.map(s => s.examples[Math.floor(Math.random() * s.examples.length)]);
    const choices   = shuffle([word, ...distWords]);
    return { sound, word, choices, correctIdx: choices.indexOf(word) };
  } else {
    // 正解=記号、選択肢=混同しやすい記号
    const choices = shuffle([sound.symbol, ...dists.map(s => s.symbol)]);
    return { sound, word, choices, correctIdx: choices.indexOf(sound.symbol) };
  }
}

// ─────────────────────────────────────────────────────────────────
// Web Speech API（en-US、ゆっくり目で明瞭に）
// ─────────────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt    = new SpeechSynthesisUtterance(text);
  utt.lang     = 'en-US';
  utt.rate     = 0.80;
  utt.pitch    = 1.0;
  utt.volume   = 1.0;
  if (onEnd) utt.onend = onEnd;
  // iOS は非同期初期化が必要なため短い delay を挟む
  setTimeout(() => window.speechSynthesis.speak(utt), 60);
}

// ─────────────────────────────────────────────────────────────────
// IPALearning コンポーネント
// ─────────────────────────────────────────────────────────────────
export function IPALearning() {
  const [ipaMode,  setIpaMode]  = useState<IpaMode>('sym-word');
  const [quiz,     setQuiz]     = useState<Quiz | null>(null);
  const [verdict,  setVerdict]  = useState<Verdict>(null);
  const [locked,   setLocked]   = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [total,    setTotal]    = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [heard,    setHeard]    = useState(false); // word-sym で一度でも聴いたか

  const prevIdRef = useRef<string | undefined>(undefined);

  const newQuiz = useCallback(() => {
    const q = buildQuiz(ipaMode, prevIdRef.current);
    prevIdRef.current = q.sound.id;
    setQuiz(q);
    setVerdict(null);
    setLocked(false);
    setHeard(false);
    setSpeaking(false);
  }, [ipaMode]);

  useEffect(() => { newQuiz(); }, [newQuiz]);

  // ─── 単語を読み上げる（スピーカーボタン用）────────────────────
  const handleSpeak = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    setHeard(true);
    speak(quiz.word, () => setSpeaking(false));
  }, [quiz]);

  // ─── 回答処理 ─────────────────────────────────────────────────
  const handleAnswer = useCallback((choice: string, idx: number) => {
    if (!quiz) return;
    const ok = idx === quiz.correctIdx;

    // ── 音声フィードバック（正誤どちらも押した選択肢の音を鳴らす）──
    if (ipaMode === 'sym-word') {
      // 選択肢は単語 → その単語をそのまま読み上げ
      speak(choice);
    } else {
      // 選択肢は記号 → 対応するキーワードを読み上げ
      const sel = SOUNDS.find(s => s.symbol === choice);
      speak(sel ? sel.keyword : choice);
    }

    if (!locked) {
      setTotal(t => t + 1);
      if (ok) {
        setVerdict('correct');
        setCorrect(c => c + 1);
        setTimeout(newQuiz, 1400);
      } else {
        setVerdict('wrong');
        setLocked(true);
        setTimeout(() => setVerdict(null), 1200);
      }
    } else {
      if (ok) { setVerdict('correct'); setTimeout(newQuiz, 1100); }
      else    { setVerdict('wrong');   setTimeout(() => setVerdict(null), 900); }
    }
  }, [quiz, locked, ipaMode, newQuiz]);

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const changeMode = (m: IpaMode) => {
    setIpaMode(m); setCorrect(0); setTotal(0);
  };

  if (!quiz) return null;

  return (
    <div className="flex flex-col gap-3 pb-28 max-w-md mx-auto px-4">

      {/* ── モード切替 ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          ['sym-word', '🔤 記号 → 単語', 'IPA記号を見て単語を選ぶ'],
          ['word-sym', '🔊 単語 → 記号', '単語を聴いてIPA記号を選ぶ'],
        ] as [IpaMode, string, string][]).map(([id, label, sub]) => (
          <button key={id} onClick={() => changeMode(id)}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              ipaMode === id
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{label}</span>
            <span className={`block text-[9px] mt-0.5 ${ipaMode === id ? 'text-violet-200' : 'text-gray-400'}`}>
              {sub}
            </span>
          </button>
        ))}
      </div>

      {/* ── 問題エリア ── */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        style={{ minHeight: 155 }}>

        {ipaMode === 'sym-word' ? (
          /* 記号→単語：IPA記号をクリックすると模範発音を再生 */
          <div className="flex flex-col items-center justify-center py-5 gap-2 px-4">
            <p className="text-[10px] text-gray-400">この発音記号が含まれる単語はどれ？</p>
            <button
              onClick={() => { setSpeaking(true); speak(quiz.word, () => setSpeaking(false)); }}
              className={`text-[80px] font-black leading-none tracking-tight transition-all active:scale-95 ${
                speaking ? 'text-violet-400 animate-pulse' : 'text-violet-700 hover:text-violet-500'
              }`}
              title={`タップして「${quiz.word}」の発音を聴く`}
            >
              {quiz.sound.symbol}
            </button>
            <p className={`text-[10px] font-semibold transition-colors ${
              speaking ? 'text-violet-400' : 'text-violet-300'
            }`}>
              {speaking ? '🔊 再生中…' : '👆 タップして模範発音を聴く'}
            </p>
            <p className="text-xs text-gray-500 text-center leading-relaxed max-w-[260px]">
              {quiz.sound.desc}
            </p>
          </div>
        ) : (
          /* 単語→記号：単語 + 🔊ボタン */
          <div className="flex flex-col items-center justify-center py-5 gap-3 px-4">
            <p className="text-[10px] text-gray-400">
              この単語の主な母音/子音の発音記号は？
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-black text-gray-800 leading-none tracking-wide select-none">
                {quiz.word}
              </span>
              <button onClick={handleSpeak}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                  speaking
                    ? 'bg-violet-500 text-white animate-pulse shadow-md'
                    : heard
                    ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                    : 'bg-violet-600 text-white shadow-md hover:bg-violet-700 animate-bounce'
                }`}
                title="発音を聴く">
                <span className="text-2xl leading-none">🔊</span>
                <span className="text-[8px] font-bold leading-none">{speaking ? '再生中' : '聴く'}</span>
              </button>
            </div>
            {!heard && (
              <p className="text-[10px] text-violet-500 font-semibold animate-pulse">
                ↑ まず発音を聴いてみよう！
              </p>
            )}
          </div>
        )}

        {/* 正誤オーバーレイ */}
        {verdict && (
          <div className={`absolute inset-0 flex items-center justify-end pr-8 pointer-events-none rounded-2xl ${
            verdict === 'correct' ? 'bg-emerald-500/15' : 'bg-red-500/15'
          }`}>
            <span className={`text-6xl font-black drop-shadow ${
              verdict === 'correct' ? 'text-emerald-500' : 'text-red-500'
            }`}>{verdict === 'correct' ? '◯' : '✕'}</span>
          </div>
        )}
      </div>

      {/* ── ロック中 ── */}
      {locked && verdict === null && (
        <p className="text-xs text-red-600 font-semibold animate-pulse text-center">
          正解するまで次へ進めません！
        </p>
      )}

      {/* ── 回答ボタン（4択 2×2 グリッド） ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {quiz.choices.map((choice, idx) => {
          const isAns   = idx === quiz.correctIdx;
          const showHint = verdict === 'wrong'   && isAns;
          const showWin  = verdict === 'correct' && isAns;
          return (
            <button key={`${choice}-${idx}`}
              onClick={() => handleAnswer(choice, idx)}
              disabled={verdict === 'correct'}
              className={`py-4 px-3 rounded-2xl font-black transition-all active:scale-95 flex flex-col items-center gap-1 ${
                showHint
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : showWin
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-800 hover:bg-violet-50 hover:border-violet-300 shadow-sm'
              }`}>
              {ipaMode === 'sym-word' ? (
                /* 単語ボタン */
                <>
                  <span className="text-xl leading-none">{choice}</span>
                  {showHint && (
                    <span className="text-[9px] font-semibold text-emerald-600">← 正解！</span>
                  )}
                </>
              ) : (
                /* 記号ボタン */
                <>
                  <span className="text-3xl leading-none tracking-tight">{choice}</span>
                  {/* 不正解ヒント：正解ボタンの場合のみキーワードを表示 */}
                  {showHint && (
                    <span className="text-[9px] font-semibold text-emerald-600">
                      ← {SOUNDS.find(s => s.symbol === choice)?.keyword}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 正解後 解説バッジ ── */}
      {verdict === 'correct' && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
          <span className="text-violet-500 text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-xs font-black text-violet-800">
              {quiz.sound.symbol} — 例: {quiz.sound.keyword}
            </p>
            <p className="text-[10px] text-violet-600 leading-relaxed mt-0.5">
              {quiz.sound.desc}
            </p>
          </div>
        </div>
      )}

      {/* ── スコア ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">正答率</span>
          <span className="text-base font-black text-violet-600">{accuracy}%</span>
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
