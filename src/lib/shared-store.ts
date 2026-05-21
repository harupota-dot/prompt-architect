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

/** Split a free block into hourly (or N-minute) time slots. */
function getHourlySlots(startTime: string, endTime: string, intervalMin = 60): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins   = eh * 60 + em;
  const result: string[] = [];
  for (let t = startMins; t + intervalMin <= endMins; t += intervalMin) {
    result.push(
      `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`
    );
  }
  return result;
}

/** Free time blocks for a date, outside school hours (within 07:00–22:00).
 *  Detects lunch breaks and any other intra-day gaps between periods. */
export function getFreeSlotsForDate(dateStr: string): { start: string; end: string; label: string }[] {
  const dow = new Date(dateStr).getDay();
  const daySlots = getSchoolSchedule().filter(s => s.day === dow);

  if (daySlots.length === 0) {
    return [
      { start: '07:00', end: '12:00', label: '午前フリー' },
      { start: '12:00', end: '13:30', label: '昼フリー' },
      { start: '13:30', end: '22:00', label: '午後フリー' },
    ];
  }

  const periods = daySlots.map(s => s.period).sort((a, b) => a - b);
  const free: { start: string; end: string; label: string }[] = [];

  // Before school
  const firstStart = PERIOD_TIMES[periods[0]].start;
  if (firstStart > '07:00') {
    free.push({ start: '07:00', end: firstStart, label: '登校前' });
  }

  // Gaps between consecutive periods (e.g. lunch break ≥ 20 min)
  for (let i = 0; i < periods.length - 1; i++) {
    const thisEnd   = PERIOD_TIMES[periods[i]].end;
    const nextStart = PERIOD_TIMES[periods[i + 1]].start;
    const [h1, m1] = thisEnd.split(':').map(Number);
    const [h2, m2] = nextStart.split(':').map(Number);
    if ((h2 * 60 + m2) - (h1 * 60 + m1) >= 20) {
      free.push({ start: thisEnd, end: nextStart, label: '昼休み' });
    }
  }

  // After school → 22:00
  const lastEnd = PERIOD_TIMES[periods[periods.length - 1]].end;
  free.push({ start: lastEnd, end: '22:00', label: '放課後' });

  return free;
}

// ── Daily Quotes ──────────────────────────────────────────────────────

export interface QuoteEntry {
  name: string;
  quote: string;
  role: string;
  emoji: string;
  /** Tailwind gradient-from color (e.g. 'from-gray-700') */
  gradFrom: string;
  /** Tailwind gradient-to color (e.g. 'to-gray-900') */
  gradTo: string;
  initial: string;
}

