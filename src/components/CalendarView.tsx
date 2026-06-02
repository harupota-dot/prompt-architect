'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LocalTask, addTask, getTasks, today,
  TaskRecurrence,
} from '@/lib/shared-store';

// ══════════════════════════════════════════════════════════════════
// 定数 / ユーティリティ
// ══════════════════════════════════════════════════════════════════
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAY_NAMES   = ['日','月','火','水','木','金','土'];

const HOUR_OPTS   = Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, '0'));
const MIN_OPTS    = ['00','10','20','30','40','50'];
const TITLE_PRESETS = [
  'ピアノ','ドラム','ロジック','バンド','MT','ディクション',
  '発声・腹式','レコーディング','VT','ADO',
  '買い物','風呂','食事','支度','睡眠','移動','その他',
];

// カテゴリカラー
const CAT: Record<string, { dot: string; ring: string; badge: string; text: string }> = {
  study:  { dot: '#6366f1', ring: 'ring-indigo-300',   badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',   text: 'text-indigo-600' },
  work:   { dot: '#10b981', ring: 'ring-emerald-300',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-600' },
  health: { dot: '#f43f5e', ring: 'ring-rose-300',      badge: 'bg-rose-50 text-rose-700 border-rose-100',         text: 'text-rose-600' },
  other:  { dot: '#f59e0b', ring: 'ring-amber-300',     badge: 'bg-amber-50 text-amber-700 border-amber-100',      text: 'text-amber-600' },
};
const getCat = (c?: string) => CAT[c ?? 'other'] ?? CAT.other;

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`;
}

// ══════════════════════════════════════════════════════════════════
// クイック追加フォームの型
// ══════════════════════════════════════════════════════════════════
interface QuickForm {
  title: string; customTitle: string;
  hour: string;  minute: string;
  duration: string;
  category: 'study' | 'work' | 'other';
  recurrence: TaskRecurrence;
}
const DEFAULT_FORM: QuickForm = {
  title: '', customTitle: '',
  hour: '', minute: '00',
  duration: '60', category: 'study', recurrence: 'none',
};

// ══════════════════════════════════════════════════════════════════
// CalendarView コンポーネント
// ══════════════════════════════════════════════════════════════════
export function CalendarView({ onTaskAdded }: { onTaskAdded?: () => void }) {
  const todayStr  = today();
  const todayDate = new Date(todayStr);

  // ── カレンダーナビゲーション ─────────────────────────────────────
  const [year,  setYear]  = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());

  // ── タスクデータ ────────────────────────────────────────────────
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);

  // ── 選択日 & パネル ─────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState<QuickForm>(DEFAULT_FORM);
  const [flashOK,      setFlashOK]      = useState(false);

  // ── カレンダーグリッド構築 ──────────────────────────────────────
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // ── タスクを日付でグループ化 ────────────────────────────────────
  const byDate = tasks.reduce<Record<string, LocalTask[]>>((acc, t) => {
    if (t.scheduledDate) {
      acc[t.scheduledDate] = [...(acc[t.scheduledDate] ?? []), t];
    }
    return acc;
  }, {});

  // ── 選択日のタスク（時間順） ────────────────────────────────────
  const selectedTasks = (selectedDate ? (byDate[selectedDate] ?? []) : [])
    .slice()
    .sort((a, b) => (a.scheduledTime ?? '99:99') < (b.scheduledTime ?? '99:99') ? -1 : 1);

  // ── 月ナビゲーション ─────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
  };

  // ── 日付タップ ───────────────────────────────────────────────────
  const selectDate = (d: number) => {
    const iso = isoDate(year, month, d);
    if (selectedDate === iso) { setSelectedDate(null); return; }
    setSelectedDate(iso);
    setShowForm(false);
    setFlashOK(false);
  };

  // ── パネルを閉じる ───────────────────────────────────────────────
  const dismissPanel = () => {
    setSelectedDate(null);
    setShowForm(false);
    setFlashOK(false);
  };

  // ── クイック追加 ─────────────────────────────────────────────────
  const submitQuickAdd = () => {
    if (!selectedDate) return;
    const title = form.title === 'その他' ? form.customTitle.trim() : form.title;
    if (!title) return;

    addTask({
      title,
      scheduledDate:  selectedDate,
      scheduledTime:  form.hour ? `${form.hour}:${form.minute}` : undefined,
      estimatedMin:   form.duration ? Number(form.duration) : undefined,
      category:       form.category,
      recurrence:     form.recurrence,
      priority:       'HIGH',
      status:         'TODO',
      source:         'manual',
      notifyEnabled:  true,
      notifyTiming:   'task-time',
    });

    reload();
    onTaskAdded?.();
    setFlashOK(true);
    setForm(DEFAULT_FORM);
    setShowForm(false);
    setTimeout(() => setFlashOK(false), 2500);
  };

  // ── 日付セルのドット色（最大3カテゴリ） ──────────────────────────
  const getDots = (iso: string) => {
    const ts = byDate[iso] ?? [];
    const cats = [...new Set(ts.map(t => t.category ?? 'other'))];
    return cats.slice(0, 3).map(c => getCat(c).dot);
  };

  // ── 当月のタスク数サマリー ────────────────────────────────────────
  const monthTotal = Object.entries(byDate).reduce((sum, [date, ts]) => {
    const [y, m] = date.split('-').map(Number);
    return (y === year && m === month + 1) ? sum + ts.length : sum;
  }, 0);

  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-0">

      {/* ══════════════════════════════════════════════
          カレンダー本体（月ビュー）
          ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── ヘッダー ── */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-lg transition-all">
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-black text-gray-900 leading-none">
              {year}年 {MONTH_NAMES[month]}
            </p>
            {monthTotal > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">{monthTotal}件の予定</p>
            )}
          </div>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-lg transition-all">
            ›
          </button>
          <button onClick={goToday}
            className="text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 py-1 transition-all ml-1">
            今日
          </button>
        </div>

        {/* ── 曜日ヘッダー ── */}
        <div className="grid grid-cols-7 border-t border-gray-100">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`text-center py-2 text-[11px] font-black ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-gray-400'
            }`}>{d}</div>
          ))}
        </div>

        {/* ── 日付グリッド ── */}
        <div className="grid grid-cols-7 border-t border-gray-100">
          {cells.map((d, i) => {
            // 空セル
            if (!d) return (
              <div key={`e${i}`}
                className="h-14 border-b border-gray-50"
                style={{ borderRight: i % 7 === 6 ? 'none' : undefined }}
              />
            );

            const iso        = isoDate(year, month, d);
            const isToday    = iso === todayStr;
            const isSelected = iso === selectedDate;
            const isPast     = iso < todayStr;
            const dots       = getDots(iso);
            const taskCnt    = (byDate[iso] ?? []).length;
            const isWeekend  = i % 7 === 0 || i % 7 === 6;

            return (
              <button key={iso} onClick={() => selectDate(d)}
                className={`h-14 relative flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-colors border-b ${
                  isSelected
                    ? 'bg-red-50'
                    : isPast && !isToday
                    ? 'bg-gray-50/60 hover:bg-gray-50'
                    : 'hover:bg-slate-50'
                }`}
                style={{ borderRight: i % 7 === 6 ? 'none' : '1px solid #f9fafb' }}
              >
                {/* 日付数字 */}
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black leading-none transition-all ${
                  isToday    ? 'bg-red-600 text-white shadow-sm' :
                  isSelected ? 'bg-red-100 text-red-700' :
                  isPast     ? (isWeekend ? 'text-gray-300' : 'text-gray-300') :
                  i % 7 === 0 ? 'text-rose-500' :
                  i % 7 === 6 ? 'text-indigo-500' :
                  'text-gray-800'
                }`}>{d}</span>

                {/* タスクドット */}
                {taskCnt > 0 && (
                  <div className="flex items-center gap-[3px]">
                    {dots.map((color, di) => (
                      <span key={di} className="block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }} />
                    ))}
                    {taskCnt > 3 && (
                      <span className="text-[7px] text-gray-400 font-bold leading-none">
                        +{taskCnt - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 凡例 ── */}
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-4 flex-wrap">
          {[
            [CAT.study.dot,  '音楽・学習'],
            [CAT.work.dot,   '仕事'],
            [CAT.other.dot,  'その他'],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
              <span className="text-[9px] text-gray-400">{l}</span>
            </span>
          ))}
          <span className="ml-auto text-[9px] text-gray-400">日付をタップ → 詳細・追加</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          日別ハーフモーダルパネル（固定配置）
          カレンダーを隠しきらず、見ながら入力できる
          ══════════════════════════════════════════════ */}
      {selectedDate && (
        <>
          {/* 背景オーバーレイ（タップで閉じる） */}
          <div
            className="fixed inset-0 z-40 bg-black/25"
            onClick={dismissPanel}
          />

          {/* ハーフモーダルパネル（ナビバーの上に浮かぶ） */}
          <div
            className="fixed inset-x-0 z-50 max-w-2xl mx-auto"
            style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-100"
              style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>

              {/* ── パネルハンドル ── */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <span className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* ── パネルヘッダー ── */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                <div>
                  <p className="text-sm font-black text-gray-900">{fmtDate(selectedDate)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {selectedTasks.length > 0
                      ? `${selectedTasks.filter(t => t.status !== 'COMPLETED').length}件のTODO・${selectedTasks.filter(t => t.status === 'COMPLETED').length}件完了`
                      : '予定なし — タップして追加'}
                  </p>
                </div>
                <button onClick={dismissPanel}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-all">
                  ✕
                </button>
              </div>

              {/* ── スクロールエリア ── */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 overscroll-contain">

                {/* 追加完了フラッシュ */}
                {flashOK && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span>✅</span> 予定を追加しました！
                  </div>
                )}

                {/* タスクリスト */}
                {selectedTasks.length > 0 && (
                  <div className="space-y-2">
                    {selectedTasks.map(task => {
                      const cat = getCat(task.category);
                      return (
                        <div key={task.id}
                          className={`flex items-stretch gap-0 rounded-xl overflow-hidden border ${cat.badge} ${
                            task.status === 'COMPLETED' ? 'opacity-50' : ''
                          }`}
                        >
                          {/* カテゴリアクセントバー */}
                          <span className="w-1 flex-shrink-0" style={{ backgroundColor: cat.dot }} />
                          <div className="flex-1 px-3 py-2.5 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold leading-snug text-gray-900 ${
                                task.status === 'COMPLETED' ? 'line-through' : ''
                              }`}>{task.title}</p>
                              <div className="flex items-center gap-2.5 mt-0.5">
                                {task.scheduledTime && (
                                  <span className="text-[10px] text-gray-500">🕐 {task.scheduledTime}</span>
                                )}
                                {task.estimatedMin && (
                                  <span className="text-[10px] text-gray-500">⏱ {task.estimatedMin}分</span>
                                )}
                              </div>
                            </div>
                            {task.status === 'COMPLETED' && (
                              <span className="text-[9px] text-emerald-600 font-black flex-shrink-0">✓ 完了</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 空の日 */}
                {selectedTasks.length === 0 && !showForm && (
                  <div className="text-center py-5">
                    <p className="text-2xl mb-1.5">📅</p>
                    <p className="text-xs text-gray-400">この日はまだ予定がありません</p>
                  </div>
                )}

                {/* ── クイック追加フォーム ── */}
                {showForm && (
                  <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/40 to-orange-50/20 p-4 space-y-3">
                    <p className="text-xs font-black text-gray-800">＋ 予定を追加</p>

                    {/* タスク名 */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">タスク名 *</label>
                      <select value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                        <option value="">— 選択 —</option>
                        {TITLE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {form.title === 'その他' && (
                      <input type="text" placeholder="タスク名を入力…"
                        value={form.customTitle}
                        onChange={e => setForm(f => ({ ...f, customTitle: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                    )}

                    {/* 時間・所要 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">開始時間</label>
                        <div className="flex gap-1 items-center">
                          <select value={form.hour}
                            onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400">
                            <option value="">--</option>
                            {HOUR_OPTS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-[10px] text-gray-300">:</span>
                          <select value={form.minute}
                            onChange={e => setForm(f => ({ ...f, minute: e.target.value }))}
                            disabled={!form.hour}
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-40">
                            {MIN_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">所要（分）</label>
                        <input type="number" min="5" max="480" step="5"
                          value={form.duration}
                          onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                    </div>

                    {/* カテゴリ */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">カテゴリ</label>
                      <div className="flex gap-1.5">
                        {([
                          ['study', '📚 学習'],
                          ['work',  '💼 仕事'],
                          ['other', '📌 その他'],
                        ] as const).map(([cat, label]) => (
                          <button key={cat}
                            onClick={() => setForm(f => ({ ...f, category: cat }))}
                            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              form.category === cat
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>

                    {/* 繰り返し */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">繰り返し</label>
                      <div className="flex gap-1.5">
                        {([
                          ['none',   '1回だけ'],
                          ['daily',  '毎日'],
                          ['weekly', '毎週'],
                        ] as const).map(([val, label]) => (
                          <button key={val}
                            onClick={() => setForm(f => ({ ...f, recurrence: val }))}
                            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              form.recurrence === val
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>

                    {/* 追加ボタン */}
                    <button onClick={submitQuickAdd}
                      disabled={!form.title || (form.title === 'その他' && !form.customTitle.trim())}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 disabled:from-gray-300 disabled:to-gray-300 text-white text-xs font-black transition-all active:scale-[0.99] shadow-sm">
                      🔥 予定を追加する
                    </button>
                    <button onClick={() => setShowForm(false)}
                      className="w-full py-1 text-[10px] text-gray-400 hover:text-gray-600 transition-all">
                      キャンセル
                    </button>
                  </div>
                )}
              </div>

              {/* ── フッター（追加ボタン） ── */}
              {!showForm && (
                <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => { setShowForm(true); setFlashOK(false); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-95 text-white text-sm font-black transition-all active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>＋</span>
                    <span>この日に予定を追加</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
