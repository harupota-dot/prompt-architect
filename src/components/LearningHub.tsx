'use client';

import { useState } from 'react';
import { MusicLearning  } from './MusicLearning';
import { IPALearning    } from './IPALearning';
import { DailyPractice  } from './DailyPractice';
import { ToeicRoad      } from './ToeicRoad';
import { WeeklyTest     } from './WeeklyTest';
import { HealthDashboard} from './HealthDashboard';

type Subject = 'music' | 'ipa' | 'practice' | 'toeic' | 'weekly' | 'health';

const SUBJECTS: { id: Subject; icon: string; label: string; sub: string; color: string }[] = [
  { id: 'music',    icon: '🎵', label: '音符・コード',  sub: '五線譜の読み方',  color: 'bg-indigo-600' },
  { id: 'ipa',      icon: '🗣️', label: '発音記号 IPA', sub: '洋楽発音特訓',    color: 'bg-violet-600' },
  { id: 'practice', icon: '💬', label: 'Practice',    sub: '日常英会話',       color: 'bg-blue-600'   },
  { id: 'toeic',    icon: '📝', label: 'TOEIC Road',  sub: '900点への道',      color: 'bg-rose-600'   },
  { id: 'weekly',   icon: '📋', label: 'Weekly Test', sub: '毎週月曜',         color: 'bg-slate-700'  },
  { id: 'health',   icon: '💪', label: 'Health',      sub: '健康管理',         color: 'bg-emerald-600'},
];

export function LearningHub() {
  const [subject, setSubject] = useState<Subject>('music');

  return (
    <>
      {/* ── 科目切替タブ（最上段・常時固定） ── */}
      <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur border-b border-gray-100 py-2">
        <div className="overflow-x-auto scrollbar-none px-2">
          <div className="flex gap-1.5 min-w-max px-1">
            {SUBJECTS.map(({ id, icon, label, sub, color }) => (
              <button key={id} onClick={() => setSubject(id)}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-2xl transition-all whitespace-nowrap ${
                  subject === id ? `${color} text-white shadow-md` : 'text-gray-500 bg-gray-100'
                }`}>
                <span className="text-sm leading-none">{icon}</span>
                <div className="text-left">
                  <p className="text-[11px] font-black leading-tight">{label}</p>
                  <p className={`text-[9px] leading-none mt-0.5 ${
                    subject === id ? 'text-white/70' : 'text-gray-400'
                  }`}>{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="pt-4">
        {subject === 'music'    && <MusicLearning />}
        {subject === 'ipa'      && <IPALearning />}
        {subject === 'practice' && <DailyPractice />}
        {subject === 'toeic'    && <ToeicRoad />}
        {subject === 'weekly'   && <WeeklyTest />}
        {subject === 'health'   && <HealthDashboard />}
      </div>
    </>
  );
}
