'use client';

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// データ型
// ─────────────────────────────────────────────────────────────────
interface Sound {
  ipa:        string;
  hint:       string;
  speechHack: string;
  examples:   string[];
}

// ─────────────────────────────────────────────────────────────────
// 母音 21 音
// ─────────────────────────────────────────────────────────────────
const VOWELS: Sound[] = [
  { ipa: 'æ',       hint: 'アとエの中間',                             speechHack: 'aah',  examples: ['cat', 'hat'] },
  { ipa: 'ʌ',       hint: '喉の奥で短くアッ（LOVE 等）',              speechHack: 'uh',   examples: ['cut', 'up'] },
  { ipa: 'ɑ / ɒ',   hint: '口を大きく開けて',                         speechHack: 'ah',   examples: ['mop', 'top', 'lock'] },
  { ipa: 'ɑ:',      hint: '口を大きく開けて伸ばす',                    speechHack: 'ahh',  examples: ['father'] },
  { ipa: 'ɑ:r',     hint: '後半、舌先を丸める',                        speechHack: 'ar',   examples: ['arm', 'star', 'park'] },
  { ipa: 'ə',       hint: '力を抜いて「ア」',                          speechHack: 'uh',   examples: ['about', 'around', 'never'] },
  { ipa: 'ər / ɚ',  hint: '後半、舌先を丸める',                        speechHack: 'er',   examples: ['mother', 'brother'] },
  { ipa: 'ɜ:r',     hint: '長めに発音',                               speechHack: 'err',  examples: ['bird', 'burn', 'hurt'] },
  { ipa: 'ɪ',       hint: '力を抜いてイとエの中間（※ i から修正）',   speechHack: 'ih',   examples: ['sit', 'fit', 'big'] },
  { ipa: 'i:',      hint: '力を入れて「イー」',                        speechHack: 'ee',   examples: ['cheap', 'see', 'peach'] },
  { ipa: 'ʊ',       hint: '唇を丸めて短く「ウ」（※ u から修正）',     speechHack: 'ooh',  examples: ['good', 'book', 'put'] },
  { ipa: 'u:',      hint: '唇を突き出して「ウー」',                    speechHack: 'ooo',  examples: ['school', 'two', 'choose'] },
  { ipa: 'ɛ',       hint: 'はっきり「エ」（※ e から修正）',           speechHack: 'eh',   examples: ['set', 'head', 'check', 'pen'] },
  { ipa: 'ɔ:',      hint: '大きく縦に開けて喉の奥から「オー」',         speechHack: 'aw',   examples: ['saw', 'on'] },
  { ipa: 'ɔ:r',     hint: '後半、舌先を丸める',                        speechHack: 'or',   examples: ['pork', 'door', 'before'] },
  { ipa: 'aɪ',      hint: '二重母音：アィ',                           speechHack: 'eye',  examples: ['I', 'my', 'like'] },
  { ipa: 'aʊ',      hint: '二重母音：アゥ',                           speechHack: 'ow',   examples: ['out', 'found'] },
  { ipa: 'eɪ',      hint: '二重母音：エィ',                           speechHack: 'ay',   examples: ['day', 'great', 'say'] },
  { ipa: 'ɔɪ',      hint: '二重母音：オィ',                           speechHack: 'oy',   examples: ['boy', 'toy'] },
  { ipa: 'oʊ',      hint: '二重母音：オゥ（最後、唇をすぼめる）',      speechHack: 'oh',   examples: ['go', 'boat'] },
  { ipa: 'ju:',     hint: '二重母音：ユーゥ（最後、唇をすぼめる）',    speechHack: 'you',  examples: ['you', 'use', 'cute'] },
  { ipa: 'ɪr / ɪər', hint: '【追加】イァ（後半、舌先を丸める）',      speechHack: 'eer',  examples: ['here', 'ear', 'near'] },
  { ipa: 'ɛr / eər', hint: '【追加】エァ（後半、舌先を丸める）',      speechHack: 'air',  examples: ['hair', 'there', 'care'] },
  { ipa: 'ʊr / ʊər', hint: '【追加】ウァ（後半、舌先を丸める）',      speechHack: 'oor',  examples: ['tour', 'sure', 'pure'] },
];

