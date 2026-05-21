/**
 * SPARTA AI Hub — Shared Storage Layer
 *
 * All pages (/ /sparta /sports) run on the same Next.js origin,
 * so they genuinely share localStorage.
 *
 * Key compatibility:
 *  - "sparta-tasks-v2"      → Zustand persist format (matches スパルタマネージャー)
 *  - "sparta-calendar-v1"   → Zustand persist format (matches スパルタマネージャー)
 *  - "sf_record_YYYY-MM-DD" → plain JSON (matches ダイエットアプリ's sf_* keys)
 *  - "sf_done_YYYY-MM-DD"   → plain JSON (matches ダイエットアプリ)
 *  - "sf_weight_hist"       → plain JSON (matches ダイエットアプリ)
 */

// ── Task types (exact match with sparta-manager/src/store/task-store.ts) ──

export type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCAPED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskRecurrence = 'none' | 'daily' | 'weekly';

export interface LocalTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMin?: number;
  scheduledDate?: string;   // "YYYY-MM-DD"
  scheduledTime?: string;   // "HH:MM"
  recurrence: TaskRecurrence;
  tauntTimings: string[];
  // Hub-only extension fields — ignored by スパルタマネージャー, safe to include
  category?: 'study' | 'work' | 'health' | 'other';
  source?: 'ai-parsed' | 'manual' | 'exercise-app' | 'external-app';
  externalId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Daily fitness record (matches ダイエットアプリ's sf_record_* format)
export interface DailyRecord {
  weight?: number;
  fat?: number;
  bmi?: number;
  muscle?: number;
  steps?: number;
  calBurned?: number;
  exerciseCal?: number;
}

// ── Storage helpers ────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ── Task CRUD ─────────────────────────────────────────────────────────

const TASKS_KEY = 'sparta-tasks-v2';

/** Read tasks from Zustand persist envelope. */
export function getTasks(): LocalTask[] {
  const stored = load<{ state?: { tasks?: LocalTask[] } }>(TASKS_KEY, {});
  return stored?.state?.tasks ?? [];
}

/** Write tasks back into Zustand persist envelope (non-destructive merge). */
function saveTasks(tasks: LocalTask[]): void {
  const current = load<Record<string, unknown>>(TASKS_KEY, {});
  save(TASKS_KEY, {
    ...current,
    state: { ...((current.state as Record<string, unknown>) ?? {}), tasks, _hydrated: true },
  });
}

export function addTask(
  payload: Omit<LocalTask, 'id' | 'userId' | 'tauntTimings' | 'createdAt' | 'updatedAt'>
): LocalTask {
  const now = new Date().toISOString();
  const task: LocalTask = {
    tauntTimings: ['30min'],
    ...payload,
    id: `hub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: 'hub-user',
    createdAt: now,
    updatedAt: now,
  };
  saveTasks([task, ...getTasks()]);
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  saveTasks(
    getTasks().map(t =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    )
  );
}

export function deleteTask(id: string): void {
  saveTasks(getTasks().filter(t => t.id !== id));
}

/** Tasks that should appear on a specific date (handles recurrence). */
export function getTasksForDate(date: string): LocalTask[] {
  return getTasks().filter(t => {
    if (!t.scheduledDate) return false;
    if (t.recurrence === 'none') return t.scheduledDate === date;
    const base   = new Date(t.scheduledDate);
    const target = new Date(date);
    if (target < base) return false;
    if (t.recurrence === 'daily') return true;
    const diff = Math.round((target.getTime() - base.getTime()) / 86_400_000);
    return diff % 7 === 0;
  });
}

// ── Fitness / daily record (sf_* keys — compatible with ダイエットアプリ) ──

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

function recordKey(date: string) { return `sf_record_${date}`; }
function doneKey(date: string)   { return `sf_done_${date}`; }

export function getDailyRecord(date: string): DailyRecord {
  return load<DailyRecord>(recordKey(date), {});
}

export function saveDailyRecord(date: string, data: Partial<DailyRecord>): void {
  save(recordKey(date), { ...getDailyRecord(date), ...data });
}

export function getDoneExercises(date: string): string[] {
  return load<string[]>(doneKey(date), []);
}

export function markExerciseDone(date: string, exerciseId: string): void {
  const done = getDoneExercises(date);
  if (!done.includes(exerciseId)) save(doneKey(date), [...done, exerciseId]);
}

export function unmarkExerciseDone(date: string, exerciseId: string): void {
  save(doneKey(date), getDoneExercises(date).filter(id => id !== exerciseId));
}

export function getWeightHistory(): { date: string; weight: number }[] {
  return load<{ date: string; weight: number }[]>('sf_weight_hist', []);
}

export function addWeightRecord(date: string, weight: number): void {
  const hist = getWeightHistory().filter(h => h.date !== date);
  save('sf_weight_hist', [{ date, weight }, ...hist]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60)
  );
}

// ── Spartan comment generator ─────────────────────────────────────────

export function getSpartanComment(steps: number | undefined, doneCount: number): string {
  const s = steps ?? 0;
  if (s === 0 && doneCount === 0)
    return '今日は何もしてないのか！？今すぐ立ち上がれ！サボったら承知しないぞ！';
  if (s < 3000)
    return `歩数${s.toLocaleString()}歩しかない！最低8000歩だ！今すぐ動け！`;
  if (s < 8000)
    return `${s.toLocaleString()}歩か。及第点だ。しかし満足するな！運動もしっかりやれ！`;
  if (doneCount === 0)
    return `歩数${s.toLocaleString()}歩！いい感じだ。だが筋トレはどうした！？バランスよく鍛えろ！`;
  return `${s.toLocaleString()}歩歩いて運動${doneCount}種目完了！！その調子で毎日やりきれ！`;
}

// ── Priority label / color helpers ────────────────────────────────────

export function priorityColor(p: TaskPriority): string {
  return p === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
         p === 'HIGH'     ? 'bg-orange-100 text-orange-700 border-orange-200' :
         p === 'MEDIUM'   ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-gray-100 text-gray-600 border-gray-200';
}

export function priorityLabel(p: TaskPriority): string {
  return p === 'CRITICAL' ? '最重要' : p === 'HIGH' ? '高' : p === 'MEDIUM' ? '中' : '低';
}

// ── School Schedule ───────────────────────────────────────────────────

export interface SchoolSlot {
  id: string;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ..., 6=Sat
  period: 1 | 2 | 3 | 4 | 5 | 6;
  subject: string;
}

export const PERIOD_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:45', end: '09:35' },
  2: { start: '09:45', end: '10:35' },
  3: { start: '10:45', end: '11:35' },
  4: { start: '11:45', end: '12:35' },
  5: { start: '13:25', end: '14:15' },
  6: { start: '14:25', end: '15:15' },
};

export const DAY_NAMES_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

const SCHOOL_KEY = 'sparta-school-v1';

export function getSchoolSchedule(): SchoolSlot[] {
  return load<SchoolSlot[]>(SCHOOL_KEY, []);
}

export function saveSchoolSchedule(slots: SchoolSlot[]): void {
  save(SCHOOL_KEY, slots);
}

/** Free time blocks for a date, outside school hours (within 06:30–22:00). */
export function getFreeSlotsForDate(dateStr: string): { start: string; end: string; label: string }[] {
  const dow = new Date(dateStr).getDay();
  const daySlots = getSchoolSchedule().filter(s => s.day === dow);

  if (daySlots.length === 0) {
    return [{ start: '07:00', end: '22:00', label: '終日フリー' }];
  }

  const sorted  = daySlots.map(s => s.period).sort((a, b) => a - b);
  const schoolStart = PERIOD_TIMES[sorted[0]].start;
  const schoolEnd   = PERIOD_TIMES[sorted[sorted.length - 1]].end;

  const free: { start: string; end: string; label: string }[] = [];
  if (schoolStart > '07:00') {
    free.push({ start: '07:00', end: schoolStart, label: '登校前' });
  }
  free.push({ start: schoolEnd, end: '22:00', label: '放課後' });
  return free;
}

/**
 * Assign unscheduled TODO tasks into free time slots over the next N days.
 * Returns the number of tasks that were scheduled.
 */
export function autoSchedulePendingTasks(days = 7): number {
  const pending = getTasks().filter(t => t.status === 'TODO' && !t.scheduledDate);
  if (pending.length === 0) return 0;

  const updates = new Map<string, { scheduledDate: string; scheduledTime: string }>();
  let idx = 0;

  for (let d = 0; d < days && idx < pending.length; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    const dateStr = dt.toISOString().split('T')[0];
    const freeSlots = getFreeSlotsForDate(dateStr);

    for (const slot of freeSlots) {
      if (idx >= pending.length) break;
      updates.set(pending[idx].id, { scheduledDate: dateStr, scheduledTime: slot.start });
      idx++;
    }
  }

  const now = new Date().toISOString();
  saveTasks(getTasks().map(t => {
    const u = updates.get(t.id);
    return u ? { ...t, ...u, updatedAt: now } : t;
  }));

  return idx;
}