const CREATOR_QUOTES: QuoteEntry[] = [
  { name: 'スティーブ・ジョブズ', quote: '自分が死ぬとわかっていると、何かを失うかもという恐れが消える。残るのは本当に大切なものだけだ。', role: 'Apple 共同創業者', emoji: '🍎', gradFrom: 'from-gray-600', gradTo: 'to-gray-900', initial: 'J' },
  { name: '宮崎駿', quote: '生きるということは、くだらないことと、すばらしいことがごちゃ混ぜになっているんだよ。どちらかだけって世の中はないんだ。', role: 'アニメーション監督', emoji: '🌿', gradFrom: 'from-emerald-700', gradTo: 'to-emerald-950', initial: '宮' },
  { name: 'ウォルト・ディズニー', quote: '夢を持つことと夢を信じることさえできれば、すべては実現できる。', role: 'Disney 創業者', emoji: '✨', gradFrom: 'from-blue-700', gradTo: 'to-indigo-950', initial: 'D' },
  { name: 'イーロン・マスク', quote: '失敗は選択肢の一つだ。何も失敗しないとすれば、それは革新的なことに取り組んでいない証拠だ。', role: 'Tesla / SpaceX CEO', emoji: '🚀', gradFrom: 'from-red-700', gradTo: 'to-red-950', initial: 'M' },
  { name: '本田宗一郎', quote: '人生に失敗が多いのは、成功するまでにあきらめるからだ。', role: 'Honda 創業者', emoji: '🏍️', gradFrom: 'from-amber-600', gradTo: 'to-amber-950', initial: '本' },
  { name: '稲盛和夫', quote: 'たいした才能はなくとも、強い熱意をもって物事に取り組んでいる人が最後に勝つ。', role: 'Kyocera 創業者', emoji: '🔥', gradFrom: 'from-violet-700', gradTo: 'to-violet-950', initial: '稲' },
  { name: '松下幸之助', quote: '困難に直面したときほど、人間の真価が現れる。失敗を活かさないことが恥だ。', role: 'Panasonic 創業者', emoji: '💡', gradFrom: 'from-teal-700', gradTo: 'to-teal-950', initial: '松' },
  { name: 'ビル・ゲイツ', quote: '成功を祝うのはいいことだが、もっと大切なのは失敗から学ぶことだ。', role: 'Microsoft 共同創業者', emoji: '💻', gradFrom: 'from-blue-700', gradTo: 'to-blue-950', initial: 'G' },
  { name: 'マーク・ザッカーバーグ', quote: '最大のリスクは、リスクを取らないことだ。', role: 'Meta CEO', emoji: '👤', gradFrom: 'from-blue-600', gradTo: 'to-indigo-900', initial: 'Z' },
  { name: 'ジェフ・ベゾス', quote: '今日が常に史上最高の日だ。昨日ではなく、今日何をするかが重要だ。', role: 'Amazon 創業者', emoji: '📦', gradFrom: 'from-amber-500', gradTo: 'to-amber-900', initial: 'B' },
  { name: '手塚治虫', quote: '夢をもて。夢がなければ努力する方向を見失う。', role: '漫画の神様', emoji: '✏️', gradFrom: 'from-slate-600', gradTo: 'to-slate-900', initial: '手' },
  { name: '岡本太郎', quote: '芸術は爆発だ！自分の中に毒を持て。それが生きるということだ。', role: '芸術家・思想家', emoji: '💥', gradFrom: 'from-red-600', gradTo: 'to-red-950', initial: '岡' },
  { name: '黒澤明', quote: '完璧主義者になれ。妥協した瞬間、作品は死ぬ。', role: '映画監督', emoji: '🎬', gradFrom: 'from-slate-700', gradTo: 'to-slate-950', initial: '黒' },
  { name: 'パブロ・ピカソ', quote: '全ての子供は芸術家だ。問題は、大人になっても芸術家でいられるかどうかだ。', role: '芸術家', emoji: '🎨', gradFrom: 'from-purple-700', gradTo: 'to-purple-950', initial: 'P' },
  { name: 'アルベルト・アインシュタイン', quote: '想像力は知識よりも重要だ。知識は有限だが、想像力は世界を包み込む。', role: '物理学者', emoji: '🧪', gradFrom: 'from-cyan-700', gradTo: 'to-cyan-950', initial: 'E' },
];

