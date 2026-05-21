'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LocalTask, TaskPriority, TaskRecurrence,
  getTasks, addTask, updateTaskStatus, deleteTask,
  getTasksForDate, priorityColor, priorityLabel, today,
} from '@/lib/shared-store';

// ── 日付ユーティリティ ────────────────────────────────────────
function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${m}/${day}`;
}

function fmtDateTime(d: string, t?: string) {
  return t ? `${fmtDate(d)} ${t}` : fmtDate(d);
}

function isOverdue(task: LocalTask): boolean {
  if (!task.scheduledDate || task.status === 'COMPLETED') return false;
  const now = new Date();
  const td  = today();
  if (task.scheduledDate < td) return true;
  if (task.scheduledDate === td && task.scheduledTime) {
    const [h, m] = task.scheduledTime.split(':').map(Number);
    const due = new Date();
    due.setHours(h, m, 0, 0);
    return now > due;
  }
  return false;
}

// ── スパルタメッセージ ──────────────────────────────────────────
const SPARTAN_TAUNTS = [
  'サボったら承知しないぞ！今すぐ取りかかれ！',
  '言い訳は要らない！行動するのみだ！',
  '過去の自分を超えろ！今日も全力でいけ！',
  '弱い自分に勝つのが最強への道だ！',
  '迷ってる暇はない！まずやれ、考えるのはあとだ！',
];

function getDailyTaunt(): string {
  const idx = new Date().getDate() % SPARTAN_TAUNTS.length;
  return SPARTAN_TAUNTS[idx];
}

// ── タスク追加フォーム ─────────────────────────────────────────
interface AddTaskForm {
  title: string;
  priority: TaskPriority;
  scheduledDate: string;
  scheduledTime: string;
  estimatedMin: string;
  recurrence: TaskRecurrence;
  category: 'study' | 'work' | 'health' | 'other';
}

const DEFAULT_FORM: AddTaskForm = {
  title: '',
  priority: 'HIGH',
  scheduledDate: today(),
  scheduledTime: '',
  estimatedMin: '',
  recurrence: 'none',
  category: 'study',
};

// ── メインコンポーネント ──────────────────────────────────────
export default function SpartaPage() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddTaskForm>(DEFAULT_FORM);
  const [tab, setTab] = useState<'today' | 'all' | 'done'>('today');
  const [alertShown, setAlertShown] = useState(true);

  const reload = useCallback(() => setTasks(getTasks()), []);

  useEffect(() => { reload(); }, [reload]);

  // ── 派生データ ───────────────────────────────────────────────
  const todayStr     = today();
  const todayTasks   = getTasksForDate(todayStr);
  const allActive    = tasks.filter(t => t.status !== 'COMPLETED');
  const doneTasks    = tasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = todayTasks.filter(isOverdue);
  const todoToday    = todayTasks.filter(t => t.status !== 'COMPLETED');

  const displayTasks =
    tab === 'today' ? todayTasks :
    tab === 'done'  ? doneTasks  :
    allActive;

  // ── タスク操作 ────────────────────────────────────────────────
  const toggle = (task: LocalTask) => {
    const next = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    updateTaskStatus(task.id, next);
    reload();
  };

  const remove = (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    deleteTask(id);
    reload();
  };

  const submit = () => {
    if (!form.title.trim()) return;
    addTask({
      title: form.title.trim(),
      priority: form.priority,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledTime || undefined,
      estimatedMin: form.estimatedMin ? Number(form.estimatedMin) : undefined,
      recurrence: form.recurrence,
      category: form.category,
      source: 'manual',
      status: 'TODO',
    });
    setForm(DEFAULT_FORM);
    setShowAdd(false);
    reload();
  };

  // ── タブカウンターバッジ ──────────────────────────────────────
  function Badge({ n }: { n: number }) {
    if (n === 0) return null;
    return (
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
        {n > 9 ? '9+' : n}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <h1 className="text-base font-black text-gray-900">スパルタ タスク管理</h1>
              <p className="text-[10px] text-gray-400">サボったら承知しないぞ！</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
          >
            ＋ タスク追加
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── 今日の統計 ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '今日のタスク', value: todoToday.length, color: 'bg-red-50 border-red-100', tc: 'text-red-600' },
            { label: '完了済み',     value: doneTasks.length,  color: 'bg-green-50 border-green-100', tc: 'text-green-600' },
            { label: '期限切れ',     value: overdueTasks.length, color: 'bg-orange-50 border-orange-100', tc: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
              <p className={`text-2xl font-black ${s.tc}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 期限切れスパルタアラート ── */}
        {overdueTasks.length > 0 && alertShown && (
          <div className="p-4 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl text-white flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="text-sm font-black">期限切れタスクが{overdueTasks.length}件ある！</p>
              <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                {overdueTasks.map(t => `「${t.title}」`).join('、')} — {getDailyTaunt()}
              </p>
            </div>
            <button onClick={() => setAlertShown(false)} className="text-red-200 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* ── 今日のスパルタ一言 ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-2xl text-white">
          <span className="text-lg flex-shrink-0">🔥</span>
          <p className="text-xs font-semibold leading-relaxed">{getDailyTaunt()}</p>
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'today', label: '今日', count: todoToday.length },
            { key: 'all',   label: '全タスク', count: allActive.length },
            { key: 'done',  label: '完了', count: doneTasks.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-0.5 ${
                tab === t.key ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}<Badge n={t.count} />
            </button>
          ))}
        </div>

        {/* ── タスクリスト ── */}
        {displayTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-3xl mb-3">{tab === 'done' ? '🎉' : '📋'}</p>
            <p className="text-sm text-gray-500 font-medium">
              {tab === 'done' ? 'まだ完了タスクがありません。やりきれ！' :
               tab === 'today' ? '今日のタスクはありません。\n「＋ タスク追加」で登録しよう！' :
               'タスクがありません。'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {displayTasks.map(task => (
              <li key={task.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isOverdue(task) ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  {/* 完了チェック */}
                  <button
                    onClick={() => toggle(task)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                      task.status === 'COMPLETED'
                        ? 'bg-green-500 border-green-500 text-white'
                        : isOverdue(task)
                        ? 'border-red-400 hover:border-green-400'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {task.status === 'COMPLETED' && <span className="text-xs">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${
                      task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${priorityColor(task.priority)}`}>
                        {priorityLabel(task.priority)}
                      </span>
                      {task.scheduledDate && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                          isOverdue(task) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isOverdue(task) && '⚠️ '}
                          📅 {fmtDateTime(task.scheduledDate, task.scheduledTime)}
                        </span>
                      )}
                      {task.estimatedMin && (
                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">⏱ {task.estimatedMin}分</span>
                      )}
                      {task.recurrence !== 'none' && (
                        <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-full">
                          🔁 {task.recurrence === 'daily' ? '毎日' : '毎週'}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full">
                          {task.category === 'study' ? '📚' : task.category === 'health' ? '💪' :
                           task.category === 'work' ? '💼' : '📌'}
                        </span>
                      )}
                      {task.source === 'ai-parsed' && (
                        <span className="text-[10px] bg-red-50 text-red-400 px-1.5 py-0.5 rounded-full">🤖 AI登録</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => remove(task.id)}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-xs mt-0.5"
                  >
                    ✕
                  </button>
                </div>

                {/* 期限切れのスパルタ煽り */}
                {isOverdue(task) && task.status !== 'COMPLETED' && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                    <p className="text-[10px] text-red-600 font-medium">
                      🚨 期限切れ！今すぐ取りかかれ！言い訳は要らない！
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── タスク追加モーダル ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">🔥 新しいタスクを追加</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              {/* タイトル */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">タスク名 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="例：FP2級 問題集50問"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* 優先度 & カテゴリ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">優先度</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="CRITICAL">最重要</option>
                    <option value="HIGH">高</option>
                    <option value="MEDIUM">中</option>
                    <option value="LOW">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">カテゴリ</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as AddTaskForm['category'] }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="study">📚 学習</option>
                    <option value="work">💼 仕事</option>
                    <option value="health">💪 健康</option>
                    <option value="other">📌 その他</option>
                  </select>
                </div>
              </div>

              {/* 日時 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">実施日</label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">開始時間</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* 所要時間 & 繰り返し */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">所要時間（分）</label>
                  <input
                    type="number"
                    value={form.estimatedMin}
                    onChange={e => setForm(f => ({ ...f, estimatedMin: e.target.value }))}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">繰り返し</label>
                  <select
                    value={form.recurrence}
                    onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as TaskRecurrence }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={!form.title.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-sm font-black transition-all"
              >
                🔥 追加する
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
