'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDailyRecord, saveDailyRecord, getDoneExercises,
  markExerciseDone, unmarkExerciseDone, getWeightHistory,
  addWeightRecord, getSpartanComment, today, addTask,
} from '@/lib/shared-store';

// ── 運動メニュー定義（YouTube検索リンク付き） ──────────────────
interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  reps?: number;
  sets?: number;
  duration?: number; // minutes
  calBurned: number;
  youtubeUrl: string;
}

interface DayMenu {
  theme: string;
  emoji: string;
  exercises: Exercise[];
}

const YT = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const WEEKLY_MENU: DayMenu[] = [
  {
    theme: '全身ストレッチ & 休息',
    emoji: '🧘',
    exercises: [
      { id: 'sun-1', name: '全身ストレッチ',  bodyPart: '全身',   duration: 15, calBurned: 40,  youtubeUrl: YT('全身ストレッチ 10分 初心者 朝') },
      { id: 'sun-2', name: '腹式深呼吸',       bodyPart: '体幹',   duration: 10, calBurned: 20,  youtubeUrl: YT('腹式呼吸 やり方 瞑想') },
      { id: 'sun-3', name: 'ウォーキング',      bodyPart: '下半身', duration: 20, calBurned: 80,  youtubeUrl: YT('ウォーキング 正しいフォーム 痩せる') },
    ],
  },
  {
    theme: '胸 & 二頭筋トレーニング',
    emoji: '💪',
    exercises: [
      { id: 'mon-1', name: '腕立て伏せ',          bodyPart: '胸',    reps: 15, sets: 3, calBurned: 45, youtubeUrl: YT('腕立て伏せ 正しいフォーム 初心者') },
      { id: 'mon-2', name: 'ワイドプッシュアップ', bodyPart: '胸',    reps: 12, sets: 3, calBurned: 40, youtubeUrl: YT('ワイドプッシュアップ やり方 大胸筋') },
      { id: 'mon-3', name: 'ダンベルカール',        bodyPart: '二頭筋', reps: 12, sets: 3, calBurned: 30, youtubeUrl: YT('ダンベルカール 正しいフォーム 二頭筋') },
      { id: 'mon-4', name: 'ハンマーカール',        bodyPart: '二頭筋', reps: 10, sets: 3, calBurned: 25, youtubeUrl: YT('ハンマーカール やり方 前腕') },
    ],
  },
  {
    theme: '下半身 & 脚トレーニング',
    emoji: '🦵',
    exercises: [
      { id: 'tue-1', name: 'スクワット',   bodyPart: '大腿',       reps: 20, sets: 4, calBurned: 80, youtubeUrl: YT('スクワット 正しいやり方 初心者') },
      { id: 'tue-2', name: 'ランジ',       bodyPart: '大腿',       reps: 15, sets: 3, calBurned: 60, youtubeUrl: YT('ランジ やり方 初心者 下半身') },
      { id: 'tue-3', name: 'カーフレイズ', bodyPart: 'ふくらはぎ', reps: 25, sets: 3, calBurned: 30, youtubeUrl: YT('カーフレイズ やり方 ふくらはぎ') },
      { id: 'tue-4', name: 'ヒップリフト', bodyPart: 'お尻',       reps: 20, sets: 3, calBurned: 40, youtubeUrl: YT('ヒップリフト ブリッジ やり方 お尻') },
    ],
  },
  {
    theme: '体幹 & コアトレーニング',
    emoji: '🔥',
    exercises: [
      { id: 'wed-1', name: 'プランク',         bodyPart: '体幹', duration: 1,  calBurned: 15, youtubeUrl: YT('プランク 正しいやり方 体幹 初心者') },
      { id: 'wed-2', name: 'クランチ',         bodyPart: '腹筋', reps: 25, sets: 3, calBurned: 35, youtubeUrl: YT('クランチ 腹筋 正しいやり方') },
      { id: 'wed-3', name: 'レッグレイズ',     bodyPart: '腹筋', reps: 15, sets: 3, calBurned: 30, youtubeUrl: YT('レッグレイズ やり方 下腹筋') },
      { id: 'wed-4', name: 'バードドッグ',     bodyPart: '体幹', reps: 12, sets: 3, calBurned: 25, youtubeUrl: YT('バードドッグ 体幹トレーニング やり方') },
    ],
  },
  {
    theme: '背中 & 三頭筋トレーニング',
    emoji: '🏋️',
    exercises: [
      { id: 'thu-1', name: '斜め懸垂',            bodyPart: '背中',   reps: 8,  sets: 3, calBurned: 60, youtubeUrl: YT('斜め懸垂 チンニング 初心者 やり方') },
      { id: 'thu-2', name: 'バックエクステンション', bodyPart: '背中',   reps: 15, sets: 3, calBurned: 30, youtubeUrl: YT('バックエクステンション 腰 背中 やり方') },
      { id: 'thu-3', name: 'トライセプスDIP',      bodyPart: '三頭筋', reps: 12, sets: 3, calBurned: 35, youtubeUrl: YT('ディップス 三頭筋 椅子 やり方') },
      { id: 'thu-4', name: 'スカルクラッシャー',   bodyPart: '三頭筋', reps: 10, sets: 3, calBurned: 25, youtubeUrl: YT('スカルクラッシャー 三頭筋 やり方') },
    ],
  },
  {
    theme: '肩 & 有酸素トレーニング',
    emoji: '⚡',
    exercises: [
      { id: 'fri-1', name: 'ショルダープレス',    bodyPart: '肩',   reps: 12, sets: 3, calBurned: 40, youtubeUrl: YT('ショルダープレス 自重 やり方 初心者') },
      { id: 'fri-2', name: 'サイドレイズ',        bodyPart: '肩',   reps: 15, sets: 3, calBurned: 30, youtubeUrl: YT('サイドレイズ やり方 肩 初心者') },
      { id: 'fri-3', name: 'バーピー',            bodyPart: '全身', reps: 10, sets: 3, calBurned: 80, youtubeUrl: YT('バーピー やり方 初心者 有酸素') },
      { id: 'fri-4', name: 'マウンテンクライマー', bodyPart: '体幹', reps: 20, sets: 3, calBurned: 60, youtubeUrl: YT('マウンテンクライマー やり方 体幹 有酸素') },
    ],
  },
  {
    theme: '有酸素 & 柔軟性',
    emoji: '🏃',
    exercises: [
      { id: 'sat-1', name: 'ジョギング',          bodyPart: '全身', duration: 20, calBurned: 150, youtubeUrl: YT('ジョギング 正しいフォーム 初心者') },
      { id: 'sat-2', name: 'ジャンピングジャック', bodyPart: '全身', reps: 30, sets: 3, calBurned: 60,  youtubeUrl: YT('ジャンピングジャック やり方 有酸素') },
      { id: 'sat-3', name: 'ヨガフロー',          bodyPart: '全身', duration: 15, calBurned: 50,  youtubeUrl: YT('ヨガ 初心者 10分 全身 柔軟') },
    ],
  },
];

