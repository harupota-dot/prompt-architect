'use client';

import { useState, useRef, useCallback } from 'react';
import { addTask, checkTimeConflict, today } from '@/lib/shared-store';

// ── 型 ───────────────────────────────────────────────────────────
interface VisionItem {
  id:          string;
  title:       string;
  description?: string;
  startDate:   string;
  time?:       string;
  duration?:   number;
  recurrence:  'none' | 'daily' | 'weekly';
  category:    'study' | 'work' | 'health' | 'other';
}

interface Props {
  onTasksAdded: () => void;
  speakSpartan: (text: string) => void;
}

// ── カメラ撮影 → Gemini解析 → スケジュール自動登録 ───────────────
export function CameraScheduleInput({ onTasksAdded, speakSpartan }: Props) {
  const [isOpen,     setIsOpen]     = useState(false);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [items,      setItems]      = useState<VisionItem[]>([]);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [spartan,    setSpartan]     = useState('');
  const [summary,    setSummary]     = useState('');
  const [addResult,  setAddResult]  = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── カメラ / ファイル選択 ─────────────────────────────────────
  const handleCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl  = ev.target?.result as string;
      const base64   = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      setPreview(dataUrl);
      setItems([]);
      setSelected(new Set());
      setSpartan('');
      setSummary('');
      setAddResult(null);
      setError(null);
      setIsLoading(true);

      try {
        const res  = await fetch('/api/schedule/vision', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const data = await res.json() as {
          items: VisionItem[]; spartanMessage: string; summary: string; error?: string;
        };

        if (data.error) throw new Error(data.error);

        setItems(data.items ?? []);
        setSelected(new Set((data.items ?? []).map(i => i.id)));
        setSpartan(data.spartanMessage ?? '');
        setSummary(data.summary ?? '');

        if ((data.items ?? []).length === 0) {
          speakSpartan('画像からスケジュールを読み取れなかった！もっとはっきり写せ！');
        } else {
          speakSpartan(data.spartanMessage || `${data.items.length}件の予定を発見した！確認して登録しろ！`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー';
        setError(msg);
        speakSpartan('画像の解析に失敗した！もう一度やり直せ！');
      } finally {
        setIsLoading(false);
        // ファイル入力をリセット（同じファイルを再選択できるように）
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  }, [speakSpartan]);

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
    const conflictMsgs: string[] = [];

    for (const item of items) {
      if (!selected.has(item.id)) continue;

      // 重複チェック
      const date = item.startDate || today();
      if (item.time) {
        const conflict = checkTimeConflict(date, item.time, item.duration ?? 90);
        if (conflict) {
          conflictMsgs.push(`「${item.title}」→「${conflict.name}」と重複`);
          continue;
        }
      }

      addTask({
        title:          item.title,
        description:    item.description,
        scheduledDate:  date,
        scheduledTime:  item.time,
        estimatedMin:   item.duration ?? (item.time ? 90 : undefined),
        category:       item.category ?? 'study',
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

    if (conflictMsgs.length > 0) {
      const msg = `${added}件登録。重複でスキップ${conflictMsgs.length}件: ${conflictMsgs[0]}`;
      setAddResult(msg);
      speakSpartan(
        `${added}件を登録した！ただし${conflictMsgs.length}件は重複でスキップした！` +
        conflictMsgs[0] + 'その時間はすでに予定があるぞ！'
      );
    } else if (added > 0) {
      setAddResult(`✅ ${added}個の予定を自動登録しました！`);
      speakSpartan(`よし！画像から${added}件の予定を登録した！サボったら承知しないぞ！`);
    } else {
      setAddResult('登録する予定が選択されていません。');
    }

    // 3秒後に閉じる
    if (added > 0) {
      setTimeout(() => {
        setIsOpen(false);
        setPreview(null);
        setItems([]);
        setAddResult(null);
      }, 3000);
    }
  };

  // ── 閉じてリセット ─────────────────────────────────────────────
  const handleClose = () => {
    setIsOpen(false);
    setPreview(null);
    setItems([]);
    setSelected(new Set());
    setAddResult(null);
    setError(null);
    setSpartan('');
  };

  return (
    <>
      {/* ── FAB トリガーボタン ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all"
        title="カメラで予定を撮影して登録"
      >
        📷
      </button>

      {/* ── モーダル ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* ヘッダー */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-700 flex-shrink-0">
              <span className="text-2xl">📷</span>
              <div className="flex-1">
                <p className="text-sm font-black text-white">カメラで予定を自動登録</p>
                <p className="text-[10px] text-violet-200">時間割・プリントを撮影するだけでOK</p>
              </div>
              <button onClick={handleClose} className="text-violet-200 hover:text-white text-lg font-bold">✕</button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* 撮影ボタン + ファイル選択 */}
              {!preview && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    予定・時間割が書かれたプリントや黒板をカメラで撮影すると、
                    AIがスケジュールを自動で読み取ってアプリに登録します。
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* カメラ撮影 */}
                    <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-violet-300 rounded-2xl bg-violet-50 cursor-pointer hover:bg-violet-100 transition-all">
                      <span className="text-3xl">📷</span>
                      <span className="text-xs font-bold text-violet-700">カメラで撮影</span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCapture}
                        className="hidden"
                      />
                    </label>
                    {/* ファイル選択 */}
                    <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all">
                      <span className="text-3xl">🖼️</span>
                      <span className="text-xs font-bold text-gray-600">画像を選択</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCapture}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* プレビュー */}
              {preview && (
                <div className="space-y-3">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="撮影した画像"
                      className="w-full max-h-48 object-contain rounded-2xl border border-gray-200"
                    />
                    <button
                      onClick={() => { setPreview(null); setItems([]); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70"
                    >✕</button>
                  </div>
                </div>
              )}

              {/* ローディング */}
              {isLoading && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-12 h-12 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-violet-700">Gemini AIが画像を解析中...</p>
                  <p className="text-xs text-gray-400">数秒かかることがあります</p>
                </div>
              )}

              {/* エラー */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-700">⛔ 解析エラー</p>
                  <p className="text-[10px] text-red-600 mt-0.5">{error}</p>
                  <button
                    onClick={() => { setError(null); setPreview(null); }}
                    className="mt-2 text-[10px] text-red-500 underline"
                  >やり直す</button>
                </div>
              )}

              {/* スパルタメッセージ */}
              {spartan && !isLoading && (
                <div className="flex items-start gap-2 p-3 bg-gray-900 rounded-xl">
                  <span className="text-lg flex-shrink-0">🔥</span>
                  <p className="text-xs text-white font-semibold leading-relaxed">{spartan}</p>
                </div>
              )}

              {/* 解析結果 */}
              {items.length > 0 && !isLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-gray-800">
                      📋 {summary || `${items.length}件の予定を検出`}
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selected.has(item.id)
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-200 bg-white opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                          selected.has(item.id)
                            ? 'bg-violet-600 border-violet-600 text-white'
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 登録済みメッセージ */}
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
                  className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white text-sm font-black transition-all"
                >
                  🚀 選択した{selected.size}件を登録
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