// ─────────────────────────────────────────────────────────────────
// 子音 24 音
// ─────────────────────────────────────────────────────────────────
const CONSONANTS: Sound[] = [
  { ipa: 'p',  hint: 'プッ（息）',                         speechHack: 'puh', examples: ['put', 'pen'] },
  { ipa: 'b',  hint: 'ブッ（声）',                         speechHack: 'buh', examples: ['bed', 'bad', 'book'] },
  { ipa: 't',  hint: 'トゥッ（息）',                       speechHack: 'tuh', examples: ['took', 'take'] },
  { ipa: 'd',  hint: 'ドゥッ（声）',                       speechHack: 'duh', examples: ['dog', 'doc'] },
  { ipa: 'k',  hint: 'クッ（息）',                         speechHack: 'kuh', examples: ['lock', 'cook'] },
  { ipa: 'g',  hint: 'グッ（声）',                         speechHack: 'guh', examples: ['good', 'get'] },
  { ipa: 's',  hint: 'スッ（息）',                         speechHack: 'sss', examples: ['lost', 'sit'] },
  { ipa: 'z',  hint: 'ズッ（声）',                         speechHack: 'zzz', examples: ['zebra', 'zoo', 'crazy'] },
  { ipa: 'θ',  hint: 'スッ（息）舌を上下の歯で挟みながら',  speechHack: 'th',  examples: ['thank', 'month'] },
  { ipa: 'ð',  hint: 'ズッ（声）舌を上下の歯で挟みながら',  speechHack: 'thuh',examples: ['mother', 'brother', 'father'] },
  { ipa: 'ʃ',  hint: 'シッ（息）',                         speechHack: 'shh', examples: ['fashion', 'shout', 'wish'] },
  { ipa: 'ʒ',  hint: 'ジッ（声）',                         speechHack: 'zh',  examples: ['usually', 'major'] },
  { ipa: 'tʃ', hint: 'チッ（息）',                         speechHack: 'ch',  examples: ['teach', 'chicken'] },
  { ipa: 'dʒ', hint: 'ヂッ（声）',                         speechHack: 'juh', examples: ['change', 'Japan'] },
  { ipa: 'f',  hint: 'フッ（息）上の歯を下唇にかすらせる', speechHack: 'fff', examples: ['foot', 'fit'] },
  { ipa: 'v',  hint: 'ヴッ（声）上の歯を下唇にかすらせる', speechHack: 'vvv', examples: ['voice', 'visit'] },
  { ipa: 'l',  hint: '舌先を上歯茎にしっかりタッチ',       speechHack: 'lll', examples: ['lion', 'lemon', 'love'] },
  { ipa: 'r',  hint: '舌先丸める、どこにもタッチせず',      speechHack: 'rrr', examples: ['row', 'right'] },
  { ipa: 'h',  hint: '喉の奥からハッ',                     speechHack: 'huh', examples: ['hat', 'happen', 'how'] },
  { ipa: 'j',  hint: '「イ」の形で「イ」',                 speechHack: 'yuh', examples: ['yes', 'yet'] },
  { ipa: 'w',  hint: '唇を丸めて突き出し、急いで戻す',      speechHack: 'wuh', examples: ['what', 'wait', 'swim'] },
  { ipa: 'm',  hint: '鼻からム',                           speechHack: 'mmm', examples: ['yummy', 'make', 'more'] },
  { ipa: 'n',  hint: '鼻からヌ',                           speechHack: 'nnn', examples: ['nice', 'dinner'] },
  { ipa: 'ŋ',  hint: '鼻からング',                         speechHack: 'ng',  examples: ['singer', 'younger', 'song', 'wing'] },
];

type Category = 'vowel' | 'consonant';

// ─────────────────────────────────────────────────────────────────
// Web Speech API ヘルパー
// ─────────────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void, rate = 0.82): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-US';
  utt.rate   = rate;
  utt.pitch  = 1.0;
  utt.volume = 1.0;
  if (onEnd) utt.onend = onEnd;
  setTimeout(() => window.speechSynthesis.speak(utt), 60);
}