function getMenuForDate(date: string): DayMenu {
  return WEEKLY_MENU[new Date(date).getDay()];
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SportsPage() {
  const todayStr = today();
  const [record, setRecord] = useState(getDailyRecord(todayStr));
  const [done, setDone]     = useState<string[]>(getDoneExercises(todayStr));
  const [steps, setSteps]   = useState('');
  const [weight, setWeight] = useState('');
  const [tab, setTab]       = useState<'today' | 'history'>('today');
  const [saved, setSaved]   = useState<'steps' | 'weight' | null>(null);
  const [weekRegistered, setWeekRegistered] = useState(false);

  const menu = getMenuForDate(todayStr);
  const weekHistory = getWeightHistory().slice(0, 7);

  const reload = useCallback(() => {
    setRecord(getDailyRecord(todayStr));
    setDone(getDoneExercises(todayStr));
  }, [todayStr]);

  useEffect(() => { reload(); }, [reload]);

  // ── 運動完了トグル ──────────────────────────────────────────
  const toggleExercise = (ex: Exercise) => {
    const newDone = done.includes(ex.id)
      ? (unmarkExerciseDone(todayStr, ex.id), done.filter(d => d !== ex.id))
      : (markExerciseDone(todayStr, ex.id), [...done, ex.id]);
    setDone(newDone);
    const totalCal = menu.exercises.filter(e => newDone.includes(e.id)).reduce((s, e) => s + e.calBurned, 0);
    saveDailyRecord(todayStr, { exerciseCal: totalCal });
    setRecord(getDailyRecord(todayStr));
  };

  // ── 歩数保存 ────────────────────────────────────────────────
  const saveSteps = () => {
    const n = Number(steps);
    if (!n || n < 0) return;
    saveDailyRecord(todayStr, { steps: n, calBurned: Math.round(n * 0.03) });
    setRecord(getDailyRecord(todayStr));
    setSteps('');
    setSaved('steps');
    setTimeout(() => setSaved(null), 2000);
  };

  // ── 体重保存 ────────────────────────────────────────────────
  const saveWeight = () => {
    const w = Number(weight);
    if (!w || w < 20 || w > 300) return;
    addWeightRecord(todayStr, w);
    saveDailyRecord(todayStr, { weight: w });
    setRecord(getDailyRecord(todayStr));
    setWeight('');
    setSaved('weight');
    setTimeout(() => setSaved(null), 2000);
    addTask({
      title: `体重記録 ${w}kg`,
      priority: 'MEDIUM',
      scheduledDate: todayStr,
      recurrence: 'none',
      category: 'health',
      source: 'exercise-app',
      status: 'COMPLETED',
    });
  };

  // ── 今週のメニューをスパルタカレンダーに一括登録 ─────────
  const registerWeekToCalendar = () => {
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const m = getMenuForDate(dateStr);
      addTask({
        title: `${m.emoji} ${m.theme}`,
        description: m.exercises.map(e => e.name).join('、'),
        priority: 'HIGH',
        scheduledDate: dateStr,
        scheduledTime: '18:00',
        estimatedMin: 45,
        recurrence: 'none',
        category: 'health',
        source: 'exercise-app',
        status: 'TODO',
      });
    }
    setWeekRegistered(true);
    setTimeout(() => setWeekRegistered(false), 3000);
  };

  const doneCount      = done.length;
  const totalMenuCount = menu.exercises.length;
  const totalCalBurned = (record.exerciseCal ?? 0) + (record.calBurned ?? 0);
  const spartanComment = getSpartanComment(record.steps, doneCount);

  // ── レンダー ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💪</span>
            <div>
              <h1 className="text-base font-black text-gray-900">運動トラッキング</h1>
              <p className="text-[10px] text-gray-400">{menu.emoji} 今日：{menu.theme}</p>
            </div>
          </div>
          <button
            onClick={registerWeekToCalendar}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              weekRegistered
                ? 'bg-green-500 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {weekRegistered ? '✓ 登録完了！' : '🔥 今週をスパルタ登録'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── スパルタコメント ── */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white">
          <span className="text-xl flex-shrink-0">🔥</span>
          <p className="text-sm font-semibold leading-relaxed">{spartanComment}</p>
        </div>

        {/* ── 今日のサマリー ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '歩数',     value: (record.steps ?? 0).toLocaleString(), unit: '歩',  color: 'bg-blue-50 text-blue-600' },
            { label: '消費kcal', value: String(totalCalBurned),                 unit: 'kcal', color: 'bg-orange-50 text-orange-600' },
            { label: '体重',     value: record.weight ? String(record.weight) : '—', unit: 'kg', color: 'bg-green-50 text-green-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-black">{s.value}<span className="text-xs ml-0.5">{s.unit}</span></p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['today', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'today' ? '今日のメニュー' : '体重履歴'}
            </button>
          ))}
        </div>

        {/* ── 今日のメニュータブ ── */}
        {tab === 'today' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{menu.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-orange-700">{menu.theme}</p>
                    <p className="text-[10px] text-gray-400">{doneCount}/{totalMenuCount} 種目完了</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 rounded-xl">
                  <span className="text-sm font-black text-orange-600">{doneCount}/{totalMenuCount}</span>
                </div>
              </div>

              {/* 進捗バー */}
              <div className="px-4 pt-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${totalMenuCount ? (doneCount / totalMenuCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <ul className="divide-y divide-gray-50 mt-3">
                {menu.exercises.map(ex => {
                  const isDone = done.includes(ex.id);
                  return (
                    <li key={ex.id} className={`px-4 py-3 flex items-center gap-3 transition-colors ${isDone ? 'bg-green-50' : ''}`}>
                      {/* 完了チェック */}
                      <button
                        onClick={() => toggleExercise(ex)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-orange-400'
                        }`}
                      >
                        {isDone ? '✓' : ''}
                      </button>

                      {/* 運動情報 */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {ex.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {ex.bodyPart}
                          {ex.reps && ex.sets && ` · ${ex.reps}回×${ex.sets}セット`}
                          {ex.duration && ` · ${ex.duration}分`}
                          {' · '}約{ex.calBurned}kcal
                        </p>
                      </div>

                      {/* YouTube ボタン */}
                      <a
                        href={ex.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold transition-all border border-red-100"
                        title={`${ex.name}のYouTube解説を見る`}
                      >
                        ▶ 動画
                      </a>
                    </li>
                  );
                })}
              </ul>

              {doneCount === totalMenuCount && totalMenuCount > 0 && (
                <div className="px-4 pb-4 pt-3 bg-green-50 border-t border-green-100 text-center">
                  <p className="text-sm font-black text-green-600">🎉 全種目クリア！その調子で毎日やりきれ！</p>
                </div>
              )}
            </section>

            {/* ── 一括YouTube ── */}
            <div className="flex items-center gap-3 p-3 bg-red-600 rounded-2xl text-white">
              <span className="text-lg">▶</span>
              <div className="flex-1">
                <p className="text-xs font-bold">今日のテーマ動画をまとめて検索</p>
                <p className="text-[10px] text-red-200">{menu.theme}</p>
              </div>
              <a
                href={YT(menu.theme + ' トレーニング やり方')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
              >
                YouTube検索
              </a>
            </div>

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
                <input
                  type="number"
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveSteps()}
                  placeholder="例：8500"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={saveSteps}
                  disabled={!steps}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    saved === 'steps' ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white'
                  }`}
                >
                  {saved === 'steps' ? '✓ 保存！' : '記録'}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[3000, 5000, 8000, 10000].map(n => (
                  <button
                    key={n}
                    onClick={() => setSteps(String(n))}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-500 transition-all"
                  >
                    {n.toLocaleString()}歩
                  </button>
                ))}
              </div>
            </section>

            {/* 体重入力 */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <p className="text-sm font-bold text-gray-800">体重を記録</p>
                {record.weight && (
                  <span className="text-[10px] text-green-500 bg-green-50 rounded-full px-2 py-0.5">
                    現在: {record.weight}kg
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveWeight()}
                  placeholder="例：68.5"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={saveWeight}
                  disabled={!weight}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    saved === 'weight' ? 'bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white'
                  }`}
                >
                  {saved === 'weight' ? '✓ 保存！' : '記録'}
                </button>
              </div>
            </section>
          </>
        )}

        {/* ── 体重履歴タブ ── */}
        {tab === 'history' && (
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
                            <span className={`text-[10px] font-semibold ${
                              diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-500' : 'text-gray-400'
                            }`}>
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
        )}
      </div>
    </div>
  );
}
