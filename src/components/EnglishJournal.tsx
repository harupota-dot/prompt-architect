'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── 定数・型 ─────────────────────────────────────────────────────
const LS_KEY = 'english-journal-v4';

interface JournalEntry {
  date: string;           // "YYYY-MM-DD"
  english: string;        // 英文
  japanese: string;       // 和訳
  pronunciation: string;  // 発音・音声変化の解説
  phrases: string;        // 使えるフレーズ・連語の解説
}

type ReadType = 'en' | 'ja' | 'sel';
interface ReadState { date: string; type: ReadType }

// ─── ユーティリティ ───────────────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch { return []; }
}

function saveToLS(entries: JournalEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── TTS ──────────────────────────────────────────────────────────
function speakText(text: string, lang: string, onEnd: () => void): void {
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang   = lang;
  utt.rate   = lang === 'en-US' ? 0.88 : 1.0;
  utt.pitch  = 1.0;
  utt.onend  = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopSpeech(): void { window.speechSynthesis.cancel(); }

// ─── テキストエリア共通ラベル ─────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black text-gray-900 mb-1 uppercase tracking-widest">
      {children}
    </p>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export function EnglishJournal() {
  const [entries,       setEntries]       = useState<JournalEntry[]>([]);
  const [date,          setDate]          = useState(todayStr());
  const [english,       setEnglish]       = useState('');
  const [japanese,      setJapanese]      = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [phrases,       setPhrases]       = useState('');
  const [readState,     setReadState]     = useState<ReadState | null>(null);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => { setEntries(loadEntries()); }, []);
  useEffect(() => () => { stopSpeech(); }, []);

  const editingExisting = entries.some(e => e.date === date);

  // ── 保存 ──
  const handleSave = useCallback(() => {
    const eng = english.trim();
    if (!eng || !date) return;
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date);
      const next = [
        { date, english: eng, japanese: japanese.trim(), pronunciation: pronunciation.trim(), phrases: phrases.trim() },
        ...filtered,
      ].sort((a, b) => b.date.localeCompare(a.date));
      saveToLS(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setEnglish('');
    setJapanese('');
    setPronunciation('');
    setPhrases('');
  }, [date, english, japanese, pronunciation, phrases]);

  // ── 削除 ──
  const handleDelete = useCallback((d: string) => {
    if (!window.confirm(`${formatDate(d)} の日記を削除しますか？`)) return;
    if (readState?.date === d) { stopSpeech(); setReadState(null); }
    setEntries(prev => {
      const next = prev.filter(e => e.date !== d);
      saveToLS(next);
      return next;
    });
  }, [readState]);

  // ── 編集（フォームに読み込み） ──
  const handleEdit = useCallback((entry: JournalEntry) => {
    setDate(entry.date);
    setEnglish(entry.english);
    setJapanese(entry.japanese);
    setPronunciation(entry.pronunciation ?? '');
    setPhrases(entry.phrases ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── 読み上げ ──
  const handleRead = useCallback((entry: JournalEntry, type: ReadType) => {
    if (readState?.date === entry.date && readState.type === type) {
      stopSpeech(); setReadState(null); return;
    }
    stopSpeech();

    let text = '';
    let lang = 'en-US';
    if (type === 'en') {
      text = entry.english; lang = 'en-US';
    } else if (type === 'ja') {
      text = entry.japanese; lang = 'ja-JP';
    } else {
      const sel = window.getSelection()?.toString().trim();
      if (!sel) { alert('読み上げたいテキストをドラッグして選択してください。'); return; }
      text = sel;
      lang = /[぀-ヿ一-鿿]/.test(sel) ? 'ja-JP' : 'en-US';
    }
    if (!text) return;
    setReadState({ date: entry.date, type });
    speakText(text, lang, () => setReadState(null));
  }, [readState]);

  const handleStop = useCallback(() => { stopSpeech(); setReadState(null); }, []);

  const isReading = (d: string, t?: ReadType) =>
    readState?.date === d && (t === undefined || readState.type === t);

  return (
    <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">

      {/* ══ 入力フォーム ══ */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-5 shadow-sm">

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📔</span>
          <div>
            <h2 className="text-base font-black text-gray-900">英語日記をストック</h2>
            <p className="text-[10px] font-bold text-gray-700">
              英文・和訳・発音・フレーズをセット保存 → シャドーイング用
            </p>
          </div>
        </div>

        {/* 日付 */}
        <FieldLabel>📅 日付</FieldLabel>
        <input
          type="date" value={date}
          onChange={e => { setDate(e.target.value); setSaved(false); }}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border-2 border-gray-300 text-sm font-black text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-500"
        />

        {/* 英文 */}
        <FieldLabel>🇺🇸 英文（English）</FieldLabel>
        <textarea
          value={english}
          onChange={e => { setEnglish(e.target.value); setSaved(false); }}
          placeholder={"Today, I woke up early and went for a morning run.\nThe air was fresh and the sky was clear..."}
          rows={7}
          className="w-full mb-1 px-3 py-3 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />
        <p className="text-[10px] font-bold text-gray-700 mb-3 text-right">
          {wordCount(english)} 語 / {english.length} 文字
        </p>

        {/* 和訳 */}
        <FieldLabel>🇯🇵 和訳（Japanese Translation）</FieldLabel>
        <textarea
          value={japanese}
          onChange={e => { setJapanese(e.target.value); setSaved(false); }}
          placeholder={"今日は早起きして、朝のランニングに行きました。\n空気が新鮮で、空はとても澄んでいました..."}
          rows={4}
          className="w-full mb-4 px-3 py-3 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-rose-400 resize-none leading-relaxed"
        />

        {/* 発音・音声変化の解説 */}
        <FieldLabel>🎙️ 発音・音声変化の解説（Pronunciation Tips）</FieldLabel>
        <textarea
          value={pronunciation}
          onChange={e => { setPronunciation(e.target.value); setSaved(false); }}
          placeholder={
            "例:\n" +
            "• \"went for\" → 「ウェン(t) フォー」t が弱まるリンキング\n" +
            "• \"The air\" → 「ジェア」 the の後に母音が来るので「ジ」\n" +
            "• 文末の \"clear\" は下げ調子で読む（Falling tone）"
          }
          rows={5}
          className="w-full mb-3 px-3 py-3 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
        />

        {/* 使えるフレーズ・連語の解説 */}
        <FieldLabel>💡 使えるフレーズ・連語の解説（Useful Phrases & Collocations）</FieldLabel>
        <textarea
          value={phrases}
          onChange={e => { setPhrases(e.target.value); setSaved(false); }}
          placeholder={
            "例:\n" +
            "• work out → 「トレーニングをする」go to the gym より自然\n" +
            "• feel great → 「すごく気持ちいい」I felt great! で感嘆のニュアンス\n" +
            "• for an hour → 「1時間」期間を表す前置詞 for + 時間"
          }
          rows={5}
          className="w-full mb-3 px-3 py-3 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
        />

        {editingExisting && (
          <p className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-3">
            ⚠️ この日付のエントリは上書き保存されます
          </p>
        )}

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={!english.trim()}
          className={`w-full py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-[0.98] ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-900 text-white disabled:opacity-40'
          }`}
        >
          {saved ? '✅ 保存しました！' : editingExisting ? '📝 上書き保存する' : '💾 日記を保存する'}
        </button>
      </div>

      {/* ══ 過去の日記リスト ══ */}
      {entries.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-5xl mb-4">📖</p>
          <p className="text-base font-black text-gray-900">まだ日記がありません</p>
          <p className="text-xs font-bold text-gray-700 mt-2 leading-relaxed">
            英文・和訳・発音メモをペーストして<br />保存してみましょう！
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 mb-1">
            <span className="text-sm font-black text-gray-900">📚 ストックした日記</span>
            <span className="text-xs font-black text-white bg-gray-800 px-2 py-0.5 rounded-full">
              {entries.length}件
            </span>
          </div>

          {entries.map(entry => {
            const anyReading = isReading(entry.date);
            return (
              <div key={entry.date}
                className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
                  anyReading ? 'border-indigo-400' : 'border-gray-200'
                }`}>

                {/* ── ヘッダー ── */}
                <div className={`flex items-center justify-between px-4 py-2.5 border-b-2 ${
                  anyReading ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <span className="text-sm font-black text-gray-900">{formatDate(entry.date)}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleEdit(entry)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-indigo-100 text-indigo-900 active:scale-95 transition-all">
                      ✏️ 編集
                    </button>
                    <button onClick={() => handleDelete(entry.date)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-red-100 text-red-900 active:scale-95 transition-all">
                      🗑️ 削除
                    </button>
                  </div>
                </div>

                {/* ── 読み上げボタン ── */}
                <div className="px-3 py-2.5 border-b-2 border-gray-100 bg-white">
                  {anyReading && (
                    <div className="flex items-center gap-1.5 mb-2">
                      {[0,1,2].map(i => (
                        <span key={i}
                          className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        {isReading(entry.date,'en')  && 'Reading English...'}
                        {isReading(entry.date,'ja')  && '日本語を読み上げ中...'}
                        {isReading(entry.date,'sel') && 'Reading selection...'}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {/* 英文読み上げ */}
                    <button onClick={() => handleRead(entry, 'en')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 ${
                        isReading(entry.date,'en') ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                      }`}>
                      {isReading(entry.date,'en') ? '⏹ 停止' : '🔊 英文を読む'}
                    </button>
                    {/* 和訳読み上げ */}
                    {entry.japanese && (
                      <button onClick={() => handleRead(entry, 'ja')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 ${
                          isReading(entry.date,'ja') ? 'bg-red-500 text-white' : 'bg-rose-600 text-white'
                        }`}>
                        {isReading(entry.date,'ja') ? '⏹ 停止' : '🔊 和訳を読む'}
                      </button>
                    )}
                    {/* 選択部分読み上げ */}
                    <button onClick={() => handleRead(entry, 'sel')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 ${
                        isReading(entry.date,'sel') ? 'bg-red-500 text-white' : 'bg-emerald-700 text-white'
                      }`}>
                      {isReading(entry.date,'sel') ? '⏹ 停止' : '✂️ 選択部分を読む'}
                    </button>
                    {/* 共通停止 */}
                    {anyReading && (
                      <button onClick={handleStop}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-gray-800 text-white active:scale-95 transition-all">
                        ⏹ すべて停止
                      </button>
                    )}
                  </div>
                </div>

                {/* ── 英文 ── */}
                <div className="px-4 pt-3 pb-3 bg-white">
                  <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1.5">
                    🇺🇸 English
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-loose whitespace-pre-wrap select-text">
                    {entry.english}
                  </p>
                  <p className="text-[10px] font-bold text-gray-700 mt-1">
                    {wordCount(entry.english)} 語 / {entry.english.length} 文字
                  </p>
                </div>

                {/* ── 和訳 ── */}
                {entry.japanese && (
                  <div className="px-4 py-3 border-t-2 border-dashed border-gray-200 bg-rose-50/40">
                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1.5">
                      🇯🇵 和訳
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-loose whitespace-pre-wrap select-text">
                      {entry.japanese}
                    </p>
                  </div>
                )}

                {/* ── 発音・音声変化の解説 ── */}
                {entry.pronunciation && (
                  <div className="px-4 py-3 border-t-2 border-dashed border-gray-200 bg-amber-50/50">
                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1.5">
                      🎙️ 発音・音声変化の解説
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-loose whitespace-pre-wrap select-text">
                      {entry.pronunciation}
                    </p>
                  </div>
                )}

                {/* ── 使えるフレーズ・連語の解説 ── */}
                {entry.phrases && (
                  <div className="px-4 py-3 border-t-2 border-dashed border-gray-200 bg-emerald-50/50">
                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1.5">
                      💡 使えるフレーズ・連語の解説
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-loose whitespace-pre-wrap select-text">
                      {entry.phrases}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
