'use client';

import { useState } from 'react';
import { MusicLearning  } from './MusicLearning';
import { IPALearning    } from './IPALearning';
import { BabyImmersion  } from './BabyImmersion';
import { ToeicRoad      } from './ToeicRoad';

type Subject = 'music' | 'ipa' | 'immersion' | 'toeic';

const SUBJECTS: { id: Subject; icon: string; label: string; sub: string; color: string }[] = [
  { id: 'music',     icon: '🎵', label: '音符・コード',   sub: '五線譜の読み方',      color: 'bg-indigo-600' },
  { id: 'ipa',       icon: '🗣️', label: '発音記号 IPA', sub: '洋楽発音特訓',        color: 'bg-violet-600' },
  { id: 'immersion', icon: '🌱', label: 'Immersion',    sub: 'English Only',       color: 'bg-blue-600'   },
  { id: 'toeic',     icon: '📝', label: 'TOEIC Road',   sub: '900点への道',         color: 'bg-rose-600'   },
];

export function LearningHub() {
  const [subject, setSubject] = useState<Subject>('music');

  return (
    <>
      {/* ── 科目切替タブ（最上段・常時固定） ── */}
      <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-2">
        <div className="flex gap-1 max-w-md mx-auto bg-gray-100 p-1 rounded-2xl">
          {SUBJECTS.map(({ id, icon, label, sub, color }) => (
            <button key={id} onClick={() => setSubject(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl transition-all ${
                subject === id ? `${color} text-white shadow-md` : 'text-gray-500 hover:text-gray-700'
              }`}>
              <span className="text-sm leading-none flex-shrink-0">{icon}</span>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-black leading-tight truncate">{label}</p>
                <p className={`text-[8px] leading-none mt-0.5 ${
                  subject === id ? 'text-white/70' : 'text-gray-400'
                }`}>{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="pt-4">
        {subject === 'music'     && <MusicLearning />}
        {subject === 'ipa'       && <IPALearning />}
        {subject === 'immersion' && <BabyImmersion />}
        {subject === 'toeic'     && <ToeicRoad />}
      </div>
    </>
  );
}
