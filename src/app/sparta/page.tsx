'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LocalTask, TaskPriority, TaskRecurrence, NotifyTiming, MemoEntry,
  SchoolSlot, PERIOD_TIMES, DAY_NAMES_SHORT,
  getTasks, addTask, updateTask, updateTaskStatus, deleteTask,
  getTasksForDate, priorityColor, priorityLabel, today,
  getSchoolSchedule, saveSchoolSchedule, autoSchedulePendingTasks,
  getFreeSlotsForDate, getDailyQuotes, checkTimeConflict,
  getMemos, addMemo, deleteMemo, updateMemo,
} from '@/lib/shared-store';

// ── タスク名プリセット ─────────────────────────────────────────
interface TaskPreset {
  label: string;
  category: 'study' | 'work' | 'health' | 'other';
  estimatedMin: number;
}
const TASK_PRESETS: TaskPreset[] = [
  { label: 'ピアノ',       category: 'study',  estimatedMin: 90  },
  { label: 'ドラム',       category: 'study',  estimatedMin: 60  },
  { label: 'ロジック',     category: 'study',  estimatedMin: 60  },
  { label: 'バンド',       category: 'work',   estimatedMin: 120 },
  { label: 'MT',           category: 'work',   estimatedMin: 60  },
  { label: 'ディクション', category: 'study',  estimatedMin: 30  },
  { label: '発声・腹式',   category: 'study',  estimatedMin: 30  },
  { label: 'レコーディング', category: 'work',  estimatedMin: 120 },
  { label: 'VT',           category: 'work',   estimatedMin: 60  },
  { label: 'ADO',          category: 'study',  estimatedMin: 60  },
  { label: '筋トレ',       category: 'health', estimatedMin: 45  },
  { label: 'ウォーキング', category: 'health', estimatedMin: 30  },
  { label: '買い物',       category: 'other',  estimatedMin: 30  },
  { label: '風呂',         category: 'other',  estimatedMin: 30  },
  { label: '食事',         category: 'other',  estimatedMin: 30  },
  { label: '支度',         category: 'other',  estimatedMin: 20  },
  { label: '睡眠',         category: 'other',  estimatedMin: 480 },
  { label: '移動',         category: 'other',  estimatedMin: 30  },
  { label: 'その他',       category: 'other',  estimatedMin: 60  },
];

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

/** 授業1〜6限 + 夜間7〜9スロット */
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PERIOD_LABELS: Record<number, string> = {
  1: '1限', 2: '2限', 3: '3限', 4: '4限', 5: '5限', 6: '6限',
  7: '夜1', 8: '夜2', 9: '夜3',
};

// 時間選択肢
const HOUR_OPTIONS   = Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, '0')); // 07-22
const MINUTE_OPTIONS = ['00', '10', '20', '30', '40', '50'];
const NOTIFY_OPTIONS: { value: NotifyTiming; label: string }[] = [
  { value: 'task-time', label: 'タスク開始5分前' },
  { value: '1hour',     label: '1時間前' },
  { value: 'daily',     label: '毎日同時刻' },
  { value: 'weekly',    label: '毎週同時刻' },
  { value: 'custom',    label: 'カスタム（分前）' },
];

// ── 型 ───────────────────────────────────────────────────────────
interface AddTaskForm {
  titlePreset: string;
  titleCustom: string;
  priority: TaskPriority;
  scheduledDate: string;
  scheduledHour: string;
  scheduledMinute: string;
  estimatedMin: string;
  recurrence: TaskRecurrence;
  category: 'study' | 'work' | 'health' | 'other';
  notifyEnabled: boolean;
  notifyTiming: NotifyTiming;
  notifyCustomMin: string;
}

interface MemoForm {
  title: string;
  text: string;
  notifyEnabled: boolean;
  notifyTiming: NotifyTiming;
  notifyCustomMin: string;
}

// 次14日の日付選択肢を生成
function getDateOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso   = d.toISOString().split('T')[0];
    const label = `${d.getMonth() + 1}/${d.getDate()}(${DAY_NAMES_SHORT[d.getDay()]})`;
    opts.push({ value: iso, label: i === 0 ? `今日 ${label}` : i === 1 ? `明日 ${label}` : label });
  }
  return opts;
}

const DEFAULT_FORM: AddTaskForm = {
  titlePreset: '',
  titleCustom: '',
  priority: 'HIGH',
  scheduledDate: today(),
  scheduledHour: '',
  scheduledMinute: '00',
  estimatedMin: '',
  recurrence: 'none',
  category: 'study',
  notifyEnabled: true,
  notifyTiming: 'task-time',
  notifyCustomMin: '30',
};

