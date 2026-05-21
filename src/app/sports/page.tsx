'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDailyRecord, saveDailyRecord, getDoneExercises,
  markExerciseDone, unmarkExerciseDone, getWeightHistory,
  addWeightRecord, today, addTask,
} from '@/lib/shared-store';

// ── YouTube 検索URL ────────────────────────────────────────────
const YT = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// ── シード付き疑似乱数（同じ日付→同じメニューを保証） ──────────
function seededRnd(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297 + 233) * 1_000_000;
  return x - Math.floor(x);
}
function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const idx = Array.from({ length: arr.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(seededRnd(seed, i) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map(i => arr[i]);
}
function dateSeed(d: string): number { return Number(d.replace(/-/g, '')); }

// ── 型定義 ────────────────────────────────────────────────────
interface Exercise {
  id: string;
  name: string;
  detail: string;       // 1行のやり方説明
  reps?: number;
  sets?: number;
  durationSec?: number; // rep制でない場合の秒数
  calBurned: number;
  youtubeUrl: string;
}
interface ExerciseGroup {
  id: string;
  name: string;
  emoji: string;
  exercises: Exercise[];
}
interface DailyPick {
  group: ExerciseGroup;
  exercises: [Exercise, Exercise];
}
interface WalkPhase {
  label: string;
  minutes: number;
  pace: 'warmup' | 'fast' | 'slow' | 'cooldown';
  instruction: string;
}

// ──────────────────────────────────────────────────────────────
// 運動プール（全5グループ、全種目：寝転び/ベッドの上でOK）
// ──────────────────────────────────────────────────────────────
const EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    id: 'abs', name: 'お腹', emoji: '🔥',
    exercises: [
      { id: 'abs-1', name: 'クランチ',
        detail: '仰向けで膝を立て、みぞおちを膝に近づけるように上体を丸める',
        reps: 15, sets: 3, calBurned: 30, youtubeUrl: YT('クランチ 腹筋 初心者 寝たまま やり方') },
      { id: 'abs-2', name: 'レッグレイズ',
        detail: '仰向けのまま両足を揃えてゆっくり上げ下げする（お尻は浮かさない）',
        reps: 10, sets: 3, calBurned: 25, youtubeUrl: YT('レッグレイズ 下腹 寝たまま 初心者 やり方') },
      { id: 'abs-3', name: 'バイシクルクランチ',
        detail: '仰向けで頭の後ろに手を置き、右肘と左膝を交互に近づける自転車こぎ動作',
        reps: 12, sets: 3, calBurned: 35, youtubeUrl: YT('バイシクルクランチ 初心者 寝たまま お腹') },
      { id: 'abs-4', name: 'リバースクランチ',
        detail: '仰向けで膝を胸に引き寄せながらお尻をそっと床から持ち上げる',
        reps: 12, sets: 3, calBurned: 28, youtubeUrl: YT('リバースクランチ やり方 初心者 寝たまま') },
      { id: 'abs-5', name: 'ニートゥーチェスト',
        detail: '仰向けで両膝を抱えるように胸に引き寄せて2秒キープしてゆっくり戻す',
        reps: 15, sets: 3, calBurned: 25, youtubeUrl: YT('ニートゥーチェスト やり方 腹筋 初心者') },
    ],
  },
  {
    id: 'glutes', name: 'お尻', emoji: '🍑',
    exercises: [
      { id: 'gl-1', name: 'ヒップリフト',
        detail: '仰向けで膝を立て、お尻をゆっくり持ち上げて1秒キープしてゆっくり下ろす',
        reps: 20, sets: 3, calBurned: 35, youtubeUrl: YT('ヒップリフト グルートブリッジ 初心者 寝たまま') },
      { id: 'gl-2', name: 'クラムシェル',
        detail: '横向きに寝て膝を曲げ、貝を開くように上の膝をゆっくり開閉する',
        reps: 15, sets: 3, calBurned: 20, youtubeUrl: YT('クラムシェル お尻 横向き 初心者 やり方') },
      { id: 'gl-3', name: 'ドンキーキック',
        detail: '四つん這いから片足を膝曲げのまま天井に向けてゆっくり蹴り上げる',
        reps: 12, sets: 3, calBurned: 30, youtubeUrl: YT('ドンキーキック お尻 四つん這い 初心者') },
      { id: 'gl-4', name: 'パタパタ足（交互脚上げ）',
        detail: '仰向けで両足を少し上げたまま、右左と交互に小さく上下する',
        reps: 20, sets: 3, calBurned: 20, youtubeUrl: YT('パタパタ足 下腹 お尻 初心者 寝たまま') },
      { id: 'gl-5', name: 'シングルレッグヒップリフト',
        detail: '片足を伸ばしたままヒップリフト。お尻に力を入れてゆっくり上げ下げ。左右交互',
        reps: 10, sets: 3, calBurned: 30, youtubeUrl: YT('シングルレッグヒップリフト お尻 片足 初心者') },
    ],
  },
  {
    id: 'legs', name: '脚・太もも', emoji: '🦵',
    exercises: [
      { id: 'lg-1', name: 'サイドレッグレイズ',
        detail: '横向きに寝て、上側の足をまっすぐ伸ばしたままゆっくり上げ下げする',
        reps: 15, sets: 3, calBurned: 20, youtubeUrl: YT('サイドレッグレイズ 横向き 内もも 初心者') },
      { id: 'lg-2', name: '内もも引き締め',
        detail: '仰向けで枕やクッションを膝の間に挟んで10秒間ギュッとキープしてゆるめる',
        durationSec: 10, sets: 10, calBurned: 15, youtubeUrl: YT('内もも 引き締め 寝たまま 枕 初心者') },
      { id: 'lg-3', name: 'レッグサークル',
        detail: '仰向けで片足を伸ばしたまま床と平行に大きく円を描くように回す',
        reps: 10, sets: 3, calBurned: 20, youtubeUrl: YT('レッグサークル 脚痩せ 寝たまま 初心者') },
      { id: 'lg-4', name: '足首回し＆かかと上げ',
        detail: 'まず足首をぐるぐる10回ずつ回し、次にかかとをゆっくり上げ下げする',
        durationSec: 30, sets: 3, calBurned: 10, youtubeUrl: YT('足首 ストレッチ 寝たまま 初心者 むくみ解消') },
    ],
  },
  {
    id: 'back', name: '背中・体幹', emoji: '💪',
    exercises: [
      { id: 'bk-1', name: 'スーパーマン',
        detail: 'うつ伏せになり、両手と両足を同時に床から持ち上げて3秒キープしてゆっくり下ろす',
        reps: 10, sets: 3, calBurned: 25, youtubeUrl: YT('スーパーマン 背中 うつ伏せ 初心者 やり方') },
      { id: 'bk-2', name: 'バードドッグ',
        detail: '四つん這いから右手と左足を同時に水平に伸ばして2秒キープ。左右交互に',
        reps: 10, sets: 3, calBurned: 20, youtubeUrl: YT('バードドッグ 体幹 初心者 四つん這い やり方') },
      { id: 'bk-3', name: 'バックエクステンション',
        detail: 'うつ伏せで腕を体側に置き、上体だけゆっくり持ち上げてキープして戻す',
        reps: 12, sets: 3, calBurned: 20, youtubeUrl: YT('バックエクステンション 腰 背中 うつ伏せ 初心者') },
      { id: 'bk-4', name: '肩甲骨ほぐし',
        detail: '仰向けで両腕を脇に置き、肩甲骨を背中の中心に寄せて2秒キープしてゆるめる',
        reps: 15, sets: 3, calBurned: 15, youtubeUrl: YT('肩甲骨 ほぐし 寝たまま 初心者 コリ解消') },
    ],
  },
  {
    id: 'stretch', name: '全身ストレッチ', emoji: '🧘',
    exercises: [
      { id: 'st-1', name: '猫のポーズ（体幹ほぐし）',
        detail: '四つん這いで息を吸いながら背中を反らし、吐きながら丸める。ゆっくり繰り返す',
        durationSec: 30, sets: 3, calBurned: 10, youtubeUrl: YT('キャットカウ 猫のポーズ 初心者 体幹 ほぐし') },
      { id: 'st-2', name: '蝶のポーズ（股関節ひらき）',
        detail: '仰向けで両足の裏を合わせて膝を左右に開き、股関節をゆっくりひらいてキープ',
        durationSec: 30, sets: 3, calBurned: 10, youtubeUrl: YT('蝶のポーズ 股関節 ストレッチ 初心者 仰向け') },
      { id: 'st-3', name: '脊柱ねじり',
        detail: '仰向けで片膝を立て反対側に倒し、腰をひねって30秒キープ。左右交互に',
        durationSec: 30, sets: 2, calBurned: 8, youtubeUrl: YT('脊柱ねじり 腰 ストレッチ 寝たまま 初心者') },
      { id: 'st-4', name: 'ひざ抱えストレッチ',
        detail: '仰向けで両膝を両手で抱えて胸に引き寄せ、腰と背中をゆっくり伸ばす',
        durationSec: 30, sets: 2, calBurned: 8, youtubeUrl: YT('ひざ抱え ストレッチ 腰 仰向け 初心者') },
    ],
  },
];

