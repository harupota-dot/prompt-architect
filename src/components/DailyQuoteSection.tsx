'use client';

import { getDailyQuotes, type QuoteEntry } from '@/lib/shared-store';

function QuoteCard({ entry, type }: { entry: QuoteEntry; type: 'creator' | 'anime' }) {
  return (
    <div className="flex gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      {/* ── 画像枠（プレースホルダー）── */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${entry.gradFrom} ${entry.gradTo} flex flex-col items-center justify-center shadow-md border border-white/10`}
        >
          <span className="text-xl leading-none">{entry.emoji}</span>
          <span className="text-[11px] font-black text-white/90 mt-0.5 tracking-wide">{entry.initial}</span>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          type === 'creator'
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-orange-100 text-orange-600'
        }`}>
          {type === 'creator' ? '著名人' : 'アニメ'}
        </span>
      </div>

      {/* ── テキスト ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div>
          <p className="text-[11px] font-black text-gray-800 leading-none">{entry.name}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">{entry.role}</p>
        </div>
        <blockquote className="text-xs text-gray-700 leading-relaxed font-medium border-l-2 border-gray-300 pl-2">
          「{entry.quote}」
        </blockquote>
      </div>
    </div>
  );
}

export function DailyQuoteSection() {
  const { creator, anime } = getDailyQuotes();

  return (
    <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
        <span className="text-base">🌟</span>
        <div className="flex-1">
          <p className="text-xs font-black text-indigo-800">今日の日替わり名言</p>
          <p className="text-[10px] text-indigo-400">偉人とアニメキャラが今日もお前を鼓舞する！</p>
        </div>
        <span className="text-[10px] text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full font-semibold">
          {new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
        </span>
      </div>

      {/* 名言カード × 2 */}
      <div className="p-3 space-y-2.5">
        <QuoteCard entry={creator} type="creator" />
        <QuoteCard entry={anime}   type="anime" />
      </div>

      {/* フッター */}
      <div className="px-4 pb-3 text-center">
        <p className="text-[10px] text-indigo-400 italic">
          ※ 毎日日替わりで別の名言が表示されます。明日も来い！
        </p>
      </div>
    </section>
  );
}