const DEFAULT_MEMO_FORM: MemoForm = {
  title: '',
  text: '',
  notifyEnabled: false,
  notifyTiming: 'daily',
  notifyCustomMin: '30',
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

// ── 07:00-22:00 デイタイムライン ────────────────────────────────
type TLBlock = {
  start: string; end: string; label: string;
  type: 'school' | 'task-done' | 'task-todo' | 'task-over' | 'free';
  task?: LocalTask;
};
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number); return h * 60 + m;
}
function minToTime(n: number): string {
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}
function durationLabel(s: string, e: string): string {
  const d = timeToMin(e) - timeToMin(s);
  if (d <= 0) return '';
  return d >= 60
    ? `${Math.floor(d / 60)}時間${d % 60 > 0 ? `${d % 60}分` : ''}`
    : `${d}分`;
}
function buildDayTimeline(tasks: LocalTask[], dateStr: string): TLBlock[] {
  const START = 7 * 60, END = 22 * 60;
  const dow = new Date(dateStr).getDay();
  type Ev = { startMin: number; endMin: number; label: string; type: TLBlock['type']; task?: LocalTask };
  const events: Ev[] = [];
  getSchoolSchedule()
    .filter(s => s.day === dow)
    .forEach(s => {
      const { start, end } = PERIOD_TIMES[s.period];
      events.push({ startMin: timeToMin(start), endMin: timeToMin(end), label: `${s.period}限 ${s.subject || '—'}`, type: 'school' });
    });
  tasks.forEach(t => {
    if (!t.scheduledTime) return;
    const sm = timeToMin(t.scheduledTime);
    if (sm < START || sm >= END) return;
    const em = Math.min(sm + (t.estimatedMin ?? 60), END);
    const type: TLBlock['type'] = t.status === 'COMPLETED' ? 'task-done' : isOverdue(t) ? 'task-over' : 'task-todo';
    events.push({ startMin: sm, endMin: em, label: t.title, type, task: t });
  });
  events.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const blocks: TLBlock[] = [];
  let cursor = START;
  for (const ev of events) {
    const es = Math.max(ev.startMin, cursor);
    const ee = Math.min(ev.endMin, END);
    if (es >= ee || es >= END) continue;
    if (cursor < es) blocks.push({ start: minToTime(cursor), end: minToTime(es), label: '空き時間', type: 'free' });
    blocks.push({ start: minToTime(es), end: minToTime(ee), label: ev.label, type: ev.type, task: ev.task });
    cursor = ee;
  }
  if (cursor < END) blocks.push({ start: minToTime(cursor), end: '22:00', label: '空き時間', type: 'free' });
  return blocks;
}

// ── 学校グリッド型 ───────────────────────────────────────────────
type SchoolGrid = string[][]; // [dayIdx 0-5: Mon-Sat][periodIdx 0-8: period 1-9]

function slotsToGrid(slots: SchoolSlot[]): SchoolGrid {
  const grid: SchoolGrid = Array(6).fill(null).map(() => Array(9).fill(''));
  slots.forEach(s => {
    if (s.day >= 1 && s.day <= 6 && s.period >= 1 && s.period <= 9) {
      grid[s.day - 1][s.period - 1] = s.subject;
    }
  });
  return grid;
}

function gridToSlots(grid: SchoolGrid): SchoolSlot[] {
  const slots: SchoolSlot[] = [];
  grid.forEach((periods, dayIdx) => {
    periods.forEach((subject, periodIdx) => {
      if (subject.trim()) {
        const p = periodIdx + 1;
        if (p >= 1 && p <= 9) {
          slots.push({
            id: `${dayIdx + 1}-${p}`,
            day: (dayIdx + 1) as SchoolSlot['day'],
            period: p as SchoolSlot['period'],
            subject: subject.trim(),
          });
        }
      }
    });
  });
  return slots;
}