// ─────────────────────────────────────────────────────────────────
// IPALearning — フラッシュカード・辞書型
// ─────────────────────────────────────────────────────────────────
export function IPALearning() {
  const [category,     setCategory]     = useState<Category>('vowel');
  const [vowelIdx,     setVowelIdx]     = useState(0);
  const [consonantIdx, setConsonantIdx] = useState(0);
  const [speakingIpa,  setSpeakingIpa]  = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const list  = category === 'vowel' ? VOWELS : CONSONANTS;
  const index = category === 'vowel' ? vowelIdx : consonantIdx;
  const setIndex = category === 'vowel' ? setVowelIdx : setConsonantIdx;
  const sound = list[index];

  const resetSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeakingIpa(false);
    setSpeakingWord(null);
  };

  const switchCategory = (cat: Category) => {
    resetSpeaking();
    setCategory(cat);
  };

  const handleSpeakIpa = useCallback(() => {
    if (speakingIpa) return;
    setSpeakingIpa(true);
    speak(sound.speechHack, () => setSpeakingIpa(false), 0.72);
  }, [sound, speakingIpa]);

  const handleSpeakWord = useCallback((word: string) => {
    if (speakingWord) return;
    setSpeakingWord(word);
    speak(word, () => setSpeakingWord(null));
  }, [speakingWord]);

  const goPrev = () => { resetSpeaking(); setIndex(i => (i - 1 + list.length) % list.length); };
  const goNext = () => { resetSpeaking(); setIndex(i => (i + 1) % list.length); };

  // スワイプ検出
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };

  // グリッド列数
  const cols = sound.examples.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div
      className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* ── カテゴリ切り替えタブ ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          ['vowel',     '🗣 母音',    'Vowels',     `${VOWELS.length}音`],
          ['consonant', '💨 子音',    'Consonants', `${CONSONANTS.length}音`],
        ] as [Category, string, string, string][]).map(([cat, label, sub, count]) => (
          <button key={cat} onClick={() => switchCategory(cat)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              category === cat
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{label} <span className="font-normal opacity-80">{count}</span></span>
            <span className={`block text-[9px] mt-0.5 ${category === cat ? 'text-violet-200' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── 進捗インジケーター ── */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400 font-semibold flex-shrink-0">{index + 1} / {list.length}</span>
        <div className="flex gap-1 flex-wrap justify-center flex-1">
          {list.map((_, i) => (
            <button key={i}
              onClick={() => { resetSpeaking(); setIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? 'bg-violet-600 scale-125' : 'bg-gray-200 hover:bg-violet-300'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-gray-400 flex-shrink-0">← スワイプ →</span>
      </div>

      {/* ════════════════════════════════════════
          メインカード — IPA記号 + 発音のコツ
      ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">

        <div className={`px-6 pt-7 pb-5 flex flex-col items-center gap-3 ${
          category === 'vowel'
            ? 'bg-gradient-to-br from-violet-600 to-indigo-700'
            : 'bg-gradient-to-br from-teal-600 to-cyan-700'
        }`}>
          <button
            onClick={handleSpeakIpa}
            className={`transition-all active:scale-90 select-none ${speakingIpa ? 'scale-105' : 'hover:scale-105'}`}
            title="タップしてこの音を聴く"
          >
            <span className={`text-[76px] font-black leading-none tracking-tight block ${
              speakingIpa ? 'text-yellow-300 animate-pulse' : 'text-white drop-shadow-lg'
            }`}>
              {sound.ipa}
            </span>
          </button>

          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
            speakingIpa ? 'bg-yellow-400/30 border border-yellow-300/50' : 'bg-white/10 border border-white/20'
          }`}>
            <span className="text-sm">{speakingIpa ? '🔊' : '👆'}</span>
            <span className={`text-[11px] font-bold ${speakingIpa ? 'text-yellow-200' : 'text-white/80'}`}>
              {speakingIpa ? '再生中…' : 'タップしてこの音を聴く'}
            </span>
          </div>
        </div>

        {/* 発音のコツ */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <span className="text-violet-500 text-base flex-shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">発音のコツ</p>
              <p className="text-sm font-semibold text-gray-800 leading-relaxed">{sound.hint}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          代表単語カード（タップで読み上げ）
      ════════════════════════════════════════ */}
      <div>
        <p className="text-[11px] text-gray-500 font-semibold mb-2.5 text-center">
          👇 単語をタップして発音を聴いてみよう
        </p>
        <div className={`grid gap-2.5 ${cols}`}>
          {sound.examples.map(word => {
            const isPlaying = speakingWord === word;
            return (
              <button key={word} onClick={() => handleSpeakWord(word)}
                className={`py-4 px-3 rounded-2xl font-black text-xl leading-none transition-all active:scale-95 flex flex-col items-center gap-1.5 border ${
                  isPlaying
                    ? 'bg-violet-600 text-white border-violet-700 shadow-lg scale-[1.03]'
                    : 'bg-white text-gray-800 border-gray-200 hover:bg-violet-50 hover:border-violet-300 shadow-sm'
                }`}>
                <span>{word}</span>
                <span className={`text-[10px] font-semibold ${isPlaying ? 'text-violet-200' : 'text-gray-400'}`}>
                  {isPlaying ? '🔊 再生中…' : '🔊 タップ'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 前へ / 次へ */}
      <div className="flex gap-3 mt-1">
        <button onClick={goPrev}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
          ← 前の音
        </button>
        <button onClick={goNext}
          className="flex-1 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
          次の音 →
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex gap-3 justify-center text-[10px] text-gray-400 py-1">
        <span>🔊 大きな記号 = その音単体</span>
        <span>／</span>
        <span>🔊 単語カード = 単語の中での音</span>
      </div>

    </div>
  );
}
