'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── 定数・型 ─────────────────────────────────────────────────────
const LS_KEY = 'english-journal-v1';

interface JournalEntry {
  date: string;  // "YYYY-MM-DD"
  text: string;
}

// ─── ユーティリティ ───────────────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  // "YYYY-MM-DD" → "2025年7月31日（木）" 形式
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('ja-JP', {
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

// ─── TTS ──────────────────────────────────────────────────────────
function startReading(text: string, onEnd: () => void): void {
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.88;
  utt.pitch = 1.0;
  utt.onend = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopReading(): void {
  window.speechSynthesis.cancel();
}

// ─── メインコンポーネント ─────────────────────────────────────────
export function EnglishJournal() {
  const [entries,     setEntries]     = useState<JournalEntry[]>([]);
  const [date,        setDate]        = useState(todayStr());
  const [text,        setText]        = useState('');
  const [readingDate, setReadingDate] = useState<string | null>(null);
  const [saved,       setSaved]       = useState(false);

  // クライアントサイドのみで読み込み（SSR対策）
  useEffect(() => { setEntries(loadEntries()); }, []);

  // アンマウント時にTTSを停止
  useEffect(() => () => { stopReading(); }, []);

  // 現在日付のエントリがあるか確認
  const editingExisting = entries.some(e => e.date === date);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !date) return;
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date);
      const next = [{ date, text: trimmed }, ...filtered]
        .sort((a, b) => b.date.localeCompare(a.date));
      saveToLS(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setText('');
  }, [date, text]);

  const handleDelete = useCallback((d: string) => {
    if (!window.confirm(`${formatDate(d)} の日記を削除しますか？`)) return;
    if (readingDate === d) { stopReading(); setReadingDate(null); }
    setEntries(prev => {
      const next = prev.filter(e => e.date !== d);
      saveToLS(next);
      return next;
    });
  }, [readingDate]);

  const handleEdit = useCallback((entry: JournalEntry) => {
    setDate(entry.date);
    setText(entry.text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReadAloud = useCallback((entry: JournalEntry) => {
    if (readingDate === entry.date) {
      stopReading();
      setReadingDate(null);
      return;
    }
    setReadingDate(entry.date);
    startReading(entry.text, () => setReadingDate(null));
  }, [readingDate]);

  return (
    <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">

      {/* ══ 入力セクション ══ */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📔</span>
          <div>
            <h2 className="text-base font-black text-gray-900">英語日記を書く</h2>
            <p className="text-[10px] font-bold text-gray-700">English Journal — 毎日の練習</p>
          </div>
        </div>

        {/* 日付ピッカー */}
        <label className="block text-[10px] font-black text-gray-800 mb-1 uppercase tracking-widest">
          📅 日付
        </label>
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setSaved(false); }}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border-2 border-gray-300 text-sm font-black text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-500"
        />

        {/* テキストエリア */}
        <label className="block text-[10px] font-black text-gray-800 mb-1 uppercase tracking-widest">
          ✍️ 英文日記（English Text）
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false); }}
          placeholder={"Today, I went to the park and enjoyed the sunny weather.\nI met my friend there and we talked for a long time..."}
          rows={7}
          className="w-full mb-3 px-3 py-3 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />

        {/* 文字数カウント */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-700">
            {text.trim().split(/\s+/).filter(Boolean).length} 語 / {text.length} 文字
          </span>
          {editingExisting && (
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
              ⚠️ この日付は上書きになります
            </span>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={!text.trim()}
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
            上の入力欄から<br />最初の英語日記を書いてみましょう！
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-sm font-black text-gray-900">📚 過去の日記</span>
            <span className="text-xs font-black text-white bg-gray-700 px-2 py-0.5 rounded-full">
              {entries.length}件
            </span>
          </div>

          {entries.map(entry => {
            const isReading = readingDate === entry.date;
            return (
              <div key={entry.date}
                className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
                  isReading ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'
                }`}>

                {/* カードヘッダー */}
                <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${
                  isReading ? 'border-indigo-200 bg-indigo-100' : 'border-gray-100 bg-gray-50'
                }`}>
                  <span className="text-sm font-black text-gray-900">
                    {formatDate(entry.date)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* 読み上げ / 停止ボタン */}
                    <button
                      onClick={() => handleReadAloud(entry)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                        isReading
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-indigo-600 text-white shadow-sm'
                      }`}
                    >
                      {isReading ? '⏹ 停止' : '🔊 読み上げ'}
                    </button>
                    {/* 編集ボタン */}
                    <button
                      onClick={() => handleEdit(entry)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-700 bg-gray-200 active:scale-95 transition-all"
                      aria-label="編集"
                    >
                      ✏️
                    </button>
                    {/* 削除ボタン */}
                    <button
                      onClick={() => handleDelete(entry.date)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-red-700 bg-red-100 active:scale-95 transition-all"
                      aria-label="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* 日記本文 */}
                <div className="px-4 py-4">
                  {isReading && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-flex gap-0.5">
                        {[0,1,2].map(i => (
                          <span key={i}
                            className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        Reading aloud...
                      </span>
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900 leading-loose whitespace-pre-wrap">
                    {entry.text}
                  </p>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-700">
                      {entry.text.trim().split(/\s+/).filter(Boolean).length} 語
                    </span>
                    <span className="text-[10px] font-bold text-gray-700">
                      {entry.text.length} 文字
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