// ── 毎日3グループ×各2種=6種の日替わりピック ──────────────────
function getDailyPicks(dateStr: string): DailyPick[] {
  const seed = dateSeed(dateStr);
  const groups = pickN(EXERCISE_GROUPS, 3, seed);
  return groups.map((group, gi) => ({
    group,
    exercises: pickN(group.exercises, 2, seed + gi * 100) as [Exercise, Exercise],
  }));
}

// ── 緩急ウォーキングプラン生成 ──────────────────────────────────
function generateWalkPlan(totalMinutes = 30, seed = 42): WalkPhase[] {
  const phases: WalkPhase[] = [
    { label: 'ウォームアップ', minutes: 5, pace: 'warmup', instruction: 'ゆっくり歩いて体を温める。深呼吸しながら' },
  ];
  let remaining = totalMinutes - 10;
  let fast = true;
  let i = 0;
  while (remaining > 0.1) {
    const base  = fast ? 2 : 1.5;
    const extra = seededRnd(seed, i++) * 1;
    const dur   = Math.min(remaining, Math.round((base + extra) * 2) / 2);
    phases.push({
      label: fast ? '速歩き' : 'ゆっくり歩き',
      minutes: dur,
      pace: fast ? 'fast' : 'slow',
      instruction: fast
        ? '大股で腕を振って早歩き！心拍を上げろ！脂肪燃焼ゾーン！'
        : '深呼吸しながらリラックス。次の速歩きに備えて回復',
    });
    remaining -= dur;
    fast = !fast;
  }
  phases.push({ label: 'クールダウン', minutes: 5, pace: 'cooldown', instruction: 'ゆっくり歩きながら心拍を下げる' });
  return phases;
}

