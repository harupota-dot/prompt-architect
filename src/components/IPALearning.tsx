'use client';

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// データセット — 日本人洋楽歌唱でつまずく母音・子音 19音
// ─────────────────────────────────────────────────────────────────
interface Sound {
  id:      string;
  symbol:  string;    // '/æ/'
  desc:    string;    // 日本語の発音ヒント
  words:   string[];  // 代表的な英単語（表示は最大4つ）
  // IPA記号単体を speechSynthesis で鳴らすための phonetic spelling
  // en-US TTS が自然にその音を発するスペルを使う
  phonetic: string;
}

const SOUNDS: Sound[] = [
  // ── 母音 ─────────────────────────────────────────────────────
  {
    id:'ae', symbol:'/æ/',
    phonetic: 'aaah',
    desc:'「ア」と「エ」の中間。口を横に大きく開く。洋楽で最頻出の母音。',
    words:['cat','bad','man','black'],
  },
  {
    id:'uh', symbol:'/ʌ/',
    phonetic: 'uh',
    desc:'力を抜いて短くつぶす「ア」。love・come・sun の母音。',
    words:['cup','love','come','sun'],
  },
  {
    id:'aa', symbol:'/ɑː/',
    phonetic: 'aah',
    desc:'口を最大限に縦に開ける長い「アー」。father・hot（米）の母音。',
    words:['hot','father','start','car'],
  },
  {
    id:'schwa', symbol:'/ə/',
    phonetic: 'uh',
    desc:'力を完全に抜いた曖昧な「ア」。弱音節で非常に多く使われる。',
    words:['about','sofa','ago','banana'],
  },
  {
    id:'i', symbol:'/ɪ/',
    phonetic: 'ih',
    desc:'短く弱い「イ」。日本語の「イ」より口の力を抜く。',
    words:['sit','bit','big','with'],
  },
  {
    id:'ii', symbol:'/iː/',
    phonetic: 'ee',
    desc:'長く緊張させた「イー」。唇を横に引く。',
    words:['see','feel','dream','team'],
  },
  {
    id:'e', symbol:'/ɛ/',
    phonetic: 'eh',
    desc:'日本語より少し広めの「エ」。',
    words:['bed','red','said','friend'],
  },
  {
    id:'oo', symbol:'/uː/',
    phonetic: 'oo',
    desc:'唇を丸めて前に突き出す長い「ウー」。',
    words:['food','moon','blue','move'],
  },
  {
    id:'oo_short', symbol:'/ʊ/',
    phonetic: 'ooh',
    desc:'短く緩めの「ウ」。/uː/ より唇の力を抜く。book・good の母音。',
    words:['book','good','look','push'],
  },
  {
    id:'aw', symbol:'/ɔː/',
    phonetic: 'awe',
    desc:'唇を丸く開ける長い「オー」。saw・door・thought の母音。',
    words:['all','saw','more','thought'],
  },
  {
    id:'ei', symbol:'/eɪ/',
    phonetic: 'ay',
    desc:'「エ」から「イ」へ滑らかにつなぐ二重母音。',
    words:['day','make','rain','great'],
  },
  // ── 子音 ─────────────────────────────────────────────────────
  {
    id:'th_uv', symbol:'/θ/',
    phonetic: 'thhh',
    desc:'舌先を上の歯に軽く当て、息だけを出す（無声th）。',
    words:['think','three','truth','bath'],
  },
  {
    id:'dh', symbol:'/ð/',
    phonetic: 'thuh',
    desc:'舌先を軽く噛みながら声を出す（有声th）。',
    words:['this','they','with','that'],
  },
  {
    id:'sh', symbol:'/ʃ/',
    phonetic: 'shh',
    desc:'唇を前に突き出しながら「シュ」。',
    words:['she','show','rush','fish'],
  },
  {
    id:'zh', symbol:'/ʒ/',
    phonetic: 'zhh',
    desc:'有声の「ジュ」。vision・measure に使われる。日本語にない音。',
    words:['vision','measure','beige','garage'],
  },
  {
    id:'r_eng', symbol:'/r/',
    phonetic: 'rrr',
    desc:'舌を巻かず口の中央に浮かせる。日本語の「ら行」とは別物。',
    words:['red','run','road','right'],
  },
  {
    id:'l_eng', symbol:'/l/',
    phonetic: 'lll',
    desc:'舌先を上の歯茎にしっかりつける「ル」。/r/ との区別が最重要。',
    words:['led','love','light','life'],
  },
  {
    id:'v_eng', symbol:'/v/',
    phonetic: 'vvv',
    desc:'上の歯を下唇に当て、声を出しながら振動させる（有声）。',
    words:['van','love','voice','wave'],
  },
  {
    id:'f_eng', symbol:'/f/',
    phonetic: 'fff',
    desc:'上の歯を下唇に当て、息だけを出す（無声）。/v/ とペア。',
    words:['fan','feel','phone','leaf'],
  },
];

