'use client';

import { useState, useEffect, useRef } from 'react';
import { addTask, today as todayStr } from '@/lib/shared-store';
import { DashboardHeader }     from '@/components/DashboardHeader';
import { WeatherWidget }       from '@/components/WeatherWidget';
import { MusicFactWidget }     from '@/components/MusicFactWidget';
import { NewsWidget }          from '@/components/NewsWidget';
import { DailyQuoteSection }   from '@/components/DailyQuoteSection';
import { TimerWidget }         from '@/components/TimerWidget';
import { CalendarView }        from '@/components/CalendarView';
import { CameraScheduleInput } from '@/components/CameraScheduleInput';
import { GoalsList }           from '@/components/GoalsList';

export default function Home() {

  // ── クイックタスク state ──────────────────────────────────────
  const [quickTitle,       setQuickTitle]       = useState('');
  const [quickHour,        setQuickHour]        = useState('');
  const [quickMinute,      setQuickMinute]      = useState('00');
  const [quickAdded,       setQuickAdded]       = useState(false);
  const [quickVoiceActive, setQuickVoiceActive] = useState(false);
  const [showCalendar,     setShowCalendar]     = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quickRecognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => { quickRecognitionRef.current?.stop(); };
  }, []);

  // ── クイックタスク登録 ────────────────────────────────────────
  const handleQuickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    addTask({
      title,
      scheduledDate: todayStr(),
      scheduledTime: quickHour ? `${quickHour}:${quickMinute}` : undefined,
      priority:      'HIGH',
      status:        'TODO',
      category:      'other',
      recurrence:    'none',
      source:        'manual',
      notifyEnabled: true,
      notifyTiming:  'task-time',
    });
    setQuickTitle(''); setQuickHour(''); setQuickMinute('00');
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 2500);
  };

  const toggleQuickVoice = () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (quickVoiceActive) {
      quickRecognitionRef.current?.stop();
      setQuickVoiceActive(false);
      return;
    }
    const r = new SR();
    r.lang = 'ja-JP'; r.continuous = false; r.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      const t = event.results[0]?.[0]?.transcript ?? '';
      if (t) setQuickTitle(t);
    };
    r.onend   = () => setQuickVoiceActive(false);
    r.onerror = () => setQuickVoiceActive(false);
    quickRecognitionRef.current = r;
    try { r.start(); setQuickVoiceActive(true); } catch { setQuickVoiceActive(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 leading-none">SPARTA AI</h1>
            <p className="text-xs text-gray-400 mt-0.5">スパルタ式・自己成長管理システム</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-40 space-y-5">

        {/* ════════════════════════════════════════
            ⏱ スパルタタイマー（Web Worker + 無音オーディオ）
        ════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 flex items-center gap-2">
            <span className="text-sm">⏱</span>
            <p className="text-xs font-black text-white">スパルタタイマー</p>
            <span className="ml-auto text-[10px] text-slate-300">バックグラウンド対応</span>
          </div>
          <div className="p-3">
            <TimerWidget compact />
          </div>
        </section>

        {/* ════════════════════════════════════════
            ⚡ クイックタスク登録
        ════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 flex items-center gap-2">
            <span className="text-sm">⚡</span>
            <p className="text-xs font-black text-white">クイックタスク登録</p>
            <span className="ml-auto text-[10px] text-red-200">今日のタスクを最速で追加</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && quickTitle.trim()) handleQuickAdd(); }}
                  placeholder="タスク名を入力… Enter で登録"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 pr-8"
                />
                {quickTitle && (
                  <button onClick={() => setQuickTitle('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                )}
              </div>
              <button onClick={toggleQuickVoice}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all flex-shrink-0 ${
                  quickVoiceActive
                    ? 'bg-red-500 text-white animate-pulse shadow-md'
                    : 'bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600'
                }`}
                title="音声でタスク名を入力">🎤</button>
              <div className="flex-shrink-0">
                <CameraScheduleInput onTasksAdded={() => {}} speakSpartan={() => {}} />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <select value={quickHour} onChange={e => setQuickHour(e.target.value)}
                className="px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="">時間なし</option>
                {Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}時</option>
                ))}
              </select>
              <select value={quickMinute} onChange={e => setQuickMinute(e.target.value)}
                disabled={!quickHour}
                className="px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-40">
                {['00', '10', '20', '30', '40', '50'].map(m => (
                  <option key={m} value={m}>{m}分</option>
                ))}
              </select>
              <button onClick={handleQuickAdd} disabled={!quickTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-xs font-black transition-all active:scale-95">
                {quickAdded ? '✅ 登録完了！' : '＋ 今日に登録'}
              </button>
            </div>

            {quickVoiceActive && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span className="text-xs text-red-700 font-medium">録音中… 話し終わると自動でテキストが入力されます</span>
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════
            📅 スケジュールカレンダー
        ════════════════════════════════════════ */}
        <section>
          <button onClick={() => setShowCalendar(v => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-sm transition-all active:scale-[0.99] ${
              showCalendar
                ? 'bg-indigo-600 border-indigo-700 text-white'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}>
            <span className="text-2xl flex-shrink-0">📅</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-black leading-tight ${showCalendar ? 'text-white' : 'text-gray-900'}`}>
                スケジュールカレンダー
              </p>
              <p className={`text-[10px] mt-0.5 ${showCalendar ? 'text-indigo-200' : 'text-gray-400'}`}>
                {showCalendar ? '▲ 閉じる' : '月間カレンダーを開く — 空き時間を見ながら予定を確認'}
              </p>
            </div>
            <span className={`text-lg flex-shrink-0 transition-transform duration-300 ${
              showCalendar ? 'rotate-180 text-white' : 'text-gray-400'
            }`}>▼</span>
          </button>
          {showCalendar && (
            <div className="mt-3">
              <CalendarView onTaskAdded={() => {}} />
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════
            🎯 長期目標リスト（資格・技能）
        ════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h2 className="text-sm font-black text-gray-800">長期目標リスト</h2>
            <span className="text-[10px] text-gray-400 ml-auto">常に目に入る場所に</span>
          </div>
          <GoalsList />
        </section>

        {/* ════════════════════════════════════════
            ダッシュボードウィジェット群
        ════════════════════════════════════════ */}
        <DashboardHeader />
        <WeatherWidget />
        <NewsWidget />
        <MusicFactWidget />
        <DailyQuoteSection />

      </main>
    </div>
  );
}