// ── スパルタあおり文言 ───────────────────────────────────────────
const EXERCISE_TAUNTS = [
  (n0: string) => `おい！ベッドの上にいるなら今すぐ寝転んだまま${n0}をやれ！YouTubeの動画を早く開いてフォームを確認してから即スタートしろ！`,
  (n0: string, n1: string) => `${n0}も${n1}も全部寝たままできる！言い訳ゼロだ！今すぐ動け！`,
  (_: string) => `今日の6種目はすべてベッドの上でできる！YouTubeでお手本を確認しながら一つずつやりきれ！`,
  (n0: string) => `寝転んだまま全身が動く最強メニューだ！まず${n0}から！10秒後にスタートだ！`,
  (n0: string) => `今すぐ${n0}の動画を開け！見ながら動くだけでいい！それだけで体は変わる！今すぐだ！`,
];
const WALKING_TAUNTS = [
  'ウォーキングの時間だ！速歩きとゆっくり歩きを交互にやって脂肪を燃やしてこい！緩急こそが最大の効果を生む！',
  '有酸素運動は毎日続けてこそ効果が出る！今日も緩急ウォーキングで脂肪を叩き出せ！',
  '速歩きで心拍を上げて、遅歩きで回復！これを繰り返すだけで体は変わる！今すぐ外に出ろ！',
];

