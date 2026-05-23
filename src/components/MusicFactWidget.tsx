'use client';

import { getDailyMusicFact } from '@/lib/shared-store';

export function MusicFactWidget() {
  const fact = getDailyMusicFact();

  return (
    <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{fact.emoji}</span>
        <div className="flex-1 flex items-center gap-2">
          <p className="text-xs font-black text-purple-800">今日の音楽の豆知識</p>
          <span className="text-[9px] bg-purple-100 text-purple-500 px-1.5 py-0.5 rounded-full font-medium">
            {fact.category}
          </span>
        </div>
        <span className="text-[9px] text-purple-300">日替わり</span>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed">{fact.fact}</p>
    </div>
  );
}