const ANIME_QUOTES: QuoteEntry[] = [
  { name: 'うずまきナルト', quote: '失敗を恐れることはない。失敗しても諦めなければ負けじゃない！オレは諦めないってばよ！', role: 'NARUTO', emoji: '🍥', gradFrom: 'from-orange-500', gradTo: 'to-orange-800', initial: 'ナ' },
  { name: 'モンキー・D・ルフィ', quote: 'おれは助けてもらわないと生きていけない自信がある！だから仲間が必要なんだ！', role: 'ONE PIECE', emoji: '🍖', gradFrom: 'from-red-500', gradTo: 'to-red-900', initial: 'ル' },
  { name: '竈門炭治郎', quote: 'どんなに傷ついても、折れるな。心を燃やせ。諦めなければ、必ず道は開ける。', role: '鬼滅の刃', emoji: '🔥', gradFrom: 'from-rose-600', gradTo: 'to-rose-950', initial: '炭' },
  { name: '煉獄杏寿郎', quote: '老いることも死ぬことも人間という儚い生き物の美しさだ。老いるからこそ、死ぬからこそ、堪らなく愛おしく尊いのだ！', role: '鬼滅の刃', emoji: '🌊', gradFrom: 'from-amber-500', gradTo: 'to-amber-800', initial: '煉' },
  { name: '孫悟空', quote: 'オラ、わくわくすっぞ！強い奴と戦えるなら、死んでもいいくらいだ！', role: 'ドラゴンボール', emoji: '⚡', gradFrom: 'from-amber-500', gradTo: 'to-orange-900', initial: '悟' },
  { name: '安西先生', quote: '諦めたら、そこで試合終了ですよ。', role: 'SLAM DUNK', emoji: '🏀', gradFrom: 'from-blue-700', gradTo: 'to-blue-950', initial: '安' },
  { name: 'エレン・イェーガー', quote: '戦え！戦え！戦え！このクソッタレな世界に——！壁の外の自由を奪い返すために！', role: '進撃の巨人', emoji: '⚔️', gradFrom: 'from-slate-600', gradTo: 'to-slate-900', initial: 'エ' },
  { name: 'リヴァイ・アッカーマン', quote: '選択はいつも誰にでも出来る。後悔しない選択など存在しないが、それでも選ばなければならない。', role: '進撃の巨人', emoji: '⚔️', gradFrom: 'from-gray-600', gradTo: 'to-gray-950', initial: 'リ' },
  { name: 'オールマイト', quote: '大丈夫だ。なぜなら、私が来た！', role: '僕のヒーローアカデミア', emoji: '💪', gradFrom: 'from-yellow-500', gradTo: 'to-blue-900', initial: 'オ' },
  { name: '緑谷出久', quote: '逃げていい。でも、逃げた先で、また夢を持て。立ち止まらない限り負けじゃない。', role: '僕のヒーローアカデミア', emoji: '🌿', gradFrom: 'from-green-600', gradTo: 'to-green-950', initial: '緑' },
  { name: 'エドワード・エルリック', quote: '人間が一番輝くのは、限界を超えようとした瞬間だ。', role: '鋼の錬金術師', emoji: '⚗️', gradFrom: 'from-amber-600', gradTo: 'to-red-900', initial: 'エ' },
  { name: '坂田銀時', quote: '人間が一番輝くのは諦めそうになった瞬間に諦めなかった時だ！', role: '銀魂', emoji: '🍭', gradFrom: 'from-slate-500', gradTo: 'to-slate-800', initial: '銀' },
  { name: 'うちはイタチ', quote: '自分が何者かは自分が決めることだ。他人に決めさせるな。', role: 'NARUTO', emoji: '🌙', gradFrom: 'from-indigo-700', gradTo: 'to-indigo-950', initial: 'イ' },
  { name: '日向翔陽', quote: '俺が飛べるって、信じてもらえますか？バレーは諦めたら終わりだ！', role: 'ハイキュー!!', emoji: '🏐', gradFrom: 'from-orange-600', gradTo: 'to-orange-900', initial: '日' },
  { name: 'ルルーシュ・ランペルージ', quote: '世界を変えたいなら、まず自分が変わらなければならない。そして行動しろ！', role: 'コードギアス', emoji: '👁️', gradFrom: 'from-violet-700', gradTo: 'to-violet-950', initial: 'ル' },
];

function dayOfYear(): number {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

export function getDailyQuotes(): { creator: QuoteEntry; anime: QuoteEntry } {
  const day = dayOfYear();
  return {
    creator: CREATOR_QUOTES[day % CREATOR_QUOTES.length],
    anime:   ANIME_QUOTES[day % ANIME_QUOTES.length],
  };
}

/**
 * Assign unscheduled TODO tasks into free time slots over the next N days.
 * Each free block is split into 1-hour increments so multiple tasks fit.
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
    const dateStr    = dt.toISOString().split('T')[0];
    const freeSlots  = getFreeSlotsForDate(dateStr);

    for (const slot of freeSlots) {
      // Break each free block into 60-min slots to fit multiple tasks
      const times = getHourlySlots(slot.start, slot.end, 60);
      for (const time of times) {
        if (idx >= pending.length) break;
        updates.set(pending[idx].id, { scheduledDate: dateStr, scheduledTime: time });
        idx++;
      }
      if (idx >= pending.length) break;
    }
  }

  const now = new Date().toISOString();
  saveTasks(getTasks().map(t => {
    const u = updates.get(t.id);
    return u ? { ...t, ...u, updatedAt: now } : t;
  }));

  return idx;
}