// ── Web Audio アラーム ────────────────────────────────────────────
function playAlarmSound() {
  try {
    type WindowWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    for (let i = 0; i < 4; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 1200 : 900;
      gain.gain.setValueAtTime(0.7, ctx.currentTime + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.18);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.18);
    }
  } catch { /* ignore */ }
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SpartaPage() {
  const [tasks, setTasks]       = useState<LocalTask[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState<AddTaskForm>(DEFAULT_FORM);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [tab, setTab]           = useState<'today' | 'all' | 'done' | 'school' | 'memo'>('today');
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

  // ── SNS集中モード ────────────────────────────────────────────
  const [focusMode, setFocusMode]         = useState(false);
  const [focusWarningCount, setFocusWarningCount] = useState(0);
  const focusModeRef = useRef(false);

  // ── メモ state ────────────────────────────────────────────────
  const [memos, setMemos]       = useState<MemoEntry[]>([]);
  const [memoForm, setMemoForm] = useState<MemoForm>(DEFAULT_MEMO_FORM);
  const [showMemoAdd, setShowMemoAdd] = useState(false);

  const reload      = useCallback(() => setTasks(getTasks()), []);
  const reloadMemos = useCallback(() => setMemos(getMemos()), []);

  useEffect(() => { reload(); reloadMemos(); }, [reload, reloadMemos]);

  // ── 通知権限の初期状態読み込み ──────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ── SNSフォーカスモード ref sync ─────────────────────────────
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);

  // ── 派生データ ────────────────────────────────────────────────
  const todayStr     = today();
  const todayTasks   = getTasksForDate(todayStr);
  const allActive    = tasks.filter(t => t.status !== 'COMPLETED');
  const doneTasks    = tasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = todayTasks.filter(isOverdue);
  const todoToday    = todayTasks.filter(t => t.status !== 'COMPLETED');
  const dayTimeline  = buildDayTimeline(todayTasks, todayStr);

  const displayTasks =
    tab === 'today' ? todayTasks :
    tab === 'done'  ? doneTasks  :
    tab === 'all'   ? allActive  : [];

  const dateOptions = getDateOptions();

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
    const { creator, anime } = getDailyQuotes();
    const quoteSnippet = creator.quote.slice(0, 25);
    let msg = '';
    if (overdueTasks.length > 0) {
      const walkingOverdue  = overdueTasks.find(t => t.title.includes('ウォーキング'));
      const exerciseOverdue = overdueTasks.find(t => t.category === 'health' && !t.title.includes('ウォーキング'));
      if (walkingOverdue) {
        msg = 'ウォーキングの時間だ！早く歩いたりゆっくり歩いたりして脂肪を燃やしてこい！緩急こそが最大の効果を生む！今すぐ外に出ろ！';
      } else if (exerciseOverdue) {
        msg = 'おい！ベッドの上にいるなら今すぐ寝転んだまま足を動かせ！YouTubeの動画を早く開いてフォームを確認して即スタートしろ！';
      } else {
        msg = `おい！今日の${creator.name}の言葉を見たか！？「${quoteSnippet}」だ！` +
              `${overdueTasks.length}件も期限切れにして何やってる！今すぐやれ！言い訳は要らない！`;
      }
    } else if (todoToday.length > 0) {
      const walkingTask  = todoToday.find(t => t.title.includes('ウォーキング'));
      const exerciseTask = todoToday.find(t => t.category === 'health' && !t.title.includes('ウォーキング'));
      if (walkingTask) {
        msg = 'ウォーキングの時間だ！早く歩いたりゆっくり歩いたりして脂肪を燃やしてこい！緩急こそが最大の効果を生む！今すぐ外に出ろ！';
      } else if (exerciseTask) {
        msg = 'おい！ベッドの上にいるなら今すぐ寝転んだまま足を動かせ！YouTubeの動画を早く開いてフォームを確認して即スタートしろ！';
      } else {
        msg = `今日の${anime.name}も言っている。「${anime.quote.slice(0, 20)}」だ！` +
              `今日のタスク${todoToday.length}件、${todoToday[0].title}から今すぐ取りかかれ！サボったら承知しないぞ！`;
      }
    } else {
      msg = `タスクなし？それなら今日の${creator.name}の言葉を胸に刻め！「${quoteSnippet}」` +
            '立ち止まった瞬間に負けだ！すぐ新しい目標を立てろ！';
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
      // notifyEnabled が明示的に false の場合はスキップ
      if (task.notifyEnabled === false) return;
      if (!task.scheduledTime || task.status === 'COMPLETED') return;

      const key = `${task.id}-${task.scheduledTime}`;
      if (scheduledNotifRef.current.has(key)) return;

      const notifyTiming = task.notifyTiming ?? 'task-time';
      const offsetMin = notifyTiming === '1hour' ? 60 : notifyTiming === 'custom' ? (task.notifyCustomMin ?? 30) : 5;

      const [h, m] = task.scheduledTime.split(':').map(Number);
      const taskTime = new Date();
      taskTime.setHours(h, m - offsetMin, 0, 0);
      const delay = taskTime.getTime() - now.getTime();

      if (delay > 0 && delay < 16 * 60 * 60 * 1000) {
        scheduledNotifRef.current.add(key);

        const isWalking  = task.title.includes('ウォーキング');
        const isExercise = task.category === 'health' && !isWalking;
        const { creator } = getDailyQuotes();
        const notifTitle = isWalking ? '🚶 ウォーキングの時間だ！' :
                           isExercise ? '💪 宅トレの時間だ！' : '🔥 スパルタ警告！';
        const notifBody = isWalking
          ? 'ウォーキングの時間！脂肪を燃やしてこい！'
          : isExercise
          ? 'ベッドから出て即スタートしろ！'
          : `まもなく「${task.title}」の時間！${creator.name}「${creator.quote.slice(0, 20)}」今すぐ準備！`;
        const speakBody = isWalking
          ? 'ウォーキングの時間だ！早く歩いたりゆっくり歩いたりして脂肪を燃やしてこい！緩急こそが最大の効果を生む！今すぐ外に出ろ！'
          : isExercise
          ? 'おい！ベッドの上にいるなら今すぐ寝転んだまま足を動かせ！YouTubeの動画を早く開いてフォームを確認して即スタートしろ！'
          : `まもなく${task.title}の時間です！${creator.name}の言葉を胸に！準備しろ！`;

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(sw => {
            sw.active?.postMessage({
              type: 'SCHEDULE_NOTIFY',
              title: notifTitle,
              body: notifBody,
              delay,
              tag: key,
            });
          });
        } else {
          setTimeout(() => {
            new Notification(notifTitle, { body: notifBody, icon: '/favicon.ico' });
            speakSpartan(speakBody);
          }, delay);
        }
      }
    });
  }, [todayTasks, speakSpartan]);

  // ── SNS集中モード — Page Visibility + window blur ──────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!focusModeRef.current) return;
      if (document.hidden) {
        playAlarmSound();
        speakSpartan(
          'ダメだぞ！インスタやYouTubeを見てる暇があったら練習しろ！' +
          '今すぐ戻ってこい！サボりは許さんぞ！'
        );
        setFocusWarningCount(c => c + 1);
      }
    };
    const handleBlur = () => {
      if (!focusModeRef.current) return;
      playAlarmSound();
      speakSpartan('アプリを切り替えたな！そのスマホを置いて今すぐ練習に戻れ！');
      setFocusWarningCount(c => c + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [speakSpartan]);

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
  const toggleTaskNotify = (task: LocalTask) => {
    updateTask(task.id, { notifyEnabled: !(task.notifyEnabled !== false) });
    reload();
  };

  // ── タスクフォームのプリセット選択時 ─────────────────────────
  const onPresetChange = (presetLabel: string) => {
    const preset = TASK_PRESETS.find(p => p.label === presetLabel);
    setConflictWarning(null);
    if (preset && preset.label !== 'その他') {
      setForm(f => ({
        ...f,
        titlePreset:  preset.label,
        category:     preset.category,
        estimatedMin: String(preset.estimatedMin),
      }));
    } else {
      setForm(f => ({ ...f, titlePreset: presetLabel, titleCustom: '' }));
    }
  };

  // ── 時間変更時にコンフリクトチェック ─────────────────────────
  const checkConflict = (
    date: string, hour: string, minute: string, estimatedMin: string
  ) => {
    if (!hour) { setConflictWarning(null); return; }
    const timeStr = `${hour}:${minute}`;
    const estMin  = estimatedMin ? Number(estimatedMin) : 60;
    const conflict = checkTimeConflict(date, timeStr, estMin);
    if (conflict) {
      setConflictWarning(`その時間はすでに「${conflict.name}」の予定が入っています`);
    } else {
      setConflictWarning(null);
    }
  };

  // ── タスク追加 ────────────────────────────────────────────────
  const submit = () => {
    const title = form.titlePreset === 'その他' ? form.titleCustom.trim() : form.titlePreset;
    if (!title) return;

    const scheduledTime = form.scheduledHour
      ? `${form.scheduledHour}:${form.scheduledMinute}`
      : undefined;

    // 最終コンフリクトチェック
    if (scheduledTime) {
      const conflict = checkTimeConflict(form.scheduledDate, scheduledTime, Number(form.estimatedMin) || 60);
      if (conflict) {
        setConflictWarning(`その時間はすでに「${conflict.name}」の予定が入っています`);
        return;
      }
    }

    addTask({
      title,
      priority:       form.priority,
      scheduledDate:  form.scheduledDate || undefined,
      scheduledTime,
      estimatedMin:   form.estimatedMin ? Number(form.estimatedMin) : undefined,
      recurrence:     form.recurrence,
      category:       form.category,
      source:         'manual',
      status:         'TODO',
      notifyEnabled:  form.notifyEnabled,
      notifyTiming:   form.notifyTiming,
      notifyCustomMin: form.notifyTiming === 'custom' ? Number(form.notifyCustomMin) : undefined,
    });
    setForm(DEFAULT_FORM);
    setConflictWarning(null);
    setShowAdd(false);
    reload();
  };

  // ── メモ追加 ─────────────────────────────────────────────────
  const submitMemo = () => {
    if (!memoForm.text.trim()) return;
    addMemo({
      title: memoForm.title.trim() || undefined,
      text: memoForm.text.trim(),
      notifyEnabled:  memoForm.notifyEnabled,
      notifyTiming:   memoForm.notifyTiming,
      notifyCustomMin: memoForm.notifyTiming === 'custom' ? Number(memoForm.notifyCustomMin) : undefined,
    });
    setMemoForm(DEFAULT_MEMO_FORM);
    setShowMemoAdd(false);
    reloadMemos();
  };

  // ── Badge ─────────────────────────────────────────────────────
  function Badge({ n }: { n: number }) {
    if (n === 0) return null;
    return (
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
        {n > 9 ? '9+' : n}
      </span>
    );
  }

  // ── 今日の空き時間スロット ────────────────────────────────────
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
            {/* SNS集中モードトグル */}
            <button
              onClick={() => { setFocusMode(f => !f); if (!focusMode) setFocusWarningCount(0); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                focusMode
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="SNS誘惑防止モード"
            >
              {focusMode ? '🚫 集中中' : '👁️ 集中'}
            </button>
            {/* TTS ボタン */}
            <button
              onClick={triggerVoiceTaunt}
              disabled={isSpeaking}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isSpeaking ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >🔊</button>
            {notifPermission !== 'granted' && (
              <button
                onClick={requestNotifications}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
              >🔔</button>
            )}
            <button
              onClick={() => { setShowAdd(true); setForm(DEFAULT_FORM); setConflictWarning(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
            >＋ 追加</button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── SNS集中モードバナー ── */}
        {focusMode && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl text-white">
            <span className="text-lg flex-shrink-0 animate-bounce">🚫</span>
            <div className="flex-1">
              <p className="text-xs font-black">SNS誘惑防止モード 作動中</p>
              <p className="text-[10px] text-red-100">
                タブ切り替え・アプリ切り替えを検知したら即アラーム！
                {focusWarningCount > 0 && ` 警告回数: ${focusWarningCount}回`}
              </p>
            </div>
            <button
              onClick={() => { setFocusMode(false); setFocusWarningCount(0); }}
              className="text-red-200 hover:text-white text-xs font-bold px-2 py-1 bg-white/10 rounded-lg"
            >解除</button>
          </div>
        )}

        {/* ── 通知許可バナー ── */}
        {notifPermission === 'default' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
            <span className="text-lg flex-shrink-0">🔔</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800">スパルタ通知を有効にする</p>
              <p className="text-[10px] text-blue-600">タスク時間前に音声＆通知でお知らせ</p>
            </div>
            <button
              onClick={requestNotifications}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex-shrink-0"
            >許可する</button>
          </div>
        )}

        {/* ── 今日の統計 ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '今日のタスク', value: todoToday.length,   color: 'bg-red-50 border-red-100',    tc: 'text-red-600'    },
            { label: '完了済み',     value: doneTasks.length,   color: 'bg-green-50 border-green-100', tc: 'text-green-600'  },
            { label: '期限切れ',     value: overdueTasks.length,color: 'bg-orange-50 border-orange-100',tc: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
              <p className={`text-2xl font-black ${s.tc}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 今日の空き時間 ── */}
        {todayFreeSlots.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <span className="text-sm">🕐</span>
            <span className="text-xs font-semibold text-indigo-700">今日の空き:</span>
            {todayFreeSlots.map(s => (
              <span key={s.label} className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                {s.label} {s.start}〜{s.end}
              </span>
            ))}
            <button
              onClick={runAutoSchedule}
              className="ml-auto text-[10px] px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
            >自動配置</button>
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
              >🔊 音声で叱咤激励を受ける</button>
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
          >{isSpeaking ? '📢...' : '🔊'}</button>
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {([
            { key: 'today',  label: '今日',   count: todoToday.length },
            { key: 'all',    label: '全タスク', count: allActive.length },
            { key: 'done',   label: '完了',   count: doneTasks.length },
            { key: 'school', label: '学校',   count: 0 },
            { key: 'memo',   label: 'メモ',   count: memos.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-0.5 ${
                tab === t.key ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key !== 'school' && t.key !== 'memo' && <Badge n={t.count} />}
              {t.key === 'memo' && t.count > 0 && <Badge n={t.count} />}
            </button>
          ))}
        </div>

        {/* ── 本日のタイムライン 07:00-22:00 ── */}
        {tab === 'today' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 flex items-center gap-2">
              <span className="text-sm">📅</span>
              <p className="text-xs font-black text-white">本日のタイムライン</p>
              <span className="ml-auto text-[10px] font-mono text-slate-300">07:00 → 22:00</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto overscroll-contain">
              {dayTimeline.map((block, i) => {
                const now     = new Date();
                const nowMin  = now.getHours() * 60 + now.getMinutes();
                const bStart  = timeToMin(block.start);
                const bEnd    = timeToMin(block.end);
                const isNow   = nowMin >= bStart && nowMin < bEnd;
                const isPast  = bEnd <= nowMin;
                return (
                  <div key={i} className={`flex items-stretch ${isNow ? 'ring-1 ring-inset ring-yellow-400' : ''}`}>
                    <div className="w-[3.25rem] flex-shrink-0 flex flex-col items-end justify-center px-2 py-2 bg-gray-50 border-r border-gray-100">
                      <span className="text-[9px] font-mono font-bold text-gray-600 leading-none">{block.start}</span>
                      <span className="text-[8px] font-mono text-gray-300 leading-none mt-0.5">↓{block.end}</span>
                    </div>
                    <div className={`w-[3px] flex-shrink-0 ${
                      block.type === 'school'    ? 'bg-red-500' :
                      block.type === 'task-todo' ? 'bg-blue-500' :
                      block.type === 'task-done' ? 'bg-green-500' :
                      block.type === 'task-over' ? 'bg-orange-500' :
                      isNow ? 'bg-yellow-400' : 'bg-gray-100'
                    }`} />
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 min-w-0 ${
                      isPast && block.type !== 'free' ? 'opacity-50' : ''
                    } ${
                      block.type === 'school'    ? 'bg-red-50' :
                      block.type === 'task-todo' ? 'bg-blue-50' :
                      block.type === 'task-done' ? 'bg-green-50' :
                      block.type === 'task-over' ? 'bg-orange-50' :
                      isNow ? 'bg-yellow-50' : 'bg-white'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-tight font-medium truncate ${block.type === 'free' ? 'text-gray-400' : 'text-gray-800'}`}>
                          {block.label}
                        </p>
                        <p className="text-[9px] text-gray-400 leading-none mt-0.5">{durationLabel(block.start, block.end)}</p>
                      </div>
                      {isNow && <span className="flex-shrink-0 text-[9px] text-yellow-700 bg-yellow-200 px-1.5 py-0.5 rounded-full font-black animate-pulse">NOW</span>}
                      {block.type === 'free' && !isNow && <span className="flex-shrink-0 text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">空き</span>}
                      {block.type === 'task-over' && <span className="flex-shrink-0 text-[9px] text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full font-bold">遅延!</span>}
                      {block.type === 'school' && <span className="flex-shrink-0 text-[9px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">授業</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3 flex-wrap">
              {[
                { color: 'bg-red-500', label: '授業' }, { color: 'bg-blue-500', label: 'タスク' },
                { color: 'bg-orange-500', label: '遅延' }, { color: 'bg-green-500', label: '完了' },
                { color: 'bg-gray-200', label: '空き' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[9px] text-gray-500">{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── タスクリスト ── */}
        {(tab === 'today' || tab === 'all' || tab === 'done') && (
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
                          : isOverdue(task) ? 'border-red-400 hover:border-green-400'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {task.status === 'COMPLETED' && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${
                        task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}>{task.title}</p>
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
                        {/* 通知トグル */}
                        <button
                          onClick={() => toggleTaskNotify(task)}
                          title={task.notifyEnabled !== false ? '通知オン（クリックでオフ）' : '通知オフ（クリックでオン）'}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
                            task.notifyEnabled !== false
                              ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {task.notifyEnabled !== false ? '🔔' : '🔕'}
                        </button>
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
                        onClick={() => speakSpartan(
                          task.title.includes('ウォーキング')
                            ? 'ウォーキングの時間だ！早く歩いたりゆっくり歩いたりして脂肪を燃やしてこい！緩急こそが最大の効果を生む！今すぐ外に出ろ！'
                            : task.category === 'health'
                            ? 'おい！ベッドの上にいるなら今すぐ寝転んだまま足を動かせ！YouTubeの動画を早く開いてフォームを確認して即スタートしろ！'
                            : `${task.title}、期限切れだ！今すぐやれ！言い訳は要らない！`
                        )}
                        className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-all"
                      >🔊 喝</button>
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
                  <p className="text-[10px] text-indigo-500">科目を入力して保存→空き時間を自動検出</p>
                </div>
                <button
                  onClick={saveSchoolGrid}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    schoolSaved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >{schoolSaved ? '✓ 保存済み' : '保存'}</button>
              </div>
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[10px] text-gray-400 font-semibold p-1 w-16">時限</th>
                      {WEEK_DAYS.map(d => (
                        <th key={d.idx} className="text-[10px] text-gray-600 font-bold p-1">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map(period => {
                      const isEvening = period >= 7;
                      const pt = PERIOD_TIMES[period];
                      return (
                        <tr key={period} className={period === 7 ? 'border-t-2 border-indigo-200' : ''}>
                          <td className="py-0.5 pr-1">
                            <div className="leading-tight text-center">
                              <div className={`text-[9px] font-bold ${isEvening ? 'text-indigo-500' : 'text-gray-500'}`}>
                                {PERIOD_LABELS[period]}
                              </div>
                              <div className={`text-[8px] ${isEvening ? 'text-indigo-300' : 'text-gray-300'}`}>
                                {pt.start}〜{pt.end}
                              </div>
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
                                placeholder="…"
                                maxLength={6}
                                className={`w-full px-1 py-1.5 border rounded-lg text-[10px] text-center focus:outline-none focus:ring-1 focus:border-transparent ${
                                  isEvening
                                    ? 'border-indigo-100 bg-indigo-50/40 text-indigo-800 placeholder-indigo-200 focus:ring-indigo-400'
                                    : 'border-gray-200 bg-white text-gray-800 placeholder-gray-200 focus:ring-indigo-400'
                                }`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-3 flex items-center gap-4 text-[9px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-white border border-gray-300" />
                  1〜6限: 授業時間
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-indigo-100 border border-indigo-300" />
                  夜1〜夜3: 夜間（〜22:00）
                </span>
              </div>
            </div>

            {/* 自動スケジュール */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-sm font-black text-gray-900">空き時間に自動タスク配置</p>
                  <p className="text-xs text-gray-400">未スケジュールのTODOを空き時間に自動で割り当てます</p>
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
              >⚡ 未スケジュールのタスクを自動配置する</button>
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
                  <p className="text-xs text-gray-400">タスク開始前に通知＋音声で叩き起こします</p>
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
                >🔔 通知を許可する</button>
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
                >{isSpeaking ? '話し中...' : '今すぐ聞く'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── メモタブ ── */}
        {tab === 'memo' && (
          <div className="space-y-4">
            {/* メモ追加ボタン */}
            <button
              onClick={() => setShowMemoAdd(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-black hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              ＋ 新しいメモを追加
            </button>

            {/* メモ一覧 */}
            {memos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-3xl mb-3">📝</p>
                <p className="text-sm text-gray-500 font-medium">メモはありません。<br/>手動で削除するまでずっと残ります。</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {memos.map(memo => (
                  <li key={memo.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3">
                      {memo.title && (
                        <p className="text-sm font-black text-gray-900 mb-1">{memo.title}</p>
                      )}
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{memo.text}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          memo.notifyEnabled ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {memo.notifyEnabled ? `🔔 ${NOTIFY_OPTIONS.find(o => o.value === memo.notifyTiming)?.label ?? ''}` : '🔕 通知オフ'}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {new Date(memo.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => { updateMemo(memo.id, { notifyEnabled: !memo.notifyEnabled }); reloadMemos(); }}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                        >{memo.notifyEnabled ? '通知を切る' : '通知を入れる'}</button>
                        <button
                          onClick={() => { if (confirm('このメモを削除しますか？')) { deleteMemo(memo.id); reloadMemos(); } }}
                          className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-bold px-2 py-0.5 hover:bg-red-50 rounded-lg"
                        >削除</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>

      {/* ── タスク追加モーダル ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">🔥 新しいタスクを追加</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              {/* タスク名プリセット */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">タスク名 *</label>
                <select
                  value={form.titlePreset}
                  onChange={e => onPresetChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  <option value="">— 選択してください —</option>
                  {TASK_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* その他の場合: 自由入力 */}
              {form.titlePreset === 'その他' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">タスク名（自由入力） *</label>
                  <input
                    type="text"
                    value={form.titleCustom}
                    onChange={e => setForm(f => ({ ...f, titleCustom: e.target.value }))}
                    placeholder="タスク名を入力..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}

              {/* 優先度・カテゴリ */}
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
                    <option value="study">📚 音楽・学習</option>
                    <option value="work">💼 仕事・MT</option>
                    <option value="health">💪 健康</option>
                    <option value="other">📌 その他</option>
                  </select>
                </div>
              </div>

              {/* 日付セレクト */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">📅 実施日</label>
                <select
                  value={form.scheduledDate}
                  onChange={e => {
                    setForm(f => ({ ...f, scheduledDate: e.target.value }));
                    checkConflict(e.target.value, form.scheduledHour, form.scheduledMinute, form.estimatedMin);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  {dateOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 時・分セレクト */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">🕐 開始時間（任意）</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={form.scheduledHour}
                    onChange={e => {
                      setForm(f => ({ ...f, scheduledHour: e.target.value }));
                      checkConflict(form.scheduledDate, e.target.value, form.scheduledMinute, form.estimatedMin);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  >
                    <option value="">-- 時 --</option>
                    {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}時</option>)}
                  </select>
                  <span className="text-gray-400 font-bold">:</span>
                  <select
                    value={form.scheduledMinute}
                    onChange={e => {
                      setForm(f => ({ ...f, scheduledMinute: e.target.value }));
                      checkConflict(form.scheduledDate, form.scheduledHour, e.target.value, form.estimatedMin);
                    }}
                    disabled={!form.scheduledHour}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:opacity-50"
                  >
                    {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m}分</option>)}
                  </select>
                </div>
              </div>

              {/* コンフリクト警告 */}
              {conflictWarning && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-base flex-shrink-0">⛔</span>
                  <div>
                    <p className="text-xs font-black text-red-700">時間が重複しています！</p>
                    <p className="text-[10px] text-red-600">{conflictWarning}</p>
                  </div>
                </div>
              )}

              {/* 所要時間・繰り返し */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">所要時間（分）</label>
                  <input type="number" value={form.estimatedMin}
                    onChange={e => {
                      setForm(f => ({ ...f, estimatedMin: e.target.value }));
                      checkConflict(form.scheduledDate, form.scheduledHour, form.scheduledMinute, e.target.value);
                    }}
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

              {/* 通知設定 */}
              <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">🔔 このタスクの通知</p>
                  <button
                    onClick={() => setForm(f => ({ ...f, notifyEnabled: !f.notifyEnabled }))}
                    className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${
                      form.notifyEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.notifyEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {form.notifyEnabled && (
                  <>
                    <select
                      value={form.notifyTiming}
                      onChange={e => setForm(f => ({ ...f, notifyTiming: e.target.value as NotifyTiming }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {NOTIFY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {form.notifyTiming === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={form.notifyCustomMin}
                          onChange={e => setForm(f => ({ ...f, notifyCustomMin: e.target.value }))}
                          min="1"
                          max="1440"
                          className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <span className="text-xs text-gray-500">分前に通知</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={
                  !!conflictWarning ||
                  !(form.titlePreset && (form.titlePreset !== 'その他' || form.titleCustom.trim()))
                }
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-sm font-black transition-all"
              >🔥 追加する</button>
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── メモ追加モーダル ── */}
      {showMemoAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">📝 メモを追加</h2>
              <button onClick={() => setShowMemoAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">タイトル（任意）</label>
                <input
                  type="text"
                  value={memoForm.title}
                  onChange={e => setMemoForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="メモのタイトル..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">メモ内容 *</label>
                <textarea
                  value={memoForm.text}
                  onChange={e => setMemoForm(f => ({ ...f, text: e.target.value }))}
                  placeholder="いつでも見返せるメモを書いてください。手動削除するまで永久に保存されます。"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              {/* 通知設定 */}
              <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">🔔 このメモの通知</p>
                  <button
                    onClick={() => setMemoForm(f => ({ ...f, notifyEnabled: !f.notifyEnabled }))}
                    className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${
                      memoForm.notifyEnabled ? 'bg-violet-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      memoForm.notifyEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {memoForm.notifyEnabled && (
                  <>
                    <select
                      value={memoForm.notifyTiming}
                      onChange={e => setMemoForm(f => ({ ...f, notifyTiming: e.target.value as NotifyTiming }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      {NOTIFY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {memoForm.notifyTiming === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={memoForm.notifyCustomMin}
                          onChange={e => setMemoForm(f => ({ ...f, notifyCustomMin: e.target.value }))}
                          min="1"
                          className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                        <span className="text-xs text-gray-500">分ごとに通知</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={submitMemo}
                disabled={!memoForm.text.trim()}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white text-sm font-black transition-all"
              >📝 メモを保存（永久保存）</button>
              <button onClick={() => setShowMemoAdd(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all">
                キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
