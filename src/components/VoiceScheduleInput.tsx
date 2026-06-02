'use client';

import { useState, useRef, useCallback } from 'react';
import { addTask, today } from '@/lib/shared-store';

// ── 型 ───────────────────────────────────────────────────────────
interface ParsedItem {
  id:            string;
  title:         string;
  description?:  string;
  startDate:     string;
  time?:         string;
  duration?:     number;
  recurrence:    'none' | 'daily' | 'weekly';
  category:      'study' | 'work' | 'health' | 'other';
}

interface ScheduleResponse {
  items:          ParsedItem[];
  spartanMessage: string;
  summary:        string;
  error?:         string;
}

interface Props {
  onTasksAdded: () => void;
  speakSpartan: (text: string) => void;
}

// ── 音声入力 → Gemini解析 → 自動登録コンポーネント ─────────────────
export function VoiceScheduleInput({ onTasksAdded, speakSpartan }: Props) {
  const [isOpen,       setIsOpen]       = useState(false);
  const [isListening,  setIsListening]  = useState(false);
  const [transcript,   setTranscript]   = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [items,        setItems]        = useState<ParsedItem[]>([]);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [spartan,      setSpartan]      = useState('');
  const [addResult,    setAddResult]    = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [noSpeechAPI,  setNoSpeechAPI]  = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── 音声認識開始 ─────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechAPI = typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;

    if (!SpeechAPI) {
      setNoSpeechAPI(true);
      speakSpartan('このブラウザは音声入力に対応していない！ChromeまたはSafariを使え！');
      return;
    }

    setError(null);
    setTranscript('');
    setItems([]);
    setSelected(new Set());
    setAddResult(null);
    setSpartan('');

    const recognition = new SpeechAPI();
    recognition.lang            = 'ja-JP';
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend   = () => setIsListening(false);

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (e.error === 'no-speech') {
        setError('音声を検知できませんでした。もう少し大きな声で話してください。');
      } else if (e.error === 'not-allowed') {
        setError('マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。');
      } else {
        setError(`音声認識エラー: ${e.error}`);
      }
      speakSpartan('音声認識に失敗した！もう一度はっきり話せ！');
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // 中間結果も含めて表示
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      setTranscript(prev => prev + final || interim);

      // 最終結果でAPIに送る
      if (final) {
        processText(final);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speakSpartan]); // eslint-disable-line

  // ── 音声認識停止 ─────────────────────────────────────────────
  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ── テキストをGeminiでパース ──────────────────────────────────
  const processText = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res  = await fetch('/api/schedule', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json() as ScheduleResponse;

      if (data.error) throw new Error(data.error);

      const parsed = (data.items ?? []).map((item, i) => ({
        ...item,
        id: item.id ?? `voice-${Date.now()}-${i}`,
      })) as ParsedItem[];

      setItems(parsed);
      setSelected(new Set(parsed.map(i => i.id)));
      setSpartan(data.spartanMessage ?? '');

      if (parsed.length === 0) {
        setError('スケジュール情報を読み取れませんでした。「明日15時からピアノの練習」のように具体的に言ってください。');
        speakSpartan('予定が読み取れなかった！もっと具体的に言え！例: 明日15時からピアノの練習！');
      } else {
        speakSpartan(data.spartanMessage || `${parsed.length}件の予定を解析した！確認して登録しろ！`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー';
      setError(`解析エラー: ${msg}`);
      speakSpartan('解析に失敗した！もう一度はっきり言え！');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 手入力テキストをAPIに送る ─────────────────────────────────
  const handleManualSubmit = () => {
    if (!transcript.trim()) return;
    processText(transcript);
  };

  // ── 選択トグル ────────────────────────────────────────────────
  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── 選択した予定を一括登録 ────────────────────────────────────
  const handleAddSelected = () => {
    let added = 0;

    for (const item of items) {
      if (!selected.has(item.id)) continue;

      const date = item.startDate || today();
      addTask({
        title:          item.title,
        description:    item.description,
        scheduledDate:  date,
        scheduledTime:  item.time,
        estimatedMin:   item.duration,
        category:       item.category ?? 'other',
        priority:       'HIGH',
        recurrence:     item.recurrence ?? 'none',
        status:         'TODO',
        source:         'ai-parsed',
        notifyEnabled:  true,
        notifyTiming:   'task-time',
      });
      added++;
    }

    onTasksAdded();

    if (added > 0) {
      setAddResult(`✅ ${added}件を登録しました！`);
      speakSpartan(`よし！${added}件の予定を登録した！サボったら承知しないぞ！`);
    }

    if (added > 0) {
      setTimeout(() => {
        setIsOpen(false);
        setTranscript('');
        setItems([]);
        setAddResult(null);
      }, 2500);
    }
  };

  // ── 閉じてリセット ─────────────────────────────────────────────
  const handleClose = () => {
    stopListening();
    setIsOpen(false);
    setTranscript('');
    setItems([]);
    setAddResult(null);
    setError(null);
    setSpartan('');
  };

  return (
    <>
      {/* ── FAB トリガーボタン ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={`w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all ${
          isListening
            ? 'bg-red-500 animate-pulse'
            : 'bg-gradient-to-br from-orange-500 to-red-600'
        }`}
        title="音声でスケジュールを追加"
      >
        🎤
      </button>

      {/* ── モーダル ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'min(92vh, 88dvh)' }}>

            {/* ヘッダー */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-500 to-red-600 flex-shrink-0">
              <span className="text-2xl">{isListening ? '🔴' : '🎤'}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-white">音声でスケジュールを追加</p>
                <p className="text-[10px] text-orange-100">「明日15時からピアノ練習」と話すだけでOK</p>
              </div>
              <button onClick={handleClose} className="text-orange-200 hover:text-white text-lg font-bold">✕</button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* 対応なし */}
              {noSpeechAPI && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800">⚠️ 音声入力非対応のブラウザです</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Chrome・Edge・Safariをご利用ください。<br/>
                    下のテキストボックスから直接入力できます。
                  </p>
                </div>
              )}

              {/* マイクボタン */}
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-all shadow-lg ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse scale-110'
                      : 'bg-gradient-to-br from-orange-400 to-red-500 text-white hover:scale-105 active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
                <p className="text-xs font-semibold text-gray-600">
                  {isListening ? '🔴 聴いています... もう一度押すと停止'
                   : isProcessing ? '⏳ AIが解析中...'
                   : 'タップして話す'}
                </p>
              </div>

              {/* 入力例 */}
              {!transcript && !isListening && (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                  <p className="text-[10px] font-bold text-orange-700 mb-1.5">💬 入力例：</p>
                  {[
                    '明日15時からピアノの練習、1時間半',
                    '毎週月曜日の午後3時にバンド練習',
                    '今週金曜日の10時からレコーディング',
                    '明後日9時に病院の予約、45分',
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => { setTranscript(ex); processText(ex); }}
                      className="block w-full text-left text-[10px] text-orange-600 py-1 hover:text-orange-800 hover:underline leading-relaxed"
                    >
                      ▶ {ex}
                    </button>
                  ))}
                </div>
              )}

              {/* 認識テキスト表示 */}
              {(transcript || isListening) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-500">認識したテキスト：</p>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[3rem]">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {transcript || <span className="text-gray-300 italic">話してください...</span>}
                    </p>
                  </div>
                  {!isListening && transcript && !isProcessing && items.length === 0 && !addResult && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualSubmit}
                        className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-all"
                      >
                        🔍 このテキストで解析
                      </button>
                      <button
                        onClick={() => { setTranscript(''); setError(null); }}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs hover:bg-gray-50"
                      >
                        クリア
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* テキスト直接入力 */}
              {!isListening && !transcript && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 text-center">または直接テキスト入力</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="例: 明日15時からピアノ練習"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          setTranscript(val);
                          processText(val);
                        }
                      }}
                    />
                    <button
                      onClick={e => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input?.value) { setTranscript(input.value); processText(input.value); }
                      }}
                      className="px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600"
                    >
                      解析
                    </button>
                  </div>
                </div>
              )}

              {/* 処理中 */}
              {isProcessing && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin flex-shrink-0" />
                  <p className="text-xs text-orange-700 font-semibold">Gemini AIが解析中...</p>
                </div>
              )}

              {/* エラー */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-700">⛔ {error}</p>
                </div>
              )}

              {/* スパルタメッセージ */}
              {spartan && !isProcessing && (
                <div className="flex items-start gap-2 p-3 bg-gray-900 rounded-xl">
                  <span className="text-lg flex-shrink-0">🔥</span>
                  <p className="text-xs text-white font-semibold leading-relaxed">{spartan}</p>
                </div>
              )}

              {/* 解析結果 */}
              {items.length > 0 && !isProcessing && !addResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-gray-800">
                      📋 {items.length}件の予定を検出
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelected(new Set(items.map(i => i.id)))}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                      >全選択</button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelected(new Set())}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >全解除</button>
                    </div>
                  </div>

                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selected.has(item.id)
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 bg-white opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                          selected.has(item.id)
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {selected.has(item.id) && <span className="text-[10px]">✓</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900">{item.title}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              📅 {item.startDate}
                            </span>
                            {item.time && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                                🕐 {item.time}
                              </span>
                            )}
                            {item.duration && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                ⏱ {item.duration}分
                              </span>
                            )}
                            {item.recurrence !== 'none' && (
                              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                                🔁 {item.recurrence === 'weekly' ? '毎週' : '毎日'}
                              </span>
                            )}
                            <span className="text-[9px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full">
                              {item.category === 'study' ? '📚' : item.category === 'health' ? '💪' : item.category === 'work' ? '💼' : '📌'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 登録結果 */}
              {addResult && (
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  addResult.startsWith('✅')
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {addResult}
                </div>
              )}
            </div>

            {/* フッターボタン */}
            {items.length > 0 && !addResult && (
              <div className="px-5 pb-5 flex-shrink-0 flex gap-3">
                <button
                  onClick={handleAddSelected}
                  disabled={selected.size === 0}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white text-sm font-black transition-all"
                >
                  🔥 選択した{selected.size}件を登録
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
