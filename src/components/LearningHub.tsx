'use client';

import { useState } from 'react';
import { MusicLearning  } from './MusicLearning';
import { IPALearning    } from './IPALearning';
import { DailyPractice } from './DailyPractice';
import { StoryDialogue } from './StoryDialogue';
import { EnglishJournal } from './EnglishJournal';

type Subject = 'music' | 'ipa' | 'practice' | 'story' | 'journal';

const SUBJECTS: { id: Subject; icon: string; label: string; sub: string; color: string }[] = [
  { id: 'music',    icon: '🎵', label: '音符・コード',   sub: '五線譜の読み方',    color: 'bg-indigo-600' },
  { id: 'ipa',      icon: '🗣️', label: 'IPA発音',       sub: '洋楽発音特訓',      color: 'bg-violet-600' },
  { id: 'practice', icon: '💬', label: 'フレーズ',       sub: '100選',            color: 'bg-blue-600'   },
  { id: 'story',    icon: '🎭', label: 'ストーリー',      sub: '2択・対話',        color: 'bg-rose-600'   },
  { id: 'journal',  icon: '📔', label: '英語日記',        sub: 'Journal',         color: 'bg-emerald-600'},
];

export function LearningHub() {
  const [subject, setSubject] = useState<Subject>('music');

  return (
    <>
      {/* ── 科目切替タブ ── */}
      <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur border-b border-gray-100 py-2">
        <div className="flex gap-0.5 bg-gray-100 mx-3 p-1 rounded-2xl">
          {SUBJECTS.map(({ id, icon, label, sub, color }) => (
            <button key={id} onClick={() => setSubject(id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                subject === id ? `${color} text-white shadow-md` : 'text-gray-600'
              }`}>
              <span className="text-sm leading-none mb-0.5">{icon}</span>
              <p className="text-[9px] font-black leading-tight text-center">{label}</p>
              <p className={`text-[7px] leading-none mt-0.5 ${
                subject === id ? 'text-white/70' : 'text-gray-400'
              }`}>{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="pt-4">
        {subject === 'music'    && <MusicLearning />}
        {subject === 'ipa'      && <IPALearning />}
        {subject === 'practice' && <DailyPractice />}
        {subject === 'story'    && <StoryDialogue />}
        {subject === 'journal'  && <EnglishJournal />}
      </div>
    </>
  );
}
