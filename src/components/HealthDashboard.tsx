'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BreathingTimer } from './BreathingTimer';

// ─── Types ────────────────────────────────────────────────────────
interface Profile {
  height: number;
  age: number;
  sex: 'male' | 'female';
  currentWeight: number;
  goalWeight: number;
  goalDate: string;
  activityLevel: number;
}
interface WeeklyMetric {
  date: string;
  weight: number;
  fatPct: number;
  muscleMass: number;
  bmi: number;
  visceralFat: number;
  boneMass: number;
  bmr: number;
}
interface MealEntry { label: string; kcal: number; food?: string; grams?: number; }
interface DailyLog  { date: string; meals: MealEntry[]; }

interface AddedWorkout {
  id: string;
  name: string;
  kcalBurn: number;
  done: boolean;
}

interface ExerciseLog {
  date: string;
  steps: number;
  intervalWalkMins: number;
  breathingMins: number;
  workoutDone: boolean;
  pushupsDone: boolean;
  crunchesDone: boolean;
  bonusBurpees: boolean;
  bonusMountain: boolean;
  bonusPlank: boolean;
  addedWorkouts?: AddedWorkout[];
}

interface DayHistory {
  date: string;
  meals: { category: string; name: string; grams: number; kcal: number }[];
  workouts: string[];
  steps: number;
  intervalWalkMins: number;
  breathingMins: number;
  totalIntakeKcal: number;
  totalBurnedKcal: number;
  netKcal: number;
  targetKcal: number;
}
type HistoryMap = Record<string, DayHistory>;

// ─── localStorage keys ────────────────────────────────────────────
const LS_PROF     = 'health-profile-v1';
const LS_METRICS  = 'health-metrics-v1';
const LS_DAILY    = 'health-daily-v1';
const LS_EXERCISE = 'health-exercise-v1';
const LS_START    = 'health-start-date-v1';
const LS_HISTORY  = 'health-history-v2';

// ─── Helpers ──────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

function calcBMR(p: Profile, weight = p.currentWeight): number {
  if (p.sex === 'male')
    return 88.362 + 13.397 * weight + 4.799 * p.height - 5.677 * p.age;
  return 447.593 + 9.247 * weight + 3.098 * p.height - 4.330 * p.age;
}

