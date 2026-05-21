'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LocalTask, TaskPriority, TaskRecurrence,
  SchoolSlot, PERIOD_TIMES, DAY_NAMES_SHORT,
  getTasks, addTask, updateTaskStatus, deleteTask,
  getTasksForDate, priorityColor, priorityLabel, today,
  getSchoolSchedule, saveSchoolSchedule, autoSchedulePendingTasks,
  getFreeSlotsForDate,
} from '@/lib/shared-store';

// ── 定数 ─────────────────────────────────────────────────────────
const SPARTAN_TAUNTS = [
  'サボったら承知しないぞ！今すぐ取りかかれ！',
  '言い訳は要らない！行動するのみだ！',
  '過去の自分を超えろ！今日も全力でいけ！',
  '弱い自分に勝つのが最強への道だ！',
  '迷ってる暇はない！まずやれ、考えるのはあとだ！',
];
function getDailyTaunt() { return SPARTAN_TAUNTS[new Date().getDate() % SPARTAN_TAUNTS.length]; }

const WEEK_DAYS: { idx: 1|2|3|4|5|6; label: string }[] = [
  { idx: 1, label: '月' }, { idx: 2, label: '火' }, { idx: 3, label: '水' },
  { idx: 4, label: '木' }, { idx: 5, label: '金' }, { idx: 6, label: '土' },
];
const PERIODS = [1, 2, 3, 4, 5, 6] as const;

// ── 型 ───────────────────────────────────────────────────────────
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
  title: '', priority: 'HIGH', scheduledDate: today(),
  scheduledTime: '', estimatedMin: '', recurrence: 'none', category: 'study',
};

// ── 日付ヘルパー ─────────────────────────────────────────────────
function fmtDate(d: string) { const [,m,day] = d.split('-'); return `${m}/${day}`; }
function fmtDateTime(d: string, t?: string) { return t ? `${fmtDate(d)} ${t}` : fmtDate(d); }

function isOverdue(task: LocalTask): boolean {
  if (!task.scheduledDate || task.status === 'COMPLETED') return false;
  const td = today();
  if (task.scheduledDate < td) return true;
  if (task.scheduledDate === td && task.scheduledTime) {
    const [h, m] = task.scheduledTime.split(':').map(Number);
    const due = new Date(); due.setHours(h, m, 0, 0);
    return new Date() > due;
  }
  return false;
}

// ── 学校グリッド型 ───────────────────────────────────────────────
type SchoolGrid = string[][]; // [dayIdx 0-5: Mon-Sat][periodIdx 0-5: period 1-6]

function slotsToGrid(slots: SchoolSlot[]): SchoolGrid {
  const grid: SchoolGrid = Array(6).fill(null).map(() => Array(6).fill(''));
  slots.forEach(s => { grid[s.day - 1][s.period - 1] = s.subject; });
  return grid;
}