function getExerciseTaunt(picks: DailyPick[]): string {
  const all  = picks.flatMap(p => p.exercises);
  const seed = dateSeed(today());
  const idx  = Math.floor(seededRnd(seed, 99) * EXERCISE_TAUNTS.length);
  return EXERCISE_TAUNTS[idx](all[0]?.name ?? '宅トレ', all[1]?.name ?? '運動');
}
function getWalkTaunt(dateStr: string): string {
  return WALKING_TAUNTS[dateSeed(dateStr) % WALKING_TAUNTS.length];
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SportsPage() {
  const todayStr    = today();
  const [record, setRecord] = useState(getDailyRecord(todayStr));
  const [done, setDone]     = useState<string[]>(getDoneExercises(todayStr));
  const [steps, setSteps]   = useState('');
  const [weight, setWeight] = useState('');
  const [tab, setTab]       = useState<'menu' | 'walk' | 'record'>('menu');
  const [saved, setSaved]   = useState<'steps' | 'weight' | null>(null);
  const [weekRegistered, setWeekRegistered] = useState(false);
  const [isSpeaking, setIsSpeaking]         = useState(false);

  const dailyPicks  = getDailyPicks(todayStr);
  const walkPlan    = generateWalkPlan(30, dateSeed(todayStr));
  const allExercises = dailyPicks.flatMap(p => p.exercises);
  const doneCount    = allExercises.filter(ex => done.includes(ex.id)).length;
  const totalCalBurned = (record.exerciseCal ?? 0) + (record.calBurned ?? 0);
  const weekHistory  = getWeightHistory().slice(0, 7);
  const exerciseTaunt = getExerciseTaunt(dailyPicks);
  const walkTaunt     = getWalkTaunt(todayStr);

  const reload = useCallback(() => {
    setRecord(getDailyRecord(todayStr));
    setDone(getDoneExercises(todayStr));
  }, [todayStr]);
  useEffect(() => { reload(); }, [reload]);

  // ── TTS ─────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP'; utt.rate = 1.15; utt.pitch = 0.85;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  // ── 運動完了トグル ──────────────────────────────────────────
  const toggleExercise = (ex: Exercise) => {
    const newDone = done.includes(ex.id)
      ? (unmarkExerciseDone(todayStr, ex.id), done.filter(d => d !== ex.id))
      : (markExerciseDone(todayStr, ex.id), [...done, ex.id]);
    setDone(newDone);
    const totalCal = allExercises
      .filter(e => newDone.includes(e.id))
      .reduce((s, e) => s + e.calBurned, 0);
    saveDailyRecord(todayStr, { exerciseCal: totalCal });
    setRecord(getDailyRecord(todayStr));
  };

  // ── 歩数保存 ────────────────────────────────────────────────
  const saveSteps = () => {
    const n = Number(steps);
    if (!n || n < 0) return;
    saveDailyRecord(todayStr, { steps: n, calBurned: Math.round(n * 0.03) });
    setRecord(getDailyRecord(todayStr));
    setSteps(''); setSaved('steps');
    setTimeout(() => setSaved(null), 2000);
  };

  // ── 体重保存 ────────────────────────────────────────────────
  const saveWeight = () => {
    const w = Number(weight);
    if (!w || w < 20 || w > 300) return;
    addWeightRecord(todayStr, w);
    saveDailyRecord(todayStr, { weight: w });
    setRecord(getDailyRecord(todayStr));
    setWeight(''); setSaved('weight');
    setTimeout(() => setSaved(null), 2000);
    addTask({ title: `体重記録 ${w}kg`, priority: 'MEDIUM', scheduledDate: todayStr, recurrence: 'none', category: 'health', source: 'exercise-app', status: 'COMPLETED' });
  };

  // ── 今週をスパルタカレンダーに一括登録（宅トレ＋ウォーキング） ─
  const registerWeekToCalendar = () => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const picks   = getDailyPicks(dateStr);
      const groupNames = picks.map(p => p.group.name).join('・');
      const exNames    = picks.flatMap(p => p.exercises.map(e => e.name)).join('、');
      addTask({
        title: `🏠 宅トレ6種（${groupNames}）`,
        description: exNames,
        priority: 'HIGH', scheduledDate: dateStr, scheduledTime: '18:00',
        estimatedMin: 30, recurrence: 'none', category: 'health',
        source: 'exercise-app', status: 'TODO',
      });
      addTask({
        title: '🚶 緩急ランダムウォーキング30分',
        description: '速歩きとゆっくり歩きを交互に繰り返す有酸素運動',
        priority: 'MEDIUM', scheduledDate: dateStr, scheduledTime: '17:00',
        estimatedMin: 30, recurrence: 'none', category: 'health',
        source: 'exercise-app', status: 'TODO',
      });
    }
    setWeekRegistered(true);
    setTimeout(() => setWeekRegistered(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💪</span>
            <div>
              <h1 className="text-base font-black text-gray-900">宅トレ & ウォーキング</h1>
              <p className="text-[10px] text-gray-400">初心者 · 全部寝転びOK · 毎日6種ランダム</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => speak(tab === 'walk' ? walkTaunt : exerciseTaunt)}
              disabled={isSpeaking}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isSpeaking ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              title="スパルタの喝"
            >🔊</button>
            <button
              onClick={registerWeekToCalendar}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                weekRegistered ? 'bg-green-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {weekRegistered ? '✓ 登録完了！' : '🔥 今週をスパルタ登録'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── スパルタコメント ── */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white">
          <span className="text-xl flex-shrink-0">🔥</span>
          <p className="text-sm font-semibold leading-relaxed flex-1">
            {tab === 'walk' ? walkTaunt : exerciseTaunt}
          </p>
          <button
            onClick={() => speak(tab === 'walk' ? walkTaunt : exerciseTaunt)}
            className="flex-shrink-0 text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg font-bold"
          >🔊</button>
        </div>

        {/* ── サマリー ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '宅トレ',   value: `${doneCount}/6`, unit: '種目', color: 'bg-red-50 text-red-600' },
            { label: '消費kcal', value: String(totalCalBurned), unit: 'kcal', color: 'bg-orange-50 text-orange-600' },
            { label: '歩数',     value: (record.steps ?? 0).toLocaleString(), unit: '歩', color: 'bg-blue-50 text-blue-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-black">{s.value}<span className="text-xs ml-0.5">{s.unit}</span></p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'menu'   as const, label: '🏠 宅トレ' },
            { key: 'walk'   as const, label: '🚶 ウォーキング' },
            { key: 'record' as const, label: '📊 記録' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* ════ 宅トレタブ ════ */}
        {tab === 'menu' && (
          <>
            {/* 進捗バー */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">今日の宅トレ進捗</span>
                <span className="text-xs text-orange-600 font-black">{doneCount}/6 種目完了</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${(doneCount / 6) * 100}%` }}
                />
              </div>
            </div>

            {/* 3グループ×2種目 */}
            {dailyPicks.map((pick, pi) => (
              <section key={pick.group.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* グループヘッダー */}
                <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-lg">{pick.group.emoji}</span>
                  <div>
                    <p className="text-xs font-black text-orange-800">
                      パート {pi + 1}：{pick.group.name}
                    </p>
                    <p className="text-[10px] text-gray-400">2種目 — 全部寝転び・ベッドOK</p>
                  </div>
                </div>
                {/* 種目リスト */}
                <ul className="divide-y divide-gray-50">
                  {pick.exercises.map(ex => {
                    const isDone = done.includes(ex.id);
                    return (
                      <li key={ex.id} className={`px-4 py-4 transition-colors ${isDone ? 'bg-green-50' : ''}`}>
                        <div className="flex items-start gap-3">
                          {/* 完了チェック */}
                          <button
                            onClick={() => toggleExercise(ex)}
                            className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base transition-all mt-0.5 ${
                              isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-orange-400'
                            }`}
                          >{isDone ? '✓' : ''}</button>

                          {/* 種目情報 */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {ex.name}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{ex.detail}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {ex.reps && ex.sets && (
                                <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                                  {ex.reps}回×{ex.sets}セット
                                </span>
                              )}
                              {ex.durationSec && ex.sets && (
                                <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                                  {ex.durationSec}秒×{ex.sets}セット
                                </span>
                              )}
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                約{ex.calBurned}kcal
                              </span>
                              {isDone && (
                                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">完了！</span>
                              )}
                            </div>
                          </div>

                          {/* YouTube ボタン */}
                          <a
                            href={ex.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black transition-all shadow-sm"
                            title={`${ex.name}のYouTube解説動画`}
                          >▶ 動画</a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {doneCount === 6 && (
              <div className="p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white text-center space-y-1">
                <p className="text-3xl">🎉</p>
                <p className="text-base font-black">全6種目クリア！完璧だ！その調子で毎日続けろ！</p>
              </div>
            )}
          </>
        )}

        {/* ════ ウォーキングタブ ════ */}
        {tab === 'walk' && (
          <>
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl text-white">
              <span className="text-xl flex-shrink-0">🚶</span>
              <p className="text-sm font-semibold leading-relaxed flex-1">{walkTaunt}</p>
              <button onClick={() => speak(walkTaunt)}
                className="flex-shrink-0 text-[10px] px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold">🔊</button>
            </div>

            {/* ウォーキングプラン */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-blue-800">緩急ランダムウォーキング 30分</p>
                  <p className="text-[10px] text-gray-400">速歩き↔ゆっくり歩きを繰り返す有酸素運動</p>
                </div>
                <a href={YT('インターバルウォーキング やり方 脂肪燃焼 初心者')}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 transition-all">
                  ▶ 動画
                </a>
              </div>
              <ul className="divide-y divide-gray-50">
                {walkPlan.map((phase, i) => (
                  <li key={i} className={`flex items-center gap-3 px-4 py-3 ${
                    phase.pace === 'fast'    ? 'bg-orange-50' :
                    phase.pace === 'warmup' || phase.pace === 'cooldown' ? 'bg-blue-50' : ''
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      phase.pace === 'fast'     ? 'bg-orange-500 text-white' :
                      phase.pace === 'slow'     ? 'bg-blue-200 text-blue-700' :
                      phase.pace === 'warmup'   ? 'bg-green-200 text-green-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {phase.pace === 'fast' ? '⚡' : phase.pace === 'slow' ? '🐢' : '🏃'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900">{phase.label}</p>
                      <p className="text-[10px] text-gray-500 leading-snug">{phase.instruction}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-black px-2 py-1 rounded-full ${
                      phase.pace === 'fast' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>{phase.minutes}分</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 歩数入力 */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">👟</span>
                <p className="text-sm font-bold text-gray-800">歩数を記録</p>
                {record.steps && (
                  <span className="text-[10px] text-blue-500 bg-blue-50 rounded-full px-2 py-0.5">
                    現在: {record.steps.toLocaleString()}歩
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input type="number" value={steps}
                  onChange={e => setSteps(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveSteps()}
                  placeholder="例：8500"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button onClick={saveSteps} disabled={!steps}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    saved === 'steps' ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white'
                  }`}>{saved === 'steps' ? '✓' : '記録'}</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[3000, 5000, 8000, 10000].map(n => (
                  <button key={n} onClick={() => setSteps(String(n))}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-500 transition-all">
                    {n.toLocaleString()}歩
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ════ 記録タブ ════ */}
        {tab === 'record' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <p className="text-sm font-bold text-gray-800">体重を記録</p>
                {record.weight && (
                  <span className="text-[10px] text-green-500 bg-green-50 rounded-full px-2 py-0.5">現在: {record.weight}kg</span>
                )}
              </div>
              <div className="flex gap-2">
                <input type="number" step="0.1" value={weight}
                  onChange={e => setWeight(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveWeight()}
                  placeholder="例：68.5"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button onClick={saveWeight} disabled={!weight}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    saved === 'weight' ? 'bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white'
                  }`}>{saved === 'weight' ? '✓' : '記録'}</button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <p className="text-xs font-bold text-green-700">体重履歴（直近7件）</p>
              </div>
              {weekHistory.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">まだ体重が記録されていません。</p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-50">
                    {weekHistory.map((h, i) => {
                      const prev = weekHistory[i + 1];
                      const diff = prev ? h.weight - prev.weight : 0;
                      return (
                        <li key={h.date} className="flex items-center justify-between px-4 py-3">
                          <span className="text-xs text-gray-500">{h.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{h.weight}kg</span>
                            {prev && (
                              <span className={`text-[10px] font-semibold ${diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {diff < 0 ? `↓${Math.abs(diff).toFixed(1)}` : diff > 0 ? `↑${diff.toFixed(1)}` : '→'}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {weekHistory.length >= 2 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        開始時: {weekHistory[weekHistory.length - 1].weight}kg →
                        現在: {weekHistory[0].weight}kg
                        （{(weekHistory[0].weight - weekHistory[weekHistory.length - 1].weight).toFixed(1)}kg）
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
