'use client';

import { useState, useEffect } from 'react';
import { CalendarView } from '@/components/CalendarView';

// ──────────────────────────────────────────────
// 型 & 定数
// ──────────────────────────────────────────────
type Period = 'daily' | '1month' | '1year' | '3years';

interface TodoItem {
  id:        string;
  text:      string;
  done:      boolean;
  period:    Period;
  createdAt: number;
}

const STORAGE_KEY = 'sparta-period-todos';

const PERIODS: {
  key:    Period;
  label:  string;
  emoji:  string;
  color:  string;   // Tailwind gradient classes
  badge:  string;   // Tailwind badge classes
}[] = [
  {
    key:   'daily',
    label: '毎日（デイリールーティン）',
    emoji: '🔥',
    color: 'from-red-600 to-orange-500',
    badge: 'bg-red-100 text-red-700',
  },
  {
    key:   '1month',
    label: '1ヶ月以内',
    emoji: '📅',
    color: 'from-amber-500 to-yellow-400',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    key:   '1year',
    label: '1年以内',
    emoji: '🎯',
    color: 'from-emerald-600 to-green-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    key:   '3years',
    label: '3年以内',
    emoji: '🚀',
    color: 'from-indigo-600 to-violet-500',
    badge: 'bg-indigo-100 text-indigo-700',
  },
];

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────
function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TodoItem[];
  } catch { /* ignore */ }
  return [];
}
function saveTodos(items: TodoItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// PeriodSection — 1つの期間カード
// ──────────────────────────────────────────────
function PeriodSection({
  period, todos, onAdd, onToggle,
}: {
  period:   typeof PERIODS[number];
  todos:    TodoItem[];
  onAdd:    (text: string) => void;
  onToggle: (id: string, done: boolean) => void;
}) {
  const [inputVal, setInputVal] = useState('');

  const visibleTodos = todos.filter(t => !t.done);
  const doneCount    = todos.filter(t => t.done).length;

  const submit = () => {
    const t = inputVal.trim();
    if (!t) return;
    onAdd(t);
    setInputVal('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className={`px-4 py-3 flex items-center gap-2 bg-gradient-to-r ${period.color}`}>
        <span className="text-lg">{period.emoji}</span>
        <p className="text-sm font-black text-white flex-1">{period.label}</p>
        <span className="text-[10px] text-white/70">
          {visibleTodos.length}件
          {doneCount > 0 && ` / 完了 ${doneCount}`}
        </span>
      </div>

      {/* 入力欄 */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="タスクを追加…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={submit}
          disabled={!inputVal.trim()}
          className="px-4 py-2 rounded-xl bg-gray-800 disabled:bg-gray-200 text-white text-sm font-bold transition-all active:scale-95"
        >＋</button>
      </div>

      {/* タスク一覧 */}
      {visibleTodos.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-xs text-gray-400 text-center">
          タスクなし — 上の欄から追加してください
        </p>
      ) : (
        <ul className="px-4 pb-4 space-y-2">
          {visibleTodos.map(item => (
            <li key={item.id}
              className="flex items-start gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
              <button
                onClick={() => onToggle(item.id, true)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                title="完了"
              />
              <span className="flex-1 text-sm text-gray-800 leading-snug">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────
export default function SpartaPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => { setTodos(loadTodos()); }, []);

  const updateTodos = (next: TodoItem[]) => {
    setTodos(next);
    saveTodos(next);
  };

  const addTodo = (period: Period, text: string) => {
    const item: TodoItem = {
      id: Date.now().toString(),
      text,
      done: false,
      period,
      createdAt: Date.now(),
    };
    updateTodos([item, ...todos]);
  };

  const toggleTodo = (id: string, done: boolean) => {
    updateTodos(todos.map(t => t.id === id ? { ...t, done } : t));
  };

  // カレンダー向け: done アイテムの期間をカラー情報として返す
  const periodColorMap: Record<Period, string> = {
    daily:   '#dc2626',
    '1month': '#d97706',
    '1year':  '#059669',
    '3years': '#4f46e5',
  };

  const totalActive = todos.filter(t => !t.done).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">📋</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 leading-none">期間別TODOリスト</h1>
            <p className="text-xs text-gray-400 mt-0.5">毎日 / 1ヶ月 / 1年 / 3年の4段階</p>
          </div>
          {totalActive > 0 && (
            <span className="flex-shrink-0 text-xs font-black text-white bg-red-600 rounded-full px-2.5 py-1">
              {totalActive}件
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-40 space-y-5">

        {/* ════════════════════════════════════════
            4大期間 TODOセクション
        ════════════════════════════════════════ */}
        {PERIODS.map(period => (
          <PeriodSection
            key={period.key}
            period={period}
            todos={todos.filter(t => t.period === period.key)}
            onAdd={text => addTodo(period.key, text)}
            onToggle={toggleTodo}
          />
        ))}

        {/* ════════════════════════════════════════
            📅 カレンダー連携
        ════════════════════════════════════════ */}
        <section>
          <button onClick={() => setShowCalendar(v => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-sm transition-all active:scale-[0.99] ${
              showCalendar
                ? 'bg-indigo-600 border-indigo-700'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}>
            <span className="text-2xl flex-shrink-0">📅</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-black leading-tight ${showCalendar ? 'text-white' : 'text-gray-900'}`}>
                スケジュールカレンダー
              </p>
              <p className={`text-[10px] mt-0.5 ${showCalendar ? 'text-indigo-200' : 'text-gray-400'}`}>
                {showCalendar ? '▲ 閉じる' : '▼ カレンダーを開く'}
              </p>
            </div>
          </button>
          {showCalendar && (
            <div className="mt-3">
              <CalendarView onTaskAdded={() => {}} />
            </div>
          )}
        </section>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-2 justify-center pb-2">
          {PERIODS.map(p => (
            <span key={p.key}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${p.badge}`}>
              {p.emoji} {p.label}
              <span className="font-normal opacity-70">
                — {todos.filter(t => t.period === p.key && !t.done).length}件
              </span>
            </span>
          ))}
        </div>

        {/* 完了済みをリセット */}
        {todos.some(t => t.done) && (
          <button
            onClick={() => updateTodos(todos.filter(t => !t.done))}
            className="w-full py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 text-xs text-gray-500 hover:text-red-600 font-medium transition-all"
          >
            🗑 完了済みタスクをすべて削除（{todos.filter(t => t.done).length}件）
          </button>
        )}

      </main>
    </div>
  );
}