// ─────────────────────────────────────────────────────────────────
// Web Speech API ヘルパー
// ─────────────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void, rate = 0.82): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt   = new SpeechSynthesisUtterance(text);
  utt.lang    = 'en-US';
  utt.rate    = rate;
  utt.pitch   = 1.0;
  utt.volume  = 1.0;
  if (onEnd) utt.onend = onEnd;
  setTimeout(() => window.speechSynthesis.speak(utt), 60);
}

// ─────────────────────────────────────────────────────────────────
// IPALearning — フラッシュカード・辞書型
// ─────────────────────────────────────────────────────────────────
export function IPALearning() {
  const [index,        setIndex]        = useState(0);
  const [speakingIpa,  setSpeakingIpa]  = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const sound = SOUNDS[index];

  // IPA 記号単体の読み上げ（phonetic spelling ハック）
  const handleSpeakIpa = useCallback(() => {
    if (speakingIpa) return;
    setSpeakingIpa(true);
    speak(sound.phonetic, () => setSpeakingIpa(false), 0.75);
  }, [sound, speakingIpa]);

  // 単語の読み上げ
  const handleSpeakWord = useCallback((word: string) => {
    if (speakingWord) return;
    setSpeakingWord(word);
    speak(word, () => setSpeakingWord(null));
  }, [speakingWord]);

  const goPrev = () => {
    window.speechSynthesis?.cancel();
    setSpeakingIpa(false); setSpeakingWord(null);
    setIndex(i => (i - 1 + SOUNDS.length) % SOUNDS.length);
  };
  const goNext = () => {
    window.speechSynthesis?.cancel();
    setSpeakingIpa(false); setSpeakingWord(null);
    setIndex(i => (i + 1) % SOUNDS.length);
  };

  // スワイプ検出
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };

  return (
    <div
      className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* ── 進捗インジケーター ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-semibold">{index + 1} / {SOUNDS.length}</span>
        <div className="flex gap-1 flex-wrap justify-center flex-1 mx-3">
          {SOUNDS.map((_, i) => (
            <button key={i} onClick={() => { setIndex(i); setSpeakingIpa(false); setSpeakingWord(null); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? 'bg-violet-600 scale-125' : 'bg-gray-200 hover:bg-violet-300'
              }`} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400">← スワイプ →</span>
      </div>

      {/* ════════════════════════════════════════
          メインカード — IPA記号 + 発音ヒント
      ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">

        {/* 上部グラデーションヘッダー */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 pt-8 pb-6 flex flex-col items-center gap-4">

          {/* IPA 記号ボタン（タップで発音再生） */}
          <button
            onClick={handleSpeakIpa}
            className={`transition-all active:scale-90 select-none ${
              speakingIpa ? 'scale-105' : 'hover:scale-105'
            }`}
            title="タップしてこの音を聴く"
          >
            <span className={`text-[88px] font-black leading-none tracking-tight block ${
              speakingIpa ? 'text-yellow-300 animate-pulse' : 'text-white drop-shadow-lg'
            }`}>
              {sound.symbol}
            </span>
          </button>

          {/* スピーカー状態ラベル */}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
            speakingIpa
              ? 'bg-yellow-400/30 border border-yellow-300/50'
              : 'bg-white/10 border border-white/20'
          }`}>
            <span className="text-sm">{speakingIpa ? '🔊' : '👆'}</span>
            <span className={`text-[11px] font-bold ${speakingIpa ? 'text-yellow-200' : 'text-white/80'}`}>
              {speakingIpa ? '再生中…' : 'タップしてこの音を聴く'}
            </span>
          </div>
        </div>

        {/* 発音ヒント */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 leading-relaxed text-center">{sound.desc}</p>
        </div>
      </div>

      {/* ════════════════════════════════════════
          4つの代表単語カード
      ════════════════════════════════════════ */}
      <div>
        <p className="text-[11px] text-gray-500 font-semibold mb-2.5 text-center">
          👇 単語をタップして発音を聴いてみよう
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {sound.words.map(word => {
            const isPlaying = speakingWord === word;
            return (
              <button
                key={word}
                onClick={() => handleSpeakWord(word)}
                className={`py-4 px-3 rounded-2xl font-black text-xl leading-none transition-all active:scale-95 flex flex-col items-center gap-1.5 border ${
                  isPlaying
                    ? 'bg-violet-600 text-white border-violet-700 shadow-lg scale-[1.03]'
                    : 'bg-white text-gray-800 border-gray-200 hover:bg-violet-50 hover:border-violet-300 shadow-sm'
                }`}
              >
                <span>{word}</span>
                <span className={`text-[10px] font-semibold ${
                  isPlaying ? 'text-violet-200' : 'text-gray-400'
                }`}>
                  {isPlaying ? '🔊 再生中…' : '🔊 タップ'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════
          前へ / 次へ ナビゲーション
      ════════════════════════════════════════ */}
      <div className="flex gap-3 mt-1">
        <button onClick={goPrev}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
          <span>←</span> 前の音
        </button>
        <button onClick={goNext}
          className="flex-1 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
          次の音 <span>→</span>
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