function gridToSlots(grid: SchoolGrid): SchoolSlot[] {
  const slots: SchoolSlot[] = [];
  grid.forEach((periods, dayIdx) => {
    periods.forEach((subject, periodIdx) => {
      if (subject.trim()) {
        slots.push({
          id: `${dayIdx + 1}-${periodIdx + 1}`,
          day: (dayIdx + 1) as SchoolSlot['day'],
          period: (periodIdx + 1) as SchoolSlot['period'],
          subject: subject.trim(),
        });
      }
    });
  });
  return slots;
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SpartaPage() {
  const [tasks, setTasks]       = useState<LocalTask[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState<AddTaskForm>(DEFAULT_FORM);
  const [tab, setTab]           = useState<'today' | 'all' | 'done' | 'school'>('today');
  const [alertShown, setAlertShown] = useState(true);

  // ── 通知・TTS state ─────────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scheduledNotifRef = useRef(new Set<string>());

  // ── 学校時間割 state ────────────────────────────────────────
  const [schoolGrid, setSchoolGrid] = useState<SchoolGrid>(
    () => slotsToGrid(getSchoolSchedule())
  );
  const [schoolSaved, setSchoolSaved]   = useState(false);
  const [autoCount, setAutoCount]       = useState<number | null>(null);

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);

  // ── 通知権限の初期状態読み込み ──────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ── 派生データ ────────────────────────────────────────────────
  const todayStr     = today();
  const todayTasks   = getTasksForDate(todayStr);
  const allActive    = tasks.filter(t => t.status !== 'COMPLETED');
  const doneTasks    = tasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = todayTasks.filter(isOverdue);
  const todoToday    = todayTasks.filter(t => t.status !== 'COMPLETED');

  const displayTasks =
    tab === 'today' ? todayTasks :
    tab === 'done'  ? doneTasks  :
    tab === 'all'   ? allActive  : [];

  // ── TTS 音声叱咤 ─────────────────────────────────────────────
  const speakSpartan = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = 1.1;
    utt.pitch = 0.85;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const triggerVoiceTaunt = () => {
    let msg = '';
    if (overdueTasks.length > 0) {
      msg = `スパルタ警告！期限切れのタスクが${overdueTasks.length}件ある！` +
            `${overdueTasks.map(t => t.title).join('、')}、今すぐやれ！言い訳は要らない！`;
    } else if (todoToday.length > 0) {
      msg = `今日のタスクは${todoToday.length}件だ！` +
            `${todoToday[0].title}、まずそこから取りかかれ！サボったら承知しないぞ！`;
    } else {
      msg = 'タスクなし？それならすぐ新しい目標を立てろ！立ち止まった瞬間に負けだ！';
    }
    speakSpartan(msg);
  };

  // ── プッシュ通知リクエスト ────────────────────────────────────
  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      new Notification('🔥 スパルタAI 通知ON！', {
        body: 'タスクの時間になったら容赦なく叩き起こすぞ！',
        icon: '/favicon.ico',
      });
    }
  };

  // ── 今日のタスク通知スケジュール ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    todayTasks.forEach(task => {
      if (!task.scheduledTime || task.status === 'COMPLETED') return;
      const key = `${task.id}-${task.scheduledTime}`;
      if (scheduledNotifRef.current.has(key)) return;

      const [h, m] = task.scheduledTime.split(':').map(Number);
      const taskTime = new Date();
      taskTime.setHours(h, m - 5, 0, 0); // 5分前通知
      const delay = taskTime.getTime() - now.getTime();

      if (delay > 0 && delay < 12 * 60 * 60 * 1000) {
        scheduledNotifRef.current.add(key);

        // Service Worker 経由で通知スケジュール（バックグラウンドOK）
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(sw => {
            sw.active?.postMessage({
              type: 'SCHEDULE_NOTIFY',
              title: '🔥 スパルタ警告！',
              body: `まもなく「${task.title}」の時間です！準備しろ！`,
              delay,
              tag: key,
            });
          });
        } else {
          setTimeout(() => {
            new Notification('🔥 スパルタ警告！', {
              body: `まもなく「${task.title}」の時間です！準備しろ！`,
              icon: '/favicon.ico',
            });
            speakSpartan(`まもなく${task.title}の時間です！準備しろ！`);
          }, delay);
        }
      }
    });
  }, [todayTasks, speakSpartan]);

  // ── 学校時間割保存 ────────────────────────────────────────────
  const saveSchoolGrid = () => {
    saveSchoolSchedule(gridToSlots(schoolGrid));
    setSchoolSaved(true);
    setTimeout(() => setSchoolSaved(false), 2000);
  };

  // ── 空き時間に自動タスク配置 ─────────────────────────────────
  const runAutoSchedule = () => {
    const count = autoSchedulePendingTasks(7);
    setAutoCount(count);
    reload();
    setTimeout(() => setAutoCount(null), 4000);
  };

  // ── タスク操作 ────────────────────────────────────────────────
  const toggle = (task: LocalTask) => {
    updateTaskStatus(task.id, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED');
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

  function Badge({ n }: { n: number }) {
    if (n === 0) return null;
    return (
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
        {n > 9 ? '9+' : n}
      </span>
    );
  }

  // ── 今日の空き時間スロット（学校スケジュール考慮） ────────────
  const todayFreeSlots = getFreeSlotsForDate(todayStr);

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
          <div className="flex items-center gap-2">
            {/* TTS ボタン */}
            <button
              onClick={triggerVoiceTaunt}
              disabled={isSpeaking}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isSpeaking
                  ? 'bg-orange-500 text-white animate-pulse'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              title="スパルタの喝を音声で聞く"
            >
              🔊
            </button>
            {/* 通知ボタン */}
            {notifPermission !== 'granted' && (
              <button
                onClick={requestNotifications}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                title="プッシュ通知を許可"
              >
                🔔
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
            >
              ＋ 追加
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── 通知許可バナー ── */}
        {notifPermission === 'default' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
            <span className="text-lg flex-shrink-0">🔔</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800">スパルタ通知を有効にする</p>
              <p className="text-[10px] text-blue-600">タスク開始5分前に音声＆通知でお知らせ</p>
            </div>
            <button
              onClick={requestNotifications}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex-shrink-0"
            >
              許可する
            </button>
          </div>
        )}

        {/* ── 今日の統計 ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '今日のタスク', value: todoToday.length,      color: 'bg-red-50 border-red-100',    tc: 'text-red-600' },
            { label: '完了済み',     value: doneTasks.length,       color: 'bg-green-50 border-green-100',  tc: 'text-green-600' },
            { label: '期限切れ',     value: overdueTasks.length,    color: 'bg-orange-50 border-orange-100', tc: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
              <p className={`text-2xl font-black ${s.tc}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 今日の空き時間表示 ── */}
        {todayFreeSlots.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <span className="text-sm">🕐</span>
            <span className="text-xs font-semibold text-indigo-700">今日の空き時間:</span>
            {todayFreeSlots.map(s => (
              <span key={s.label} className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                {s.label} {s.start}〜{s.end}
              </span>
            ))}
            <button
              onClick={runAutoSchedule}
              className="ml-auto text-[10px] px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
            >
              自動配置
            </button>
          </div>
        )}
        {autoCount !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
            ✅ {autoCount > 0 ? `${autoCount}件のタスクを空き時間に自動配置しました！` : '未スケジュールのタスクはありません。'}
          </div>
        )}

        {/* ── 期限切れスパルタアラート ── */}
        {overdueTasks.length > 0 && alertShown && (
          <div className="p-4 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl text-white flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="text-sm font-black">期限切れタスクが{overdueTasks.length}件ある！</p>
              <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                {overdueTasks.map(t => `「${t.title}」`).join('、')} — {getDailyTaunt()}
              </p>
              <button
                onClick={triggerVoiceTaunt}
                className="mt-2 text-[10px] px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-all"
              >
                🔊 音声で叱咤激励を受ける
              </button>
            </div>
            <button onClick={() => setAlertShown(false)} className="text-red-200 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* ── スパルタ一言 ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-2xl text-white">
          <span className="text-lg flex-shrink-0">🔥</span>
          <p className="text-xs font-semibold leading-relaxed flex-1">{getDailyTaunt()}</p>
          <button
            onClick={triggerVoiceTaunt}
            disabled={isSpeaking}
            className="flex-shrink-0 text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {isSpeaking ? '📢...' : '🔊'}
          </button>
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'today',  label: '今日',   count: todoToday.length },
            { key: 'all',    label: '全タスク', count: allActive.length },
            { key: 'done',   label: '完了',   count: doneTasks.length },
            { key: 'school', label: '学校',   count: 0 },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-0.5 ${
                tab === t.key ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key !== 'school' && <Badge n={t.count} />}
            </button>
          ))}
        </div>

        {/* ── タスクリスト ── */}
        {tab !== 'school' && (
          displayTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-3xl mb-3">{tab === 'done' ? '🎉' : '📋'}</p>
              <p className="text-sm text-gray-500 font-medium">
                {tab === 'done' ? 'まだ完了タスクがありません。やりきれ！' :
                 tab === 'today' ? '今日のタスクはなし。「＋ 追加」で登録しよう！' :
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
                            {isOverdue(task) ? '⚠️ ' : '📅 '}
                            {fmtDateTime(task.scheduledDate, task.scheduledTime)}
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
                          <span className="text-[10px] bg-red-50 text-red-400 px-1.5 py-0.5 rounded-full">🤖 AI</span>
                        )}
                        {task.source === 'exercise-app' && (
                          <span className="text-[10px] bg-orange-50 text-orange-400 px-1.5 py-0.5 rounded-full">💪 運動</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => remove(task.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-xs mt-0.5"
                    >✕</button>
                  </div>

                  {isOverdue(task) && task.status !== 'COMPLETED' && (
                    <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                      <p className="text-[10px] text-red-600 font-medium">🚨 期限切れ！今すぐ取りかかれ！</p>
                      <button
                        onClick={() => speakSpartan(`${task.title}、期限切れだ！今すぐやれ！言い訳は要らない！`)}
                        className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-all"
                      >
                        🔊 喝
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        {/* ── 学校時間割タブ ── */}
        {tab === 'school' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-indigo-800">📚 学校時間割</p>
                  <p className="text-[10px] text-indigo-500">科目を入力して保存すると空き時間を自動検出します</p>
                </div>
                <button
                  onClick={saveSchoolGrid}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    schoolSaved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {schoolSaved ? '✓ 保存済み' : '保存'}
                </button>
              </div>

              {/* 時間割グリッド */}
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[10px] text-gray-400 font-semibold p-1 w-12">時限</th>
                      {WEEK_DAYS.map(d => (
                        <th key={d.idx} className="text-[10px] text-gray-600 font-bold p-1">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map(period => (
                      <tr key={period}>
                        <td className="py-1 pr-1">
                          <div className="text-[9px] text-gray-400 font-semibold leading-tight">
                            <div>{period}限</div>
                            <div className="text-gray-300">{PERIOD_TIMES[period].start}</div>
                          </div>
                        </td>
                        {WEEK_DAYS.map(d => (
                          <td key={d.idx} className="p-0.5">
                            <input
                              type="text"
                              value={schoolGrid[d.idx - 1][period - 1]}
                              onChange={e => {
                                const next = schoolGrid.map(row => [...row]);
                                next[d.idx - 1][period - 1] = e.target.value;
                                setSchoolGrid(next);
                              }}
                              placeholder="　"
                              maxLength={6}
                              className="w-full px-1 py-1.5 border border-gray-200 rounded-lg text-[10px] text-center text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-transparent bg-white placeholder-gray-200"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-3 text-[9px] text-gray-400 text-center">
                ヒント：数学→「数」、英語→「英」のように略称で入力するとスッキリします
              </div>
            </div>

            {/* 自動スケジュール */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-sm font-black text-gray-900">空き時間に自動タスク配置</p>
                  <p className="text-xs text-gray-400">未スケジュールのTODOを放課後・登校前に自動で割り当てます</p>
                </div>
              </div>
              {todayFreeSlots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-gray-500 font-semibold">今日の空き:</span>
                  {todayFreeSlots.map(s => (
                    <span key={s.label} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                      {s.label} {s.start}〜{s.end}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={runAutoSchedule}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black hover:opacity-95 transition-all"
              >
                ⚡ 未スケジュールのタスクを自動配置する
              </button>
              {autoCount !== null && (
                <p className={`text-xs font-bold text-center ${autoCount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {autoCount > 0 ? `✅ ${autoCount}件を空き時間に自動配置しました！` : '未スケジュールのタスクはありません。'}
                </p>
              )}
            </div>

            {/* 通知設定 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900">スパルタ通知設定</p>
                  <p className="text-xs text-gray-400">タスク開始5分前に通知＋音声で叩き起こします</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  notifPermission === 'granted' ? 'bg-green-100 text-green-600' :
                  notifPermission === 'denied'  ? 'bg-red-100 text-red-500' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {notifPermission === 'granted' ? '✓ 有効' : notifPermission === 'denied' ? '✕ 拒否' : '未設定'}
                </span>
              </div>
              {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                <button
                  onClick={requestNotifications}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all"
                >
                  🔔 通知を許可する
                </button>
              )}
              {notifPermission === 'denied' && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl p-3">
                  ブラウザで通知がブロックされています。アドレスバーの鍵アイコンから手動で許可してください。
                </p>
              )}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm">🔊</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">音声叱咤激励（TTS）</p>
                  <p className="text-[10px] text-gray-400">スパルタの声でお叱りを受けられます</p>
                </div>
                <button
                  onClick={triggerVoiceTaunt}
                  disabled={isSpeaking}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-all"
                >
                  {isSpeaking ? '話し中...' : '今すぐ聞く'}
                </button>
              </div>
            </div>
          </div>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">優先度</label>
                  <select value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="CRITICAL">最重要</option>
                    <option value="HIGH">高</option>
                    <option value="MEDIUM">中</option>
                    <option value="LOW">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">カテゴリ</label>
                  <select value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as AddTaskForm['category'] }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="study">📚 学習</option>
                    <option value="work">💼 仕事</option>
                    <option value="health">💪 健康</option>
                    <option value="other">📌 その他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">実施日</label>
                  <input type="date" value={form.scheduledDate}
                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">開始時間</label>
                  <input type="time" value={form.scheduledTime}
                    onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">所要時間（分）</label>
                  <input type="number" value={form.estimatedMin}
                    onChange={e => setForm(f => ({ ...f, estimatedMin: e.target.value }))}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">繰り返し</label>
                  <select value={form.recurrence}
                    onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as TaskRecurrence }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submit} disabled={!form.title.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-sm font-black transition-all">
                🔥 追加する
              </button>
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