function calcTargetKcal(p: Profile): { tdee: number; target: number; deficit: number; daysLeft: number } {
  const bmr   = calcBMR(p);
  const tdee  = Math.round(bmr * p.activityLevel);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const goal  = new Date(p.goalDate); goal.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(1, Math.round((goal.getTime() - today.getTime()) / 86400000));
  const totalLoss  = Math.max(0, p.currentWeight - p.goalWeight);
  const dailyKcalDeficit = Math.round((totalLoss * 7700) / daysLeft);
  const target = Math.max(1200, tdee - dailyKcalDeficit);
  return { tdee, target, deficit: dailyKcalDeficit, daysLeft };
}

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDateJP(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const wd = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${wd}）`;
}

// ─── 曜日別ワークアウト ───────────────────────────────────────────
interface WorkoutDef { name: string; desc: string; kcal: number; sets: string; }
const DAILY_WORKOUT: Record<number, WorkoutDef> = {
  0: { name: 'アクティブレスト',   kcal: 30,  sets: '全身を10分ストレッチ',
       desc: '筋肉を伸ばし血流を促進。各部位20〜30秒キープ、反動をつけずゆっくり伸ばす。' },
  1: { name: 'スロースクワット',   kcal: 80,  sets: '3セット × 12回',
       desc: '背筋を伸ばし、膝が爪先より前に出ないように腰を落とす。4秒かけて下ろし2秒で戻す。' },
  2: { name: 'プランク',           kcal: 50,  sets: '3セット × 30〜60秒',
       desc: '肘を肩の真下に置き、頭〜踵を一直線に保つ。腰が落ちないよう腹に力を入れ続ける。' },
  3: { name: 'ヒップリフト',       kcal: 60,  sets: '3セット × 15回',
       desc: '仰向けで膝を立て、お尻をゆっくり持ち上げ2秒キープ。背中が反らないよう腹筋で支える。' },
  4: { name: 'バードドッグ',       kcal: 50,  sets: '左右各3セット × 10回',
       desc: '四つ這いで対角の手足を同時に伸ばし3秒キープ。体が傾かないよう体幹を意識する。' },
  5: { name: 'リバースランジ',     kcal: 80,  sets: '左右各3セット × 10回',
       desc: '片足を後ろに引いて膝を床ギリギリまで下ろす。前足の膝は90°、体は垂直を保つ。' },
  6: { name: 'ロシアンツイスト',   kcal: 60,  sets: '3セット × 20回（左右各10）',
       desc: '膝を軽く曲げ上体を30°後ろに倒す。両手を合わせ左右交互にひねり、腹斜筋を意識する。' },
};

const PUSHUP_DESC = '肩幅より少し広めに手をつき、体を頭〜踵まで一直線に保つ。胸が床に触れる寸前まで下ろし、ゆっくり押し戻す。';
const CRUNCH_DESC = '仰向けで膝を立て、反動を使わずおへそを覗き込むように息を吐きながら上体を丸める。腰は床に付けたまま。';

function getWeeksSinceStart(): number {
  try {
    const s = localStorage.getItem(LS_START);
    if (!s) { localStorage.setItem(LS_START, new Date().toISOString().slice(0, 10)); return 0; }
    const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
    return Math.floor(days / 7);
  } catch { return 0; }
}

function buildWorkoutNames(ex: ExerciseLog, workout: WorkoutDef, repsTarget: number): string[] {
  const names: string[] = [];
  if (ex.workoutDone)          names.push(`${workout.name}（${workout.sets}）`);
  if (ex.pushupsDone)          names.push(`腕立て伏せ（${repsTarget}回×3セット）`);
  if (ex.crunchesDone)         names.push(`腹筋クランチ（${repsTarget}回×3セット）`);
  if (ex.bonusBurpees)         names.push('ステップバック・バーピー（3セット×10回）');
  if (ex.bonusMountain)        names.push('マウンテンクライマー（3セット×30秒）');
  if (ex.bonusPlank)           names.push('プランク追加（2セット×60秒）');
  (ex.addedWorkouts ?? []).forEach(w => names.push(`${w.name}（${w.kcalBurn}kcal）`));
  if (ex.intervalWalkMins > 0) names.push(`インターバル速歩（${ex.intervalWalkMins}分）`);
  if (ex.breathingMins > 0)    names.push(`腹式呼吸（${ex.breathingMins}分）`);
  if (ex.steps > 0)            names.push(`ウォーキング（${ex.steps.toLocaleString()}歩）`);
  return names;
}

// ─── 選択式追加ワークアウトの定義 ──────────────────────────────────
interface AddWorkoutOption { label: string; icon: string; met: number; hours: number; }
const ADD_WORKOUT_OPTIONS: AddWorkoutOption[] = [
  { label: 'ウォーキング（30分）',        icon: '🚶', met: 3.5, hours: 0.5   },
  { label: 'ジョギング（20分）',          icon: '🏃', met: 7.0, hours: 0.333 },
  { label: 'サイクリング（30分）',        icon: '🚴', met: 6.0, hours: 0.5   },
  { label: '水泳（30分）',               icon: '🏊', met: 8.0, hours: 0.5   },
  { label: 'ヨガ・ストレッチ（20分）',    icon: '🧘', met: 2.5, hours: 0.333 },
  { label: 'HIIT（10分）',              icon: '⚡', met: 8.0, hours: 0.167 },
];

// ─── 食材データベース（五十音順） ──────────────────────────────────
interface FoodItem { name: string; baseGrams: number; baseKcal: number; custom?: true; }
const FOOD_DB: FoodItem[] = [
  { name: 'アイスクリーム（濃厚/アイス規格）',   baseGrams: 100, baseKcal: 212 },
  { name: 'アイスクリーム（中間/ラクトアイス）', baseGrams: 100, baseKcal: 224 },
  { name: 'アイスクリーム（氷/氷菓）',           baseGrams: 100, baseKcal: 100 },
  { name: 'おにぎり（白飯）',                    baseGrams: 100, baseKcal: 156 },
  { name: 'カニカマ',                            baseGrams:  75, baseKcal:  67 },
  { name: 'キャベツ',                            baseGrams:  50, baseKcal:  11 },
  { name: 'きゅうり',                            baseGrams: 100, baseKcal:  14 },
  { name: 'さくらんぼ',                          baseGrams:  50, baseKcal:  30 },
  { name: 'さつまいも',                          baseGrams: 100, baseKcal: 132 },
  { name: 'さば',                                baseGrams: 100, baseKcal: 246 },
  { name: '鮭',                                  baseGrams: 100, baseKcal: 133 },
  { name: 'スイカ',                              baseGrams: 150, baseKcal:  55 },
  { name: 'スープ（コーンスープ）',              baseGrams: 150, baseKcal:  65 },
  { name: 'スープ（コンソメスープ）',            baseGrams: 150, baseKcal:  15 },
  { name: 'スープ（ポタージュ）',                baseGrams: 150, baseKcal:  70 },
  { name: '卵',                                  baseGrams:  60, baseKcal:  91 },
  { name: 'たら',                                baseGrams: 100, baseKcal:  77 },
  { name: 'ちくわ',                              baseGrams:  30, baseKcal:  36 },
  { name: 'ツナ缶',                              baseGrams:  70, baseKcal:  50 },
  { name: '豆腐',                                baseGrams: 150, baseKcal: 108 },
  { name: '豆乳',                                baseGrams: 200, baseKcal:  92 },
  { name: '豆乳コーヒー',                        baseGrams: 200, baseKcal: 120 },
  { name: '鶏むね肉',                            baseGrams: 100, baseKcal: 108 },
  { name: '鶏もも肉',                            baseGrams: 100, baseKcal: 116 },
  { name: 'ドレッシング（ごま）',                baseGrams:  15, baseKcal:  60 },
  { name: 'ドレッシング（シーザー）',            baseGrams:  15, baseKcal:  70 },
  { name: 'ドレッシング（和風）',                baseGrams:  15, baseKcal:  10 },
  { name: 'ナス',                                baseGrams: 100, baseKcal:  22 },
  { name: '納豆',                                baseGrams:  50, baseKcal: 100 },
  { name: 'パイナップル',                        baseGrams: 100, baseKcal:  53 },
  { name: 'バナナ',                              baseGrams: 100, baseKcal:  86 },
  { name: 'ぶどう',                              baseGrams: 100, baseKcal:  59 },
  { name: 'プロセスチーズ',                      baseGrams:  20, baseKcal:  68 },
  { name: 'ベビーチーズ',                        baseGrams:  15, baseKcal:  50 },
  { name: 'みそ汁',                              baseGrams: 150, baseKcal:  40 },
  { name: '麦飯',                                baseGrams: 150, baseKcal: 230 },
  { name: 'もやし',                              baseGrams: 100, baseKcal:  14 },
  { name: '焼きのり',                            baseGrams:   3, baseKcal:   6 },
  { name: 'ヨーグルト（無糖）',                  baseGrams: 100, baseKcal:  62 },
  { name: 'りんご',                              baseGrams: 150, baseKcal:  85 },
  { name: 'レタス',                              baseGrams:  50, baseKcal:   6 },
  // 自由入力プレースホルダー
  { name: 'その他（自由入力）', baseGrams: 0, baseKcal: 0, custom: true },
];

// ─── Sub-tab type ─────────────────────────────────────────────────
type Tab = 'goals' | 'today' | 'metrics' | 'trends' | 'advice' | 'history';

// ═══════════════════════════════════════════════════════════════════
// Goals tab
// ═══════════════════════════════════════════════════════════════════
function GoalsTab({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Profile, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const handle = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const calc = calcTargetKcal(form);
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white";
  const labelCls = "text-xs font-bold text-gray-800 mb-1 block";

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white text-center">
        <p className="text-xs font-bold opacity-70 mb-1">1日の目標摂取カロリー</p>
        <p className="text-5xl font-black">{calc.target.toLocaleString()}</p>
        <p className="text-sm opacity-80">kcal / day</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] opacity-60">TDEE</p><p className="text-sm font-bold">{calc.tdee} kcal</p></div>
          <div><p className="text-[10px] opacity-60">日次不足</p><p className="text-sm font-bold">{calc.deficit} kcal</p></div>
          <div><p className="text-[10px] opacity-60">残り日数</p><p className="text-sm font-bold">{calc.daysLeft} 日</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-black text-gray-900 mb-2">プロフィール</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>身長 (cm)</label>
            <input type="number" className={inputCls} value={form.height || ''} onChange={e => set('height', +e.target.value)} placeholder="170" /></div>
          <div><label className={labelCls}>年齢</label>
            <input type="number" className={inputCls} value={form.age || ''} onChange={e => set('age', +e.target.value)} placeholder="25" /></div>
          <div><label className={labelCls}>性別</label>
            <select className={inputCls} value={form.sex} onChange={e => set('sex', e.target.value as 'male'|'female')}>
              <option value="male">男性</option><option value="female">女性</option>
            </select></div>
          <div><label className={labelCls}>活動レベル</label>
            <select className={inputCls} value={form.activityLevel} onChange={e => set('activityLevel', +e.target.value)}>
              <option value={1.2}>座り仕事中心</option>
              <option value={1.375}>軽い運動あり</option>
              <option value={1.55}>週3〜5回運動</option>
              <option value={1.725}>毎日ハード運動</option>
              <option value={1.9}>肉体労働</option>
            </select></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-black text-gray-900 mb-2">目標設定</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>現在の体重 (kg)</label>
            <input type="number" step="0.1" className={inputCls} value={form.currentWeight || ''} onChange={e => set('currentWeight', +e.target.value)} placeholder="70.0" /></div>
          <div><label className={labelCls}>目標体重 (kg)</label>
            <input type="number" step="0.1" className={inputCls} value={form.goalWeight || ''} onChange={e => set('goalWeight', +e.target.value)} placeholder="65.0" /></div>
          <div className="col-span-2"><label className={labelCls}>目標達成日</label>
            <input type="date" className={inputCls} value={form.goalDate} onChange={e => set('goalDate', e.target.value)} /></div>
        </div>
      </div>
      <button onClick={handle}
        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white active:scale-95'}`}>
        {saved ? '✓ 保存しました' : '保存する'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Daily tracker tab（selectedDate ベース）
// ═══════════════════════════════════════════════════════════════════
const MEAL_LABELS = ['朝食', '昼食', '夕食', '間食', 'ドリンク'];
const LABEL_COLOR: Record<string, string> = {
  '朝食':    'bg-amber-100 text-amber-800',
  '昼食':    'bg-sky-100 text-sky-800',
  '夕食':    'bg-indigo-100 text-indigo-800',
  '間食':    'bg-rose-100 text-rose-800',
  'ドリンク':'bg-emerald-100 text-emerald-800',
};

function TodayTab({
  profile,
  selectedDate,
  onDateChange,
}: {
  profile: Profile;
  selectedDate: string;
  onDateChange: (d: string) => void;
}) {
  const targetKcal = calcTargetKcal(profile).target;
  const isToday    = selectedDate === todayStr();
  const weekday    = new Date(selectedDate + 'T00:00:00').getDay();
  const workout    = DAILY_WORKOUT[weekday];
  const weeks      = getWeeksSinceStart();
  const repsTarget = 10 + weeks * 2;

  // ── Food log state ──
  const [logs, setLogs] = useState<DailyLog[]>(() => load<DailyLog[]>(LS_DAILY, []));
  const [exLogs, setExLogs] = useState<ExerciseLog[]>(() => load<ExerciseLog[]>(LS_EXERCISE, []));

  // 選択日付が変わったら最新データを再ロード
  useEffect(() => {
    setLogs(load<DailyLog[]>(LS_DAILY, []));
    setExLogs(load<ExerciseLog[]>(LS_EXERCISE, []));
  }, [selectedDate]);

  const todayLog: DailyLog = logs.find(l => l.date === selectedDate) ?? { date: selectedDate, meals: [] };
  const todayEx: ExerciseLog = exLogs.find(e => e.date === selectedDate) ?? {
    date: selectedDate, steps: 0, intervalWalkMins: 0, breathingMins: 0,
    workoutDone: false, pushupsDone: false, crunchesDone: false,
    bonusBurpees: false, bonusMountain: false, bonusPlank: false,
    addedWorkouts: [],
  };

  const updateEx = (patch: Partial<ExerciseLog>) => {
    const updated = exLogs.filter(e => e.date !== selectedDate);
    const next    = [{ ...todayEx, ...patch }, ...updated];
    setExLogs(next);
    save(LS_EXERCISE, next);
  };

  // ── Calorie maths ──
  const foodKcal       = todayLog.meals.reduce((s, m) => s + m.kcal, 0);
  const weight         = profile.currentWeight || 60;
  const stepsKcal      = Math.round(todayEx.steps * weight * 0.0005);
  const intervalKcal   = Math.round((todayEx.intervalWalkMins || 0) * weight * 0.08);
  const breathingKcal  = (todayEx.breathingMins || 0) * 3;
  const addedKcal      = (todayEx.addedWorkouts ?? []).filter(w => w.done).reduce((s, w) => s + w.kcalBurn, 0);
  const exKcal         =
    (todayEx.workoutDone   ? workout.kcal : 0) +
    (todayEx.pushupsDone   ? 30 : 0) +
    (todayEx.crunchesDone  ? 20 : 0) +
    (todayEx.bonusBurpees  ? 80 : 0) +
    (todayEx.bonusMountain ? 60 : 0) +
    (todayEx.bonusPlank    ? 40 : 0) +
    addedKcal + intervalKcal + breathingKcal;
  const totalBurned = stepsKcal + exKcal;
  const remaining   = targetKcal + totalBurned - foodKcal;
  const success     = remaining >= 0;
  const effectiveTarget = targetKcal + totalBurned;
  const pct = Math.min(100, Math.round(foodKcal / Math.max(1, effectiveTarget) * 100));
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500';

  // ── 詳細履歴への自動保存 ──
  useEffect(() => {
    const historyMap: HistoryMap = load<HistoryMap>(LS_HISTORY, {});
    historyMap[selectedDate] = {
      date:            selectedDate,
      meals:           todayLog.meals.map(m => ({ category: m.label, name: m.food ?? m.label, grams: m.grams ?? 0, kcal: m.kcal })),
      workouts:        buildWorkoutNames(todayEx, workout, repsTarget),
      steps:           todayEx.steps,
      intervalWalkMins: todayEx.intervalWalkMins,
      breathingMins:   todayEx.breathingMins,
      totalIntakeKcal: foodKcal,
      totalBurnedKcal: totalBurned,
      netKcal:         remaining,
      targetKcal,
    };
    save(LS_HISTORY, historyMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, exLogs, selectedDate]);

  // ── 追加ワークアウト state ──
  const [addWkIdx, setAddWkIdx] = useState(0);
  const addWorkout = () => {
    const opt = ADD_WORKOUT_OPTIONS[addWkIdx];
    const kcalBurn = Math.round(opt.met * weight * opt.hours * 1.05);
    const newW: AddedWorkout = { id: Date.now().toString(), name: opt.label, kcalBurn, done: false };
    const next = exLogs.filter(e => e.date !== selectedDate);
    const updated = [{ ...todayEx, addedWorkouts: [...(todayEx.addedWorkouts ?? []), newW] }, ...next];
    setExLogs(updated); save(LS_EXERCISE, updated);
  };
  const toggleAddedWorkout = (id: string) => {
    const updated = (todayEx.addedWorkouts ?? []).map(w => w.id === id ? { ...w, done: !w.done } : w);
    const next = [{ ...todayEx, addedWorkouts: updated }, ...exLogs.filter(e => e.date !== selectedDate)];
    setExLogs(next); save(LS_EXERCISE, next);
  };
  const removeAddedWorkout = (id: string) => {
    const updated = (todayEx.addedWorkouts ?? []).filter(w => w.id !== id);
    const next = [{ ...todayEx, addedWorkouts: updated }, ...exLogs.filter(e => e.date !== selectedDate)];
    setExLogs(next); save(LS_EXERCISE, next);
  };

  // ── Food form state ──
  const [timing,      setTiming]      = useState(MEAL_LABELS[0]);
  const [foodIdx,     setFoodIdx]     = useState<number>(-1);
  const [grams,       setGrams]       = useState('');
  const [search,      setSearch]      = useState('');
  const [showDrop,    setShowDrop]    = useState(false);
  // カスタム入力モード
  const [customMode,  setCustomMode]  = useState(false);
  const [customName,  setCustomName]  = useState('');
  const [customGrams, setCustomGrams] = useState('');
  const [customKcal,  setCustomKcal]  = useState('');

  const food = foodIdx >= 0 ? FOOD_DB[foodIdx] : null;
  const isCustom = food?.custom === true;

  const computedKcal = (() => {
    if (isCustom) return parseInt(customKcal) || 0;
    if (!food || !grams) return 0;
    const g = parseFloat(grams);
    return g > 0 ? Math.round((g / food.baseGrams) * food.baseKcal) : 0;
  })();

  const selectFood = (idx: number) => {
    const f = FOOD_DB[idx];
    setFoodIdx(idx);
    if (f.custom) {
      setCustomMode(true);
      setGrams('');
      setSearch(f.name);
    } else {
      setCustomMode(false);
      setGrams(String(f.baseGrams));
      setSearch(f.name);
    }
    setShowDrop(false);
    setCustomName(''); setCustomGrams(''); setCustomKcal('');
  };

  const filtered = (search.trim() === '' || (food && search === food.name))
    ? FOOD_DB.map((f, i) => ({ f, i }))
    : FOOD_DB.map((f, i) => ({ f, i })).filter(({ f }) => f.name.includes(search));

  const addMeal = () => {
    const kcal = computedKcal;
    if (kcal <= 0) return;
    const name  = isCustom ? (customName.trim() || 'カスタム') : (food?.name ?? '');
    const g     = isCustom ? (parseFloat(customGrams) || 0) : parseFloat(grams);
    const newMeal: MealEntry = { label: timing, kcal, food: name, grams: g || undefined };
    const updated = logs.filter(l => l.date !== selectedDate);
    const next = [{ date: selectedDate, meals: [...todayLog.meals, newMeal] }, ...updated];
    setLogs(next); save(LS_DAILY, next);
    setFoodIdx(-1); setGrams(''); setSearch('');
    setCustomMode(false); setCustomName(''); setCustomGrams(''); setCustomKcal('');
  };

  const removeMeal = (i: number) => {
    const next = [
      { date: selectedDate, meals: todayLog.meals.filter((_, idx) => idx !== i) },
      ...logs.filter(l => l.date !== selectedDate),
    ];
    setLogs(next); save(LS_DAILY, next);
  };

  const grouped = MEAL_LABELS.map(lbl => ({
    lbl, meals: todayLog.meals.map((m, i) => ({ m, i })).filter(({ m }) => m.label === lbl),
  })).filter(g => g.meals.length > 0);

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white text-gray-900';

  // ── WorkoutCard ──
  const WorkoutCard = ({
    icon, title, subtitle, desc, sets, kcalBurn, done, onToggle,
  }: {
    icon: string; title: string; subtitle?: string; desc: string;
    sets: string; kcalBurn: number; done: boolean; onToggle: () => void;
  }) => (
    <div className={`rounded-2xl border-2 p-4 transition-all ${done ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle}
          className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-sm border-2 transition-all mt-0.5 ${
            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-400 text-transparent'
          }`}>✓</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{icon}</span>
            <p className={`text-sm font-black ${done ? 'text-emerald-800' : 'text-gray-900'}`}>{title}</p>
            {subtitle && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{subtitle}</span>}
            <span className="text-xs font-bold text-gray-800 ml-auto">−{kcalBurn} kcal</span>
          </div>
          <p className="text-xs text-indigo-800 font-bold mt-1">{sets}</p>
          <p className="text-xs text-gray-800 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ══ 日付セレクター ══ */}
      <div className={`rounded-2xl p-4 border-2 ${isToday ? 'border-gray-900 bg-gray-900' : 'border-amber-500 bg-amber-50'}`}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className={`text-xs font-black mb-1 ${isToday ? 'text-gray-300' : 'text-amber-800'}`}>
              {isToday ? '📅 今日の記録' : '✏️ 過去の記録を編集中'}
            </p>
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={e => e.target.value && onDateChange(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-base font-black border-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                isToday ? 'bg-white/10 text-white' : 'bg-white text-gray-900 border border-amber-300'
              }`}
            />
          </div>
          {!isToday && (
            <button
              onClick={() => onDateChange(todayStr())}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-black active:scale-95 transition-all">
              今日に戻る
            </button>
          )}
        </div>
        {!isToday && (
          <p className="text-xs font-bold text-amber-700 mt-2">
            ⚠️ {fmtDateJP(selectedDate)} のデータを編集しています
          </p>
        )}
      </div>

      {/* ══ 体重進捗バー ══ */}
      {(() => {
        const cw = profile.currentWeight;
        const gw = profile.goalWeight;
        if (!cw || !gw || cw <= 0 || gw <= 0) return null;
        const bmr = Math.round(calcBMR(profile));
        const remaining = Math.max(0, cw - gw);
        const totalNeeded = Math.max(0.1, cw - gw);
        // 進捗 = どれだけ目標に近づいたか（0%=現在体重、100%=目標体重）
        // ここでは「現在から目標までの距離」を視覚化
        const progressPct = cw <= gw ? 100 : 0; // 目標達成時100%
        // 開始体重をメトリクスの最大値から取得、なければ currentWeight
        const metrics = load<WeeklyMetric[]>(LS_METRICS, []);
        const maxWeight = metrics.length > 0 ? Math.max(...metrics.map(m => m.weight).filter(v => v > 0)) : cw;
        const startW = Math.max(maxWeight, cw);
        const totalLoss = Math.max(0.1, startW - gw);
        const lostSoFar = Math.max(0, startW - cw);
        const pctDone = Math.min(100, Math.round((lostSoFar / totalLoss) * 100));
        const isGoalReached = cw <= gw;
        return (
          <div className={`rounded-2xl p-4 border-2 ${isGoalReached ? 'border-emerald-500 bg-emerald-50' : 'border-indigo-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-gray-900">⚖️ 体重の進捗</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isGoalReached ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-900'}`}>
                {isGoalReached ? '🎉 目標達成！' : `あと ${remaining.toFixed(1)} kg`}
              </span>
            </div>
            <div className="flex items-end justify-between mb-2 gap-2">
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-700">スタート</p>
                <p className="text-base font-black text-gray-900">{startW.toFixed(1)}<span className="text-xs font-bold">kg</span></p>
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isGoalReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-violet-500'}`}
                    style={{ width: `${Math.max(4, pctDone)}%` }}
                  />
                </div>
                <p className="text-center text-xs font-black text-indigo-800 mt-1">{pctDone}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-700">目標</p>
                <p className="text-base font-black text-emerald-800">{gw.toFixed(1)}<span className="text-xs font-bold">kg</span></p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-700">現在の体重</p>
                <p className="text-xl font-black text-gray-900">{cw.toFixed(1)}<span className="text-sm font-bold">kg</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-700">推定 BMR</p>
                <p className="text-xl font-black text-indigo-900">{bmr.toLocaleString()}<span className="text-sm font-bold">kcal</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-700">1日目標</p>
                <p className="text-xl font-black text-violet-900">{targetKcal.toLocaleString()}<span className="text-sm font-bold">kcal</span></p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ カロリー収支サマリー ══ */}
      <div className={`rounded-2xl p-5 text-white ${success
        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
        : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold opacity-80">{fmtDateJP(selectedDate)}</p>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white/20">
            {success ? '✅ Success！' : '⚠️ Over...'}
          </span>
        </div>
        <div className="text-center mb-4">
          <p className="text-5xl font-black">{Math.abs(remaining).toLocaleString()}</p>
          <p className="text-sm opacity-80">{success ? 'kcal まだ食べられる' : 'kcal オーバー'}</p>
        </div>
        <div className="bg-white/15 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="opacity-80">目標摂取</span><span className="font-black">+{targetKcal.toLocaleString()} kcal</span></div>
          <div className="flex justify-between"><span className="opacity-80">🚶 歩数消費 ({todayEx.steps.toLocaleString()}歩)</span><span className="font-black">+{stepsKcal} kcal</span></div>
          {intervalKcal > 0 && <div className="flex justify-between"><span className="opacity-80">🏃 速歩 ({todayEx.intervalWalkMins}分)</span><span className="font-black">+{intervalKcal} kcal</span></div>}
          {breathingKcal > 0 && <div className="flex justify-between"><span className="opacity-80">🌬️ 腹式呼吸 ({todayEx.breathingMins}分)</span><span className="font-black">+{breathingKcal} kcal</span></div>}
          {addedKcal > 0 && <div className="flex justify-between"><span className="opacity-80">➕ 追加運動</span><span className="font-black">+{addedKcal} kcal</span></div>}
          <div className="flex justify-between"><span className="opacity-80">💪 運動消費</span><span className="font-black">+{exKcal - intervalKcal - breathingKcal - addedKcal} kcal</span></div>
          <div className="flex justify-between border-t border-white/20 pt-1.5"><span className="opacity-80">🍽️ 食事摂取</span><span className="font-black">−{foodKcal.toLocaleString()} kcal</span></div>
        </div>
        <div className="mt-3">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] opacity-70 mt-1 text-right">
            {success ? '素晴らしいペースです！このまま続けよう 🎯' : '明日調整しましょう。運動でリカバリーも◎'}
          </p>
        </div>
      </div>

      {/* ══ 歩数入力 ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚶</span>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">歩数</p>
            <p className="text-xs font-bold text-gray-800">消費 = 歩数 × 体重({weight}kg) × 0.0005</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={todayEx.steps || ''} placeholder="0"
              onChange={e => updateEx({ steps: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:border-indigo-400 text-gray-900" />
            <span className="text-xs text-gray-800 font-bold w-6">歩</span>
          </div>
        </div>
        {stepsKcal > 0 && <p className="text-xs text-emerald-700 font-black mt-2 text-right">消費 {stepsKcal} kcal</p>}
      </div>

      {/* ══ インターバル速歩 ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏃</span>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">インターバル速歩</p>
            <p className="text-xs font-bold text-gray-800">分数 × 体重 × 0.08</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={todayEx.intervalWalkMins || ''} placeholder="0"
              onChange={e => updateEx({ intervalWalkMins: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:border-emerald-400 text-gray-900" />
            <span className="text-xs text-gray-800 font-bold w-6">分</span>
          </div>
        </div>
        {intervalKcal > 0 && <p className="text-xs text-emerald-700 font-black mt-2 text-right">消費 {intervalKcal} kcal</p>}
      </div>

      {/* ══ 今日のワークアウト ══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <p className="text-xs font-black text-gray-900">ワークアウト</p>
          <span className="text-xs font-bold text-gray-800">
            {['日','月','火','水','木','金','土'][weekday]}曜日メニュー
          </span>
          {exKcal > 0 && <span className="ml-auto text-xs font-black text-emerald-700">合計 −{exKcal} kcal</span>}
        </div>
        <WorkoutCard icon="🏋️" title={workout.name} sets={workout.sets} desc={workout.desc}
          kcalBurn={workout.kcal} done={todayEx.workoutDone} onToggle={() => updateEx({ workoutDone: !todayEx.workoutDone })} />
        <WorkoutCard icon="💪" title="腕立て伏せ" subtitle={`目標 ${repsTarget}回 × 3セット`}
          sets={`${repsTarget}回 × 3セット（${weeks}週目）`} desc={PUSHUP_DESC}
          kcalBurn={30} done={todayEx.pushupsDone} onToggle={() => updateEx({ pushupsDone: !todayEx.pushupsDone })} />
        <WorkoutCard icon="🔥" title="腹筋（クランチ）" subtitle={`目標 ${repsTarget}回 × 3セット`}
          sets={`${repsTarget}回 × 3セット（${weeks}週目）`} desc={CRUNCH_DESC}
          kcalBurn={20} done={todayEx.crunchesDone} onToggle={() => updateEx({ crunchesDone: !todayEx.crunchesDone })} />
      </div>

      {/* ══ ボーナスワークアウト ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <p className="text-sm font-black text-gray-900">今日はもっとできる！</p>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">ボーナス</span>
        </div>
        {([
          { key: 'bonusBurpees'  as const, icon: '🤸', name: 'ステップバック・バーピー', sets: '3セット × 10回', kcal: 80,
            desc: '立った状態から手をついてプランク→足を戻して立ち上がる。有酸素と筋トレを同時に刺激。' },
          { key: 'bonusMountain' as const, icon: '🏔️', name: 'マウンテンクライマー',   sets: '3セット × 30秒', kcal: 60,
            desc: 'プランク姿勢から交互に膝を引き付ける。体幹・有酸素・下半身を同時強化。' },
          { key: 'bonusPlank'    as const, icon: '🧱', name: 'プランク（追加セット）', sets: '2セット × 60秒', kcal: 40,
            desc: '肩・腹・臀部を一直線に保ち追加キープ。体幹の持久力を底上げする。' },
        ] as const).map(({ key, icon, name, sets, kcal, desc }) => (
          <WorkoutCard key={key} icon={icon} title={name} sets={sets} desc={desc}
            kcalBurn={kcal} done={todayEx[key]} onToggle={() => updateEx({ [key]: !todayEx[key] })} />
        ))}
      </div>

      {/* ══ 追加ワークアウト ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">➕</span>
          <p className="text-sm font-black text-gray-900">運動を追加する</p>
          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">Add Workout</span>
        </div>
        <div className="flex gap-2">
          <select
            value={addWkIdx}
            onChange={e => setAddWkIdx(Number(e.target.value))}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-400 bg-white">
            {ADD_WORKOUT_OPTIONS.map((opt, i) => {
              const kcal = Math.round(opt.met * weight * opt.hours * 1.05);
              return (
                <option key={i} value={i}>{opt.icon} {opt.label}（約{kcal}kcal）</option>
              );
            })}
          </select>
          <button
            onClick={addWorkout}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black active:scale-95 transition-all flex-shrink-0">
            追加
          </button>
        </div>
        {(todayEx.addedWorkouts ?? []).length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-black text-gray-800">追加済みの運動</p>
            {(todayEx.addedWorkouts ?? []).map(w => (
              <div key={w.id} className={`rounded-xl border-2 p-3 flex items-center gap-3 transition-all ${w.done ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={() => toggleAddedWorkout(w.id)}
                  className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-sm border-2 transition-all ${
                    w.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-400 text-transparent'
                  }`}>✓</button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black ${w.done ? 'text-emerald-800' : 'text-gray-900'}`}>{w.name}</p>
                  <p className="text-xs font-bold text-gray-800">消費 {w.kcalBurn} kcal</p>
                </div>
                <button
                  onClick={() => removeAddedWorkout(w.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm active:scale-90 transition-all flex-shrink-0 font-black">
                  🗑
                </button>
              </div>
            ))}
            {addedKcal > 0 && (
              <p className="text-xs font-black text-emerald-700 text-right">追加運動合計 −{addedKcal} kcal</p>
            )}
          </div>
        )}
      </div>

      {/* ══ 腹式呼吸タイマー ══ */}
      <BreathingTimer onMinutesChange={mins => updateEx({ breathingMins: mins })} />

      {/* ══ Motivation Music ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎵</span>
          <p className="text-sm font-black text-gray-900">Motivation Music</p>
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">YouTube</span>
        </div>
        {[
          { title: 'Say So', artist: 'Doja Cat', emoji: '🌸', query: 'Doja Cat Say So Official Music Video', color: 'from-pink-500 to-rose-500' },
          { title: 'Seven', artist: 'Jung Kook ft. Latto', emoji: '7️⃣', query: 'Jung Kook Seven Official MV', color: 'from-violet-500 to-purple-600' },
          { title: 'Always Be My Baby', artist: 'Mariah Carey', emoji: '💕', query: 'Mariah Carey Always Be My Baby Official Video', color: 'from-sky-400 to-blue-500' },
        ].map(({ title, artist, emoji, query, color }) => (
          <a key={title}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
            target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${color} text-white active:scale-[0.98] transition-all shadow-sm`}>
            <span className="text-xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-tight">{title}</p>
              <p className="text-[10px] opacity-80">{artist}</p>
            </div>
            <span className="text-white/60 text-lg">▶</span>
          </a>
        ))}
      </div>

      {/* ══ マクロ目安 ══ */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '🥩 タンパク質', gram: Math.round(targetKcal * 0.30 / 4), unit: 'g' },
          { label: '🍚 炭水化物',   gram: Math.round(targetKcal * 0.45 / 4), unit: 'g' },
          { label: '🫒 脂質',       gram: Math.round(targetKcal * 0.25 / 9), unit: 'g' },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
            <p className="text-xs font-bold text-gray-800">{m.label}</p>
            <p className="text-lg font-black text-gray-900">{m.gram}<span className="text-xs font-normal">{m.unit}</span></p>
          </div>
        ))}
      </div>

      {/* ══ 食事追加フォーム ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-black text-gray-900">食事を追加</p>

        {/* タイミング */}
        <div>
          <label className="text-xs font-bold text-gray-800 mb-1 block">① タイミング</label>
          <div className="flex gap-1.5 flex-wrap">
            {MEAL_LABELS.map(l => (
              <button key={l} onClick={() => setTiming(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
                  timing === l ? `${LABEL_COLOR[l]} border-current` : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {/* 食材選択 */}
        <div className="relative">
          <label className="text-xs font-bold text-gray-800 mb-1 block">② 食材を選択</label>
          <input type="text" value={search} placeholder="食材名で絞り込み…（「その他」で自由入力）"
            className={inputCls}
            onChange={e => { setSearch(e.target.value); setShowDrop(true); setFoodIdx(-1); setGrams(''); setCustomMode(false); }}
            onFocus={() => setShowDrop(true)} />
          {showDrop && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <p className="text-xs font-bold text-gray-800 text-center py-3">該当なし</p>
                : filtered.map(({ f, i }) => (
                  <button key={i}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 ${f.custom ? 'bg-amber-50' : ''}`}
                    onMouseDown={e => { e.preventDefault(); selectFood(i); }}>
                    <span className={`font-bold ${f.custom ? 'text-amber-800' : 'text-gray-900'}`}>
                      {f.custom ? '✏️ ' : ''}{f.name}
                    </span>
                    {!f.custom && <span className="text-xs font-bold text-gray-700 flex-shrink-0">{f.baseGrams}g/{f.baseKcal}kcal</span>}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 通常入力 */}
        {food && !isCustom && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 mb-1 block">③ グラム数</label>
              <input type="number" value={grams} placeholder={food ? String(food.baseGrams) : '—'}
                onChange={e => setGrams(e.target.value)}
                className={`${inputCls} text-right`} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-800 mb-1 block">④ カロリー（自動計算）</label>
              <div className={`${inputCls} text-right font-black cursor-default ${
                computedKcal > 0 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'bg-gray-50 text-gray-400'
              }`}>{computedKcal > 0 ? computedKcal : '—'}</div>
            </div>
          </div>
        )}

        {/* 自由入力モード */}
        {customMode && (
          <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <p className="text-xs font-black text-amber-800">✏️ 自由入力モード</p>
            <div>
              <label className="text-xs font-bold text-gray-800 mb-1 block">③ 食材名（自由入力）</label>
              <input type="text" value={customName} placeholder="例：自家製スープ、コンビニサラダ…"
                onChange={e => setCustomName(e.target.value)}
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">④ グラム数（任意）</label>
                <input type="number" value={customGrams} placeholder="0"
                  onChange={e => setCustomGrams(e.target.value)}
                  className={`${inputCls} text-right`} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">⑤ カロリー（必須）</label>
                <input type="number" value={customKcal} placeholder="kcal を入力"
                  onChange={e => setCustomKcal(e.target.value)}
                  className={`${inputCls} text-right font-black ${parseInt(customKcal) > 0 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : ''}`} />
              </div>
            </div>
          </div>
        )}

        <button onClick={addMeal}
          disabled={customMode ? (parseInt(customKcal) <= 0) : (!food || computedKcal <= 0)}
          className="w-full py-3 rounded-2xl font-black text-sm bg-indigo-600 text-white disabled:bg-gray-200 disabled:text-gray-500 active:scale-[0.98] transition-all">
          {selectedDate === todayStr() ? '追加する' : `${fmtDate(selectedDate)} の記録に追加`}
        </button>
      </div>

      {/* ══ 食事ログ（タイミング別） ══ */}
      {grouped.length === 0
        ? <p className="text-xs text-gray-500 font-bold text-center py-4">まだ食事記録がありません</p>
        : (
          <div className="space-y-2">
            {grouped.map(({ lbl, meals }) => {
              const groupTotal = meals.reduce((s, { m }) => s + m.kcal, 0);
              return (
                <div key={lbl} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-2 flex items-center justify-between ${LABEL_COLOR[lbl]}`}>
                    <span className="text-xs font-black">{lbl}</span>
                    <span className="text-xs font-bold">{groupTotal} kcal</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {meals.map(({ m, i }) => (
                      <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.food ?? m.label}</p>
                          {m.grams != null && m.grams > 0 && <p className="text-xs font-bold text-gray-700">{m.grams}g</p>}
                        </div>
                        <span className="text-sm font-black text-gray-800 flex-shrink-0">{m.kcal} kcal</span>
                        <button onClick={() => removeMeal(i)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm active:scale-90 transition-all flex-shrink-0 font-black">
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between px-2">
              <span className="text-xs font-black text-gray-800">合計摂取</span>
              <span className="text-xs font-black text-gray-900">{foodKcal.toLocaleString()} kcal</span>
            </div>
          </div>
        )
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Weekly metrics tab
// ═══════════════════════════════════════════════════════════════════
const METRIC_FIELDS: { key: keyof WeeklyMetric; label: string; unit: string; step: string }[] = [
  { key: 'weight',      label: '体重',       unit: 'kg',   step: '0.1' },
  { key: 'fatPct',      label: '体脂肪率',   unit: '%',    step: '0.1' },
  { key: 'muscleMass',  label: '筋肉量',     unit: 'kg',   step: '0.1' },
  { key: 'bmi',         label: 'BMI',        unit: '',     step: '0.1' },
  { key: 'visceralFat', label: '内臓脂肪',   unit: 'lv',   step: '1'   },
  { key: 'boneMass',    label: '骨量',       unit: 'kg',   step: '0.1' },
  { key: 'bmr',         label: '基礎代謝',   unit: 'kcal', step: '1'   },
];

const emptyMetric = (): WeeklyMetric => ({
  date: todayStr(), weight: 0, fatPct: 0, muscleMass: 0,
  bmi: 0, visceralFat: 0, boneMass: 0, bmr: 0,
});

function MetricsTab() {
  const [metrics, setMetrics] = useState<WeeklyMetric[]>(() => load<WeeklyMetric[]>(LS_METRICS, []));
  const [form, setForm]       = useState<WeeklyMetric>(emptyMetric);
  const [saved, setSaved]     = useState(false);
  const setField = (k: keyof WeeklyMetric, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    const existing = metrics.filter(m => m.date !== form.date);
    const next = [form, ...existing].sort((a, b) => b.date.localeCompare(a.date));
    setMetrics(next); save(LS_METRICS, next); setSaved(true);
    setTimeout(() => { setSaved(false); setForm(emptyMetric()); }, 1500);
  };
  const deleteMetric = (date: string) => {
    const next = metrics.filter(m => m.date !== date);
    setMetrics(next); save(LS_METRICS, next);
  };
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 text-gray-900";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-black text-gray-900 mb-3">測定データを入力</p>
        <div className="mb-3">
          <label className="text-xs font-bold text-gray-800 mb-1 block">測定日</label>
          <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {METRIC_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-gray-800 mb-1 block">{f.label}{f.unit ? ` (${f.unit})` : ''}</label>
              <input type="number" step={f.step} placeholder="0"
                value={(form[f.key] as number) || ''}
                onChange={e => setField(f.key, +e.target.value)}
                className={`${inputCls} text-right`} />
            </div>
          ))}
        </div>
        <button onClick={handleSave}
          className={`w-full mt-4 py-3 rounded-2xl font-black text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white active:scale-95'}`}>
          {saved ? '✓ 保存しました' : '記録する'}
        </button>
      </div>
      {metrics.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="text-xs font-black text-gray-900 px-4 pt-3 pb-2">履歴 ({metrics.length}件)</p>
          <div className="divide-y divide-gray-100">
            {metrics.slice(0, 10).map(m => (
              <div key={m.date} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-gray-900">{m.date}</span>
                  <button onClick={() => deleteMetric(m.date)} className="text-xs font-bold text-red-500 active:scale-90 transition-all">削除</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {METRIC_FIELDS.map(f => (
                    <div key={f.key} className="text-center">
                      <p className="text-[10px] font-bold text-gray-700">{f.label}</p>
                      <p className="text-xs font-black text-gray-900">{(m[f.key] as number) || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Trends tab
// ═══════════════════════════════════════════════════════════════════
type Period = '1M' | '3M' | '6M' | '1Y';
const PERIOD_DAYS: Record<Period, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
type MetricKey = 'weight' | 'fatPct' | 'muscleMass' | 'bmi';
const METRIC_OPTS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: 'weight',     label: '体重',     color: '#6366f1', unit: 'kg' },
  { key: 'fatPct',     label: '体脂肪率', color: '#f59e0b', unit: '%'  },
  { key: 'muscleMass', label: '筋肉量',   color: '#10b981', unit: 'kg' },
  { key: 'bmi',        label: 'BMI',      color: '#ef4444', unit: ''   },
];

function TrendsTab() {
  const [metrics]                   = useState<WeeklyMetric[]>(() => load<WeeklyMetric[]>(LS_METRICS, []));
  const [period, setPeriod]         = useState<Period>('3M');
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>(['weight', 'fatPct']);
  const toggle = (k: MetricKey) =>
    setActiveKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const data = metrics.filter(m => m.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ ...m, dateLabel: fmtDate(m.date) }));

  if (metrics.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <p className="text-4xl mb-2">📊</p>
      <p className="text-sm font-bold">「測定」タブでデータを記録するとグラフが表示されます</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
        {(['1M','3M','6M','1Y'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${period === p ? 'bg-white text-indigo-700 shadow' : 'text-gray-800 font-bold'}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {METRIC_OPTS.map(m => (
          <button key={m.key} onClick={() => toggle(m.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all ${
              activeKeys.includes(m.key) ? 'text-white' : 'bg-white text-gray-800 border-gray-400'
            }`}
            style={activeKeys.includes(m.key) ? { background: m.color, borderColor: m.color } : {}}>
            {m.label}
          </button>
        ))}
      </div>
      {data.length < 2 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-sm font-bold text-gray-700 border border-gray-200">
          この期間のデータが少ないです。測定を続けるとグラフが表示されます。
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
                formatter={(v, name) => {
                  const m = METRIC_OPTS.find(x => x.label === name);
                  return [`${v}${m?.unit ?? ''}`, name as string];
                }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {METRIC_OPTS.filter(m => activeKeys.includes(m.key)).map(m => (
                <Line key={m.key} type="monotone" dataKey={m.key} name={m.label}
                  stroke={m.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.some(d => d.bmr > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-black text-gray-900 mb-3">基礎代謝推移 (kcal)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
              <Line type="monotone" dataKey="bmr" name="基礎代謝" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Advice tab
// ═══════════════════════════════════════════════════════════════════
interface Advice { icon: string; title: string; body: string; color: string; }

function generateAdvice(metrics: WeeklyMetric[], profile: Profile): Advice[] {
  const advices: Advice[] = [];
  if (metrics.length === 0) {
    advices.push({ icon: '📋', title: 'データを記録しましょう', color: 'border-gray-200 bg-gray-50',
      body: '「測定」タブで週次の体組成データを入力すると、パーソナルアドバイスが表示されます。' });
    return advices;
  }
  const latest = metrics[0]; const prev = metrics[1]; const calc = calcTargetKcal(profile);
  if (profile.goalDate && profile.currentWeight && profile.goalWeight) {
    const goalDiff = profile.currentWeight - profile.goalWeight;
    const weightLost = profile.currentWeight - (latest.weight || profile.currentWeight);
    const pace = calc.daysLeft > 0 ? (weightLost / (profile.currentWeight - profile.goalWeight || 1)) : 0;
    if (goalDiff > 0) {
      if (pace >= 0.8) advices.push({ icon: '🏆', title: '目標達成ペース！', color: 'border-emerald-200 bg-emerald-50',
        body: `順調に減量中です！残り ${calc.daysLeft} 日、目標まであと ${Math.max(0, goalDiff - weightLost).toFixed(1)} kg。` });
      else if (pace > 0) advices.push({ icon: '💪', title: '順調に進んでいます', color: 'border-blue-200 bg-blue-50',
        body: `少しペースが遅めです。目標摂取カロリー ${calc.target.toLocaleString()} kcal を守りましょう。` });
    }
  }
  if (prev && latest.weight < prev.weight && latest.muscleMass < prev.muscleMass) {
    const muscleLoss = prev.muscleMass - latest.muscleMass;
    advices.push({ icon: '⚠️', title: '筋肉量が減っています', color: 'border-amber-200 bg-amber-50',
      body: `体重は ${(prev.weight - latest.weight).toFixed(1)} kg 減りましたが、筋肉量も ${muscleLoss.toFixed(1)} kg 減少。たんぱく質（体重×1.5〜2g）を意識しましょう。` });
  } else if (prev && latest.weight < prev.weight && latest.muscleMass >= prev.muscleMass) {
    advices.push({ icon: '✨', title: '理想的な減量です！', color: 'border-emerald-200 bg-emerald-50',
      body: '体重を落としながら筋肉量を維持できています。素晴らしい！' });
  }
  if (latest.fatPct > 0) {
    const isMale = profile.sex === 'male';
    if (isMale ? latest.fatPct > 25 : latest.fatPct > 35)
      advices.push({ icon: '🔥', title: '体脂肪率を下げましょう', color: 'border-orange-200 bg-orange-50',
        body: `体脂肪率 ${latest.fatPct}% は高めです。有酸素運動（週3回、30分以上）とカロリー制限が効果的です。` });
    else if (isMale ? latest.fatPct < 18 : latest.fatPct < 28)
      advices.push({ icon: '💯', title: '体脂肪率が良好です', color: 'border-emerald-200 bg-emerald-50',
        body: `体脂肪率 ${latest.fatPct}% は理想的な範囲です！` });
  }
  if (latest.bmi > 0) {
    if (latest.bmi >= 30) advices.push({ icon: '🏃', title: 'BMIが高めです', color: 'border-red-200 bg-red-50',
      body: `BMI ${latest.bmi} は肥満域です。1日 ${calc.deficit} kcal 不足を目標に継続しましょう。` });
    else if (latest.bmi >= 25) advices.push({ icon: '📉', title: 'BMI 標準に向けて', color: 'border-amber-200 bg-amber-50',
      body: `BMI ${latest.bmi} は過体重域です。目標摂取 ${calc.target.toLocaleString()} kcal を意識しましょう。` });
    else if (latest.bmi >= 18.5) advices.push({ icon: '🌟', title: 'BMI 標準範囲', color: 'border-green-200 bg-green-50',
      body: `BMI ${latest.bmi} は正常範囲です。バランスの良い食事を続けましょう。` });
  }
  if (latest.visceralFat >= 10) advices.push({ icon: '❤️', title: '内臓脂肪に注意', color: 'border-red-200 bg-red-50',
    body: `内臓脂肪レベル ${latest.visceralFat} は高めです。有酸素運動が特に効果的です。` });
  if (prev && latest.weight < prev.weight && latest.fatPct < prev.fatPct)
    advices.push({ icon: '🎉', title: 'ダブル改善！', color: 'border-violet-200 bg-violet-50',
      body: '体重も体脂肪率も先週より改善！モチベーションを保ちながら継続しましょう。' });
  if (advices.length === 0) advices.push({ icon: '📊', title: 'データを蓄積中...', color: 'border-gray-200 bg-gray-50',
    body: '週次測定を2〜3回記録すると、より詳細なアドバイスが生成されます。' });
  return advices;
}

function AdviceTab({ profile }: { profile: Profile }) {
  const metrics = load<WeeklyMetric[]>(LS_METRICS, []);
  const advices = generateAdvice(metrics, profile);
  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-gray-900 px-1">パーソナルフィードバック</p>
      {advices.map((a, i) => (
        <div key={i} className={`rounded-2xl border p-4 ${a.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{a.icon}</span>
            <div>
              <p className="text-sm font-black text-gray-900 mb-1">{a.title}</p>
              <p className="text-xs text-gray-800 leading-relaxed">{a.body}</p>
            </div>
          </div>
        </div>
      ))}
      {metrics.length > 0 && (() => {
        const l = metrics[0];
        return (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-2">
            <p className="text-xs font-black text-gray-900 mb-3">最新測定値 ({l.date})</p>
            <div className="grid grid-cols-4 gap-2">
              {METRIC_FIELDS.map(f => (
                <div key={f.key} className="text-center">
                  <p className="text-[10px] font-bold text-gray-700">{f.label}</p>
                  <p className="text-xs font-black text-gray-900">{(l[f.key] as number) || '—'}</p>
                  <p className="text-[10px] font-bold text-gray-700">{f.unit}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// History tab
// ═══════════════════════════════════════════════════════════════════
function HistoryTab({ onEditDate }: { onEditDate: (date: string) => void }) {
  const [historyMap, setHistoryMap] = useState<HistoryMap>(() => load<HistoryMap>(LS_HISTORY, {}));
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [compareMode, setCompareMode]   = useState(false);
  const [selected, setSelected]         = useState<string[]>([]);

  const days = Object.values(historyMap).sort((a, b) => b.date.localeCompare(a.date));
  const toggleExpand = (date: string) => setExpandedDate(v => v === date ? null : date);
  const toggleSelect = (date: string) => {
    if (selected.includes(date)) setSelected(s => s.filter(d => d !== date));
    else if (selected.length < 2)  setSelected(s => [...s, date]);
  };
  const deleteDay = (date: string) => {
    const next = { ...historyMap }; delete next[date];
    setHistoryMap(next); save(LS_HISTORY, next);
  };

  // ── 比較ビュー ──
  if (compareMode && selected.length === 2) {
    const sorted = selected.slice().sort();
    const [dA, dB] = sorted.map(d => historyMap[d]);
    if (dA && dB) return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-gray-900">📊 日付比較</p>
          <button onClick={() => { setCompareMode(false); setSelected([]); }}
            className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 active:scale-95 transition-all">
            ← 一覧に戻る
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div />
          {[dA, dB].map(d => (
            <div key={d.date} className="bg-gray-900 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-xs">{fmtDateJP(d.date)}</p>
            </div>
          ))}
        </div>
        {[
          { label: '🎯 目標',   fn: (d: DayHistory) => `${d.targetKcal.toLocaleString()} kcal` },
          { label: '🍽️ 摂取',  fn: (d: DayHistory) => `${d.totalIntakeKcal.toLocaleString()} kcal` },
          { label: '💪 消費',   fn: (d: DayHistory) => `${d.totalBurnedKcal.toLocaleString()} kcal` },
          { label: '⚖️ 収支',  fn: (d: DayHistory) => `${d.netKcal >= 0 ? '+' : ''}${d.netKcal.toLocaleString()} kcal`, net: true },
          { label: '🚶 歩数',   fn: (d: DayHistory) => `${d.steps.toLocaleString()} 歩` },
          { label: '🍱 食事数', fn: (d: DayHistory) => `${d.meals.length} 品目` },
          { label: '🏋️ 運動数', fn: (d: DayHistory) => `${d.workouts.length} 種目` },
        ].map(row => (
          <div key={row.label} className="grid grid-cols-3 gap-2 items-center">
            <p className="text-xs font-bold text-gray-800">{row.label}</p>
            {[dA, dB].map(d => {
              const isGood = row.net ? d.netKcal >= 0 : false;
              const isBad  = row.net ? d.netKcal < 0 : false;
              return (
                <div key={d.date} className={`rounded-xl p-2.5 text-center border ${isGood ? 'bg-emerald-50 border-emerald-200' : isBad ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-black ${isGood ? 'text-emerald-800' : isBad ? 'text-red-800' : 'text-gray-900'}`}>{row.fn(d)}</p>
                </div>
              );
            })}
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[dA, dB].map(d => (
            <div key={d.date} className="space-y-2">
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{fmtDate(d.date)} 食事</p>
              {d.meals.length === 0 ? <p className="text-[10px] text-gray-600">記録なし</p>
                : d.meals.map((m, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-black text-gray-700">{m.category}</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{m.name}</p>
                    <p className="text-[10px] font-bold text-gray-700">{m.grams}g · {m.kcal}kcal</p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (days.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <p className="text-4xl mb-2">📅</p>
      <p className="text-sm font-bold text-center">「今日」タブで食事・運動を記録すると<br/>ここに履歴が蓄積されます</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-black text-gray-900">
          📅 詳細履歴 <span className="text-gray-700 font-bold">({days.length}日分)</span>
        </p>
        <button onClick={() => { setCompareMode(v => !v); setSelected([]); }}
          className={`text-xs font-black px-3 py-1.5 rounded-full transition-all active:scale-95 ${
            compareMode ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}>
          {compareMode ? '✕ 比較モードOFF' : '🔄 2日を比較'}
        </button>
      </div>

      {compareMode && (
        <div className={`rounded-2xl p-3 border text-xs font-bold ${
          selected.length === 2 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-900 border-indigo-200'
        }`}>
          {selected.length === 0 && '比較したい日付を2日タップしてください'}
          {selected.length === 1 && `✅ ${fmtDateJP(selected[0])} 選択済み。あと1日選択してください`}
          {selected.length === 2 && `📊 ${fmtDate(selected[0])} と ${fmtDate(selected[1])} を比較します（上のバーで確認）`}
        </div>
      )}

      {days.map(day => {
        const isExpanded = expandedDate === day.date;
        const isSelected = selected.includes(day.date);
        const underCal   = day.netKcal >= 0;
        const isToday    = day.date === todayStr();

        return (
          <div key={day.date} className={`rounded-2xl border-2 overflow-hidden transition-all ${
            isSelected ? 'border-indigo-500 bg-indigo-50' : isToday ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white'
          }`}>
            <button className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
              onClick={() => compareMode ? toggleSelect(day.date) : toggleExpand(day.date)}>
              {compareMode && (
                <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center text-xs ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-400'
                }`}>{isSelected && '✓'}</div>
              )}
              <div className="flex-shrink-0 text-left">
                <p className={`text-xs font-black ${isToday ? 'text-gray-900' : 'text-gray-800'}`}>
                  {isToday ? '🔴 今日' : fmtDateJP(day.date)}
                </p>
                {isToday && <p className="text-[10px] font-bold text-gray-600">{day.date}</p>}
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                underCal ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'
              }`}>
                {underCal ? '✅' : '⚠️'} {underCal ? '+' : ''}{day.netKcal.toLocaleString()} kcal
              </span>
              <div className="flex-1 flex items-center gap-3 justify-end text-right">
                <div><p className="text-[10px] font-bold text-gray-700">摂取</p><p className="text-xs font-black text-gray-900">{day.totalIntakeKcal.toLocaleString()}</p></div>
                <div><p className="text-[10px] font-bold text-gray-700">消費</p><p className="text-xs font-black text-emerald-800">{day.totalBurnedKcal.toLocaleString()}</p></div>
                {!compareMode && <span className={`text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>}
              </div>
            </button>

            <div className="px-4 pb-2 flex gap-3 flex-wrap">
              {day.steps > 0 && <span className="text-[10px] font-bold text-gray-700">🚶 {day.steps.toLocaleString()}歩</span>}
              {day.intervalWalkMins > 0 && <span className="text-[10px] font-bold text-gray-700">🏃 {day.intervalWalkMins}分</span>}
              {day.workouts.length > 0 && <span className="text-[10px] font-bold text-gray-700">🏋️ {day.workouts.length}種目</span>}
              {day.meals.length > 0 && <span className="text-[10px] font-bold text-gray-700">🍱 {day.meals.length}品目</span>}
            </div>

            {isExpanded && !compareMode && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                {/* この日を編集ボタン */}
                <button onClick={() => onEditDate(day.date)}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black active:scale-[0.98] transition-all">
                  ✏️ この日（{fmtDateJP(day.date)}）を編集する
                </button>

                {day.meals.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2">🍽️ 食事記録</p>
                    <div className="space-y-1">
                      {['朝食','昼食','夕食','間食','ドリンク'].map(cat => {
                        const catMeals = day.meals.filter(m => m.category === cat);
                        if (catMeals.length === 0) return null;
                        return (
                          <div key={cat}>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${LABEL_COLOR[cat] ?? 'bg-gray-100 text-gray-800'}`}>{cat}</span>
                            {catMeals.map((m, i) => (
                              <div key={i} className="flex items-center justify-between pl-2 py-1">
                                <span className="text-xs font-bold text-gray-900">{m.name}</span>
                                <span className="text-xs font-bold text-gray-800">{m.grams}g · {m.kcal}kcal</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-xs font-black text-gray-800">合計</span>
                        <span className="text-xs font-black text-gray-900">{day.totalIntakeKcal.toLocaleString()} kcal</span>
                      </div>
                    </div>
                  </div>
                )}

                {day.workouts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2">🏋️ 運動記録</p>
                    <div className="space-y-1">
                      {day.workouts.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-900">{w}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-xs font-black text-gray-800">消費</span>
                        <span className="text-xs font-black text-emerald-800">{day.totalBurnedKcal.toLocaleString()} kcal</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`rounded-xl p-3 text-center border ${underCal ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] font-bold text-gray-700 mb-1">
                    目標 {day.targetKcal.toLocaleString()} · 摂取 {day.totalIntakeKcal.toLocaleString()} · 消費 {day.totalBurnedKcal.toLocaleString()}
                  </p>
                  <p className={`text-base font-black ${underCal ? 'text-emerald-800' : 'text-red-800'}`}>
                    {underCal ? 'アンダーカロリー' : 'オーバーカロリー'}
                    <span className="text-sm ml-1">{Math.abs(day.netKcal).toLocaleString()} kcal</span>
                  </p>
                </div>
                <button onClick={() => deleteDay(day.date)}
                  className="w-full text-xs font-bold text-red-600 py-1.5 bg-red-50 rounded-xl border border-red-200 active:scale-[0.98] transition-all">
                  🗑 この日の記録を完全削除
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Root component
// ═══════════════════════════════════════════════════════════════════
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'goals',   icon: '🎯', label: '目標'  },
  { id: 'today',   icon: '🍽️', label: '記録'  },
  { id: 'history', icon: '📅', label: '履歴'  },
  { id: 'metrics', icon: '📋', label: '測定'  },
  { id: 'trends',  icon: '📈', label: 'グラフ'},
  { id: 'advice',  icon: '💡', label: '分析'  },
];

const DEFAULT_PROFILE: Profile = {
  height: 170, age: 25, sex: 'female',
  currentWeight: 60, goalWeight: 55,
  goalDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0,10); })(),
  activityLevel: 1.375,
};

export function HealthDashboard() {
  const [tab, setTab]               = useState<Tab>('goals');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [profile, setProfile]       = useState<Profile>(() => load<Profile>(LS_PROF, DEFAULT_PROFILE));

  const saveProfile = useCallback((p: Profile) => { setProfile(p); save(LS_PROF, p); }, []);

  // 履歴タブから「この日を編集」
  const handleEditDate = useCallback((date: string) => {
    setSelectedDate(date);
    setTab('today');
  }, []);

  return (
    <div className="pb-[120px]">
      {/* Sub-tab bar */}
      <div className="sticky top-[100px] z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-2">
        <div className="flex gap-0.5 max-w-md mx-auto overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex flex-col items-center py-2 px-2 rounded-xl text-[9px] font-black transition-all ${
                tab === t.id ? 'bg-rose-500 text-white shadow' : 'text-gray-800 font-bold'
              }`}>
              <span className="text-base leading-tight">{t.icon}</span>
              <span className="leading-tight mt-0.5 whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {tab === 'goals'   && <GoalsTab profile={profile} onSave={saveProfile} />}
        {tab === 'today'   && <TodayTab profile={profile} selectedDate={selectedDate} onDateChange={setSelectedDate} />}
        {tab === 'history' && <HistoryTab onEditDate={handleEditDate} />}
        {tab === 'metrics' && <MetricsTab />}
        {tab === 'trends'  && <TrendsTab />}
        {tab === 'advice'  && <AdviceTab profile={profile} />}
      </div>
    </div>
  );
}
