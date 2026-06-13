'use client';

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 母音 21 音データセット（ユーザー独自学習資料）
// ─────────────────────────────────────────────────────────────────
interface Sound {
  ipa:        string;   // 表示する IPA 記号
  hint:       string;   // 日本語の発音のコツ
  speechHack: string;   // en-US TTS がその音に近く読むダミースペル
  examples:   string[]; // 代表的な英単語
}

const SOUNDS: Sound[] = [
  { ipa: 'æ',     hint: 'アとエの中間',                           speechHack: 'aah',  examples: ['cat'] },
  { ipa: 'ʌ',     hint: '喉の奥で短くアッ（LOVE 等）',            speechHack: 'uh',   examples: ['cut', 'up'] },
  { ipa: 'ɑ / ɒ', hint: '口を大きく開けて',                       speechHack: 'ah',   examples: ['mop', 'top', 'lock'] },
  { ipa: 'ɑ:',    hint: '口を大きく開けて伸ばす',                  speechHack: 'ahh',  examples: ['father'] },
  { ipa: 'ɑ:r',   hint: '後半、舌先を丸める',                      speechHack: 'ar',   examples: ['arm', 'star', 'park'] },
  { ipa: 'ə',     hint: '力を抜いて「ア」',                        speechHack: 'uh',   examples: ['about', 'around', 'never'] },
  { ipa: 'ər',    hint: '後半、舌先を丸める',                      speechHack: 'er',   examples: ['father', 'mother'] },
  { ipa: 'ə:r',   hint: '長めに発音',                             speechHack: 'err',  examples: ['bird', 'burn', 'hurt'] },
  { ipa: 'i',     hint: '力を抜いてイとエの中間',                  speechHack: 'ih',   examples: ['sit', 'fit', 'big'] },
  { ipa: 'i:',    hint: '力を入れて「イー」',                      speechHack: 'ee',   examples: ['cheap', 'see', 'peach'] },
  { ipa: 'u',     hint: '唇を丸めて短く「ウ」',                    speechHack: 'ooh',  examples: ['good', 'book', 'put'] },
  { ipa: 'u:',    hint: '唇を突き出して「ウー」',                  speechHack: 'ooo',  examples: ['school', 'two', 'choose'] },
  { ipa: 'e',     hint: 'はっきり「エ」',                         speechHack: 'eh',   examples: ['set', 'head', 'check', 'pen'] },
  { ipa: 'ɔ:',    hint: '大きく縦に開けて喉の奥から「オー」',       speechHack: 'aw',   examples: ['saw', 'on'] },
  { ipa: 'ɔ:r',   hint: '後半、舌先を丸める',                      speechHack: 'or',   examples: ['pork', 'door', 'before'] },
  { ipa: 'ai',    hint: '二重母音：アィ',                         speechHack: 'eye',  examples: ['I', 'my', 'like'] },
  { ipa: 'au',    hint: '二重母音：アゥ',                         speechHack: 'ow',   examples: ['out', 'found'] },
  { ipa: 'ei',    hint: '二重母音：エィ',                         speechHack: 'ay',   examples: ['day', 'great', 'say'] },
  { ipa: 'ɔi',    hint: '二重母音：オィ',                         speechHack: 'oy',   examples: ['boy', 'toy'] },
  { ipa: 'ou',    hint: '二重母音：オゥ（最後、唇をすぼめる）',    speechHack: 'oh',   examples: ['go', 'boat'] },
  { ipa: 'ju:',   hint: '二重母音：ユーゥ（最後、唇をすぼめる）',  speechHack: 'you',  examples: ['you', 'use', 'cute'] },
];

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
  const [index,        setIndex]        = useState(0);
  const [speakingIpa,  setSpeakingIpa]  = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const sound = SOUNDS[index];

  const resetSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeakingIpa(false);
    setSpeakingWord(null);
  };

  // IPA 記号単体の読み上げ（speechHack ダミースペルを使用）
  const handleSpeakIpa = useCallback(() => {
    if (speakingIpa) return;
    setSpeakingIpa(true);
    speak(sound.speechHack, () => setSpeakingIpa(false), 0.72);
  }, [sound, speakingIpa]);

  // 単語の読み上げ
  const handleSpeakWord = useCallback((word: string) => {
    if (speakingWord) return;
    setSpeakingWord(word);
    speak(word, () => setSpeakingWord(null));
  }, [speakingWord]);

  const goPrev = () => {
    resetSpeaking();
    setIndex(i => (i - 1 + SOUNDS.length) % SOUNDS.length);
  };
  const goNext = () => {
    resetSpeaking();
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400 font-semibold flex-shrink-0">{index + 1} / {SOUNDS.length}</span>
        <div className="flex gap-1 flex-wrap justify-center flex-1">
          {SOUNDS.map((_, i) => (
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
          メインカード — IPA記号 + 発音ヒント
      ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">

        {/* グラデーションヘッダー：IPA 記号 */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 pt-7 pb-5 flex flex-col items-center gap-3">
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

        {/* 発音のコツ（日本語解説） */}
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
        <div className={`grid gap-2.5 ${sound.examples.length <= 2 ? 'grid-cols-2' : sound.examples.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {sound.examples.map(word => {
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
                <span className={`text-[10px] font-semibold ${isPlaying ? 'text-violet-200' : 'text-gray-400'}`}>
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
