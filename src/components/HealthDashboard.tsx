'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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
interface MealEntry { label: string; kcal: number; }
interface DailyLog  { date: string; meals: MealEntry[]; }

// ─── localStorage keys ────────────────────────────────────────────
const LS_PROF    = 'health-profile-v1';
const LS_METRICS = 'health-metrics-v1';
const LS_DAILY   = 'health-daily-v1';

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

// ─── Sub-tab type ─────────────────────────────────────────────────
type Tab = 'goals' | 'today' | 'metrics' | 'trends' | 'advice';

// ═══════════════════════════════════════════════════════════════════
// Goals tab
// ═══════════════════════════════════════════════════════════════════
function GoalsTab({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Profile, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handle = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const calc = calcTargetKcal(form);

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white";
  const labelCls = "text-[11px] font-bold text-gray-500 mb-1 block";

  return (
    <div className="space-y-5">
      {/* Target calorie big display */}
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

      {/* Profile form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-black text-gray-500 mb-2">プロフィール</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>身長 (cm)</label>
            <input type="number" className={inputCls} value={form.height || ''}
              onChange={e => set('height', +e.target.value)} placeholder="170" />
          </div>
          <div>
            <label className={labelCls}>年齢</label>
            <input type="number" className={inputCls} value={form.age || ''}
              onChange={e => set('age', +e.target.value)} placeholder="25" />
          </div>
          <div>
            <label className={labelCls}>性別</label>
            <select className={inputCls} value={form.sex}
              onChange={e => set('sex', e.target.value as 'male'|'female')}>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>活動レベル</label>
            <select className={inputCls} value={form.activityLevel}
              onChange={e => set('activityLevel', +e.target.value)}>
              <option value={1.2}>座り仕事中心</option>
              <option value={1.375}>軽い運動あり</option>
              <option value={1.55}>週3〜5回運動</option>
              <option value={1.725}>毎日ハード運動</option>
              <option value={1.9}>肉体労働</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-black text-gray-500 mb-2">目標設定</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>現在の体重 (kg)</label>
            <input type="number" step="0.1" className={inputCls} value={form.currentWeight || ''}
              onChange={e => set('currentWeight', +e.target.value)} placeholder="70.0" />
          </div>
          <div>
            <label className={labelCls}>目標体重 (kg)</label>
            <input type="number" step="0.1" className={inputCls} value={form.goalWeight || ''}
              onChange={e => set('goalWeight', +e.target.value)} placeholder="65.0" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>目標達成日</label>
            <input type="date" className={inputCls} value={form.goalDate}
              onChange={e => set('goalDate', e.target.value)} />
          </div>
        </div>
      </div>

      <button onClick={handle}
        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white active:scale-95'
        }`}>
        {saved ? '✓ 保存しました' : '保存する'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Daily tracker tab
// ═══════════════════════════════════════════════════════════════════
const MEAL_LABELS = ['朝食', '昼食', '夕食', '間食', 'ドリンク'];

function TodayTab({ profile }: { profile: Profile }) {
  const targetKcal = calcTargetKcal(profile).target;
  const today = todayStr();

  const [logs, setLogs] = useState<DailyLog[]>(() => load<DailyLog[]>(LS_DAILY, []));
  const [label, setLabel] = useState(MEAL_LABELS[0]);
  const [kcalInput, setKcalInput] = useState('');

  const todayLog = logs.find(l => l.date === today) ?? { date: today, meals: [] };
  const totalKcal = todayLog.meals.reduce((s, m) => s + m.kcal, 0);
  const remaining = targetKcal - totalKcal;
  const pct = Math.min(100, Math.round(totalKcal / targetKcal * 100));

  const addMeal = () => {
    const k = parseInt(kcalInput);
    if (!k || k <= 0) return;
    const newMeal: MealEntry = { label, kcal: k };
    const updated = logs.filter(l => l.date !== today);
    const newLog: DailyLog = { date: today, meals: [...todayLog.meals, newMeal] };
    const next = [newLog, ...updated];
    setLogs(next);
    save(LS_DAILY, next);
    setKcalInput('');
  };

  const removeMeal = (i: number) => {
    const newMeals = todayLog.meals.filter((_, idx) => idx !== i);
    const updated  = logs.filter(l => l.date !== today);
    const next     = [{ date: today, meals: newMeals }, ...updated];
    setLogs(next);
    save(LS_DAILY, next);
  };

  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-4">
      {/* Big progress ring */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-gray-500">今日の摂取カロリー</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('ja-JP')}</p>
        </div>
        <div className="text-center mb-3">
          <p className="text-4xl font-black text-gray-900">{totalKcal.toLocaleString()}</p>
          <p className="text-xs text-gray-400">/ 目標 {targetKcal.toLocaleString()} kcal</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span className="text-gray-500">{pct}% 消費</span>
          <span className={remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {remaining >= 0 ? `残り ${remaining.toLocaleString()} kcal` : `超過 ${Math.abs(remaining).toLocaleString()} kcal`}
          </span>
        </div>
      </div>

      {/* Macro hint */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '🥩 タンパク質', gram: Math.round(targetKcal * 0.30 / 4), unit: 'g' },
          { label: '🍚 炭水化物',   gram: Math.round(targetKcal * 0.45 / 4), unit: 'g' },
          { label: '🫒 脂質',       gram: Math.round(targetKcal * 0.25 / 9), unit: 'g' },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-[10px] text-gray-500">{m.label}</p>
            <p className="text-lg font-black text-gray-800">{m.gram}<span className="text-xs font-normal">{m.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Add meal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-black text-gray-500 mb-3">食事を追加</p>
        <div className="flex gap-2 mb-3">
          <select value={label} onChange={e => setLabel(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
            {MEAL_LABELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <input type="number" placeholder="kcal" value={kcalInput}
            onChange={e => setKcalInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMeal()}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 text-right" />
          <button onClick={addMeal}
            className="bg-indigo-600 text-white rounded-xl px-4 font-black text-sm active:scale-95 transition-transform">
            +
          </button>
        </div>
        {todayLog.meals.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-3">まだ記録がありません</p>
        ) : (
          <div className="space-y-1.5">
            {todayLog.meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-1">
                <span className="text-gray-600 font-bold">{m.label}</span>
                <span className="text-gray-500">{m.kcal} kcal</span>
                <button onClick={() => removeMeal(i)} className="text-gray-300 text-lg leading-none active:text-red-400">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
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

  const setField = (k: keyof WeeklyMetric, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const existing = metrics.filter(m => m.date !== form.date);
    const next = [form, ...existing].sort((a, b) => b.date.localeCompare(a.date));
    setMetrics(next);
    save(LS_METRICS, next);
    setSaved(true);
    setTimeout(() => { setSaved(false); setForm(emptyMetric()); }, 1500);
  };

  const deleteMetric = (date: string) => {
    const next = metrics.filter(m => m.date !== date);
    setMetrics(next);
    save(LS_METRICS, next);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-black text-gray-500 mb-3">測定データを入力</p>
        <div className="mb-3">
          <label className="text-[11px] font-bold text-gray-500 mb-1 block">測定日</label>
          <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {METRIC_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                {f.label}{f.unit ? ` (${f.unit})` : ''}
              </label>
              <input type="number" step={f.step} placeholder="0"
                value={(form[f.key] as number) || ''}
                onChange={e => setField(f.key, +e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 text-right" />
            </div>
          ))}
        </div>
        <button onClick={handleSave}
          className={`w-full mt-4 py-3 rounded-2xl font-black text-sm transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white active:scale-95'
          }`}>
          {saved ? '✓ 保存しました' : '記録する'}
        </button>
      </div>

      {/* History */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="text-xs font-black text-gray-500 px-4 pt-3 pb-2">履歴 ({metrics.length}件)</p>
          <div className="divide-y divide-gray-50">
            {metrics.slice(0, 10).map(m => (
              <div key={m.date} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">{m.date}</span>
                  <button onClick={() => deleteMetric(m.date)} className="text-xs text-gray-300 active:text-red-400">削除</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {METRIC_FIELDS.map(f => (
                    <div key={f.key} className="text-center">
                      <p className="text-[9px] text-gray-400">{f.label}</p>
                      <p className="text-xs font-bold text-gray-700">{(m[f.key] as number) || '—'}</p>
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
  const [metrics] = useState<WeeklyMetric[]>(() => load<WeeklyMetric[]>(LS_METRICS, []));
  const [period, setPeriod]   = useState<Period>('3M');
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>(['weight', 'fatPct']);

  const toggle = (k: MetricKey) =>
    setActiveKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const data = metrics
    .filter(m => m.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ ...m, dateLabel: fmtDate(m.date) }));

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-300">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm">「測定」タブでデータを記録するとグラフが表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
        {(['1M','3M','6M','1Y'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              period === p ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Metric toggles */}
      <div className="flex gap-2 flex-wrap">
        {METRIC_OPTS.map(m => (
          <button key={m.key} onClick={() => toggle(m.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all ${
              activeKeys.includes(m.key) ? 'text-white' : 'bg-white text-gray-400 border-gray-200'
            }`}
            style={activeKeys.includes(m.key) ? { background: m.color, borderColor: m.color } : {}}>
            {m.label}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-xs text-gray-400">
          この期間のデータが少ないです。測定を続けるとグラフが表示されます。
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
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

      {/* BMR trend */}
      {data.some(d => d.bmr > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-black text-gray-500 mb-3">基礎代謝推移 (kcal)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
              <Line type="monotone" dataKey="bmr" name="基礎代謝" stroke="#8b5cf6"
                strokeWidth={2} dot={{ r: 3 }} />
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

  const latest = metrics[0];
  const prev   = metrics[1];
  const calc   = calcTargetKcal(profile);

  // Goal pace
  if (profile.goalDate && profile.currentWeight && profile.goalWeight) {
    const goalDiff = profile.currentWeight - profile.goalWeight;
    const weightLost = profile.currentWeight - (latest.weight || profile.currentWeight);
    const pace = calc.daysLeft > 0 ? (weightLost / (profile.currentWeight - profile.goalWeight || 1)) : 0;
    if (goalDiff > 0) {
      if (pace >= 0.8)
        advices.push({ icon: '🏆', title: '目標達成ペース！', color: 'border-emerald-200 bg-emerald-50',
          body: `順調に減量中です！このペースを維持しましょう。残り ${calc.daysLeft} 日、目標まであと ${Math.max(0, goalDiff - weightLost).toFixed(1)} kg。` });
      else if (pace > 0)
        advices.push({ icon: '💪', title: '順調に進んでいます', color: 'border-blue-200 bg-blue-50',
          body: `少しペースが遅めです。毎日の目標摂取カロリー ${calc.target.toLocaleString()} kcal を守りましょう。` });
    }
  }

  // Weight vs muscle check
  if (prev && latest.weight < prev.weight && latest.muscleMass < prev.muscleMass) {
    const muscleLoss = prev.muscleMass - latest.muscleMass;
    advices.push({ icon: '⚠️', title: '筋肉量が減っています', color: 'border-amber-200 bg-amber-50',
      body: `体重は ${(prev.weight - latest.weight).toFixed(1)} kg 減りましたが、筋肉量も ${muscleLoss.toFixed(1)} kg 減少しています。たんぱく質（体重×1.5〜2g）を意識しましょう。` });
  } else if (prev && latest.weight < prev.weight && latest.muscleMass >= prev.muscleMass) {
    advices.push({ icon: '✨', title: '理想的な減量です！', color: 'border-emerald-200 bg-emerald-50',
      body: `体重を落としながら筋肉量を維持できています。素晴らしい！この食事・運動バランスを続けましょう。` });
  }

  // Fat % check
  if (latest.fatPct > 0) {
    const isMale = profile.sex === 'male';
    const highFat = isMale ? latest.fatPct > 25 : latest.fatPct > 35;
    const goodFat = isMale ? latest.fatPct < 18 : latest.fatPct < 28;
    if (highFat)
      advices.push({ icon: '🔥', title: '体脂肪率を下げましょう', color: 'border-orange-200 bg-orange-50',
        body: `体脂肪率 ${latest.fatPct}% は高めです。有酸素運動（週3回、30分以上）とカロリー制限の組み合わせが効果的です。` });
    else if (goodFat)
      advices.push({ icon: '💯', title: '体脂肪率が良好です', color: 'border-emerald-200 bg-emerald-50',
        body: `体脂肪率 ${latest.fatPct}% は理想的な範囲です。現在の生活習慣を維持しましょう！` });
  }

  // BMI check
  if (latest.bmi > 0) {
    if (latest.bmi >= 30)
      advices.push({ icon: '🏃', title: 'BMIが高めです', color: 'border-red-200 bg-red-50',
        body: `BMI ${latest.bmi} は肥満域です。1日 ${calc.deficit} kcal の不足を目標に、食事管理と運動を継続しましょう。` });
    else if (latest.bmi >= 25)
      advices.push({ icon: '📉', title: 'BMI 標準に向けて', color: 'border-amber-200 bg-amber-50',
        body: `BMI ${latest.bmi} は過体重域です。目標摂取 ${calc.target.toLocaleString()} kcal を意識した食生活を心がけましょう。` });
    else if (latest.bmi >= 18.5)
      advices.push({ icon: '🌟', title: 'BMI 標準範囲', color: 'border-green-200 bg-green-50',
        body: `BMI ${latest.bmi} は正常範囲です。体重の維持を目標に、バランスの良い食事を続けましょう。` });
  }

  // Visceral fat check
  if (latest.visceralFat >= 10)
    advices.push({ icon: '❤️', title: '内臓脂肪に注意', color: 'border-red-200 bg-red-50',
      body: `内臓脂肪レベル ${latest.visceralFat} は高めです。アルコールや糖質の過剰摂取を避け、有酸素運動が特に効果的です。` });

  // Progress streak
  if (prev && latest.weight < prev.weight && latest.fatPct < prev.fatPct)
    advices.push({ icon: '🎉', title: 'ダブル改善！', color: 'border-violet-200 bg-violet-50',
      body: `体重も体脂肪率も先週より改善しています！モチベーションを保ちながら継続しましょう。` });

  if (advices.length === 0)
    advices.push({ icon: '📊', title: 'データを蓄積中...', color: 'border-gray-200 bg-gray-50',
      body: '週次測定を2〜3回記録すると、より詳細なアドバイスが生成されます。' });

  return advices;
}

function AdviceTab({ profile }: { profile: Profile }) {
  const metrics = load<WeeklyMetric[]>(LS_METRICS, []);
  const advices = generateAdvice(metrics, profile);

  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-gray-400 px-1">パーソナルフィードバック</p>
      {advices.map((a, i) => (
        <div key={i} className={`rounded-2xl border p-4 ${a.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{a.icon}</span>
            <div>
              <p className="text-sm font-black text-gray-800 mb-1">{a.title}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{a.body}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Latest stats summary */}
      {metrics.length > 0 && (() => {
        const l = metrics[0];
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-2">
            <p className="text-xs font-black text-gray-500 mb-3">最新測定値 ({l.date})</p>
            <div className="grid grid-cols-4 gap-2">
              {METRIC_FIELDS.map(f => (
                <div key={f.key} className="text-center">
                  <p className="text-[9px] text-gray-400">{f.label}</p>
                  <p className="text-xs font-black text-gray-800">{(l[f.key] as number) || '—'}</p>
                  <p className="text-[9px] text-gray-400">{f.unit}</p>
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
// Root component
// ═══════════════════════════════════════════════════════════════════
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'goals',   icon: '🎯', label: '目標'  },
  { id: 'today',   icon: '🍽️', label: '今日'  },
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
  const [tab, setTab] = useState<Tab>('goals');
  const [profile, setProfile] = useState<Profile>(() => load<Profile>(LS_PROF, DEFAULT_PROFILE));

  const saveProfile = useCallback((p: Profile) => {
    setProfile(p);
    save(LS_PROF, p);
  }, []);

  return (
    <div className="pb-[120px]">
      {/* Sub-tab bar */}
      <div className="sticky top-[100px] z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-2">
        <div className="flex gap-1 max-w-md mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] font-black transition-all ${
                tab === t.id ? 'bg-rose-500 text-white shadow' : 'text-gray-400'
              }`}>
              <span className="text-base leading-tight">{t.icon}</span>
              <span className="leading-tight mt-0.5">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {tab === 'goals'   && <GoalsTab   profile={profile} onSave={saveProfile} />}
        {tab === 'today'   && <TodayTab   profile={profile} />}
        {tab === 'metrics' && <MetricsTab />}
        {tab === 'trends'  && <TrendsTab  />}
        {tab === 'advice'  && <AdviceTab  profile={profile} />}
      </div>
    </div>
  );
}
