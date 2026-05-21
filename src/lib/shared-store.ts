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
