'use client';

import { useState, useEffect } from 'react';

// ── 型 ──────────────────────────────────────────────────────────
interface CountdownTarget {
  id: string;
  name: string;
  targetDate: string; // YYYY-MM-DD
  emoji: string;
}

const TARGETS_KEY = 'sparta-countdown-targets';
const DAY_NAMES   = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const DAY_SHORT   = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const EMOJI_OPTIONS = ['🎯', '🎸', '🎹', '🥁', '🎤', '🎵', '🏆', '🔥', '⚡', '🎓', '📅', '🚀'];

function loadTargets(): CountdownTarget[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(TARGETS_KEY) ?? '[]');
  } catch { return []; }
}
function saveTargets(targets: CountdownTarget[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
function urgencyColor(days: number): string {
  if (days < 0)  return 'text-gray-400';
  if (days <= 7)  return 'text-red-600';
  if (days <= 30) return 'text-orange-500';
  return 'text-indigo-600';
}
function urgencyBg(days: number): string {
  if (days < 0)  return 'bg-gray-50 border-gray-200';
  if (days <= 7)  return 'bg-red-50 border-red-200';
  if (days <= 30) return 'bg-orange-50 border-orange-200';
  return 'bg-indigo-50 border-indigo-200';
}

// ── メインコンポーネント ──────────────────────────────────────────
export function DashboardHeader() {
  const [now, setNow]           = useState<Date | null>(null);
  const [targets, setTargets]   = useState<CountdownTarget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CountdownTarget | null>(null);
  const [form, setForm] = useState({ name: '', targetDate: '', emoji: '🎯' });
  const [activeIdx, setActiveIdx] = useState(0);

  // クライアントサイドのみ時刻を取得（SSR ハイドレーション不一致防止）
  useEffect(() => {
    setNow(new Date());
    setTargets(loadTargets());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 有効な（未来の）ターゲットを日付順でソート
  const activeTargets = [...targets]
    .map(t => ({ ...t, days: daysUntil(t.targetDate) }))
    .sort((a, b) => a.days - b.days);

  // 自動でインデックスを切り替え（複数ある場合）
  useEffect(() => {
    if (activeTargets.length <= 1) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % activeTargets.length), 5000);
    return () => clearInterval(t);
  }, [activeTargets.length]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', targetDate: '', emoji: '🎯' });
    setShowModal(true);
  };
  const openEdit = (t: CountdownTarget) => {
    setEditTarget(t);
    setForm({ name: t.name, targetDate: t.targetDate, emoji: t.emoji });
    setShowModal(true);
  };
  const saveTarget = () => {
    if (!form.name.trim() || !form.targetDate) return;
    const newEntry: CountdownTarget = {
      id:         editTarget?.id ?? `target-${Date.now()}`,
      name:       form.name.trim(),
      targetDate: form.targetDate,
      emoji:      form.emoji,
    };
    const updated = editTarget
      ? targets.map(t => t.id === editTarget.id ? newEntry : t)
      : [...targets, newEntry];
    saveTargets(updated);
    setTargets(updated);
    setShowModal(false);
  };
  const deleteTarget = (id: string) => {
    const updated = targets.filter(t => t.id !== id);
    saveTargets(updated);
    setTargets(updated);
  };

  if (!now) {
    // SSR/初回レンダー時はスケルトン表示
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 space-y-1 animate-pulse">
        <div className="h-8 w-32 bg-white/10 rounded-xl" />
        <div className="h-5 w-48 bg-white/10 rounded-xl" />
      </div>
    );
  }

  const month   = MONTH_NAMES[now.getMonth()];
  const date    = now.getDate();
  const dayName = DAY_NAMES[now.getDay()];
  const dayShort = DAY_SHORT[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const currentTarget = activeTargets[activeIdx % Math.max(activeTargets.length, 1)];

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 rounded-3xl overflow-hidden shadow-lg">
        {/* 日付エリア */}
        <div className="px-5 pt-5 pb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Today</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-5xl font-black text-white leading-none">{date}</span>
              <div>
                <p className="text-lg font-bold text-white leading-none">{month}</p>
                <p className={`text-sm font-bold leading-none mt-0.5 ${isWeekend ? 'text-orange-400' : 'text-gray-300'}`}>
                  {dayName}
                </p>
              </div>
            </div>
          </div>

          {/* 時刻 */}
          <div className="text-right">
            <p className="text-2xl font-black font-mono text-white">
              {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{now.getFullYear()}年</p>
            {/* 曜日ドット */}
            <div className="flex gap-1 mt-1.5 justify-end">
              {DAY_SHORT.map((d, i) => (
                <span
                  key={d}
                  className={`text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                    i === now.getDay()
                      ? isWeekend ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* カウントダウンエリア */}
        {activeTargets.length > 0 && currentTarget ? (
          <div className={`mx-4 mb-4 rounded-2xl border p-3 ${urgencyBg(currentTarget.days)}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{currentTarget.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium">目標まであと</p>
                  <p className="text-xs font-black text-gray-800 truncate">{currentTarget.name}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {currentTarget.days < 0 ? (
                  <p className="text-sm font-black text-gray-400">終了</p>
                ) : currentTarget.days === 0 ? (
                  <p className={`text-2xl font-black ${urgencyColor(currentTarget.days)}`}>今日！</p>
                ) : (
                  <div>
                    <span className={`text-3xl font-black ${urgencyColor(currentTarget.days)} leading-none`}>
                      {currentTarget.days}
                    </span>
                    <span className={`text-sm font-bold ${urgencyColor(currentTarget.days)}`}>日</span>
                  </div>
                )}
                <p className="text-[9px] text-gray-400">{currentTarget.targetDate.replace(/-/g, '/')}</p>
              </div>
            </div>
            {/* 複数ある場合のドットインジケーター */}
            {activeTargets.length > 1 && (
              <div className="flex gap-1 justify-center mt-2">
                {activeTargets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === activeIdx % activeTargets.length ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-4 mb-4">
            <button
              onClick={openAdd}
              className="w-full py-2.5 rounded-2xl border border-dashed border-white/20 text-xs text-gray-400 hover:border-white/40 hover:text-gray-300 transition-all flex items-center justify-center gap-1.5"
            >
              <span>＋</span> 目標イベントを設定（ライブ・試験など）
            </button>
          </div>
        )}

        {/* 下部: 目標管理ボタン */}
        <div className="px-5 pb-4 flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all"
          >＋ 目標を追加</button>
          {targets.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold transition-all"
            >📋 一覧</button>
          )}
          <span className="ml-auto text-[9px] text-gray-500">{dayShort}曜 {now.getFullYear()}年</span>
        </div>
      </div>

      {/* ── 目標設定モーダル ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">
                {editTarget ? '🎯 目標を編集' : '🎯 目標を追加'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* 新規追加フォーム */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">目標・イベント名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：ライブ本番、DTM試験、バンドオーディション"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">日付 *</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">アイコン</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                        form.emoji === e ? 'bg-red-100 ring-2 ring-red-400' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >{e}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveTarget}
                disabled={!form.name.trim() || !form.targetDate}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-sm font-black transition-all"
              >{editTarget ? '✓ 更新' : '🎯 追加'}</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">
                キャンセル
              </button>
            </div>

            {/* 既存ターゲット一覧 */}
            {targets.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500">登録済み目標</p>
                {[...targets].sort((a, b) => a.targetDate.localeCompare(b.targetDate)).map(t => {
                  const days = daysUntil(t.targetDate);
                  return (
                    <div key={t.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${urgencyBg(days)}`}>
                      <span className="text-lg">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{t.name}</p>
                        <p className="text-[10px] text-gray-500">{t.targetDate} ({days < 0 ? '終了' : `あと${days}日`})</p>
                      </div>
                      <button onClick={() => openEdit(t)} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold px-1.5 py-0.5 hover:bg-indigo-50 rounded">編集</button>
                      <button onClick={() => deleteTarget(t.id)} className="text-[10px] text-red-400 hover:text-red-600 font-bold px-1.5 py-0.5 hover:bg-red-50 rounded">削除</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
