import { LearningHub } from '@/components/LearningHub';

export const metadata = { title: '学習 — SPARTA AI' };

export default function MusicPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-indigo-50 to-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <h1 className="text-base font-black text-gray-900">音楽 &amp; 発音 学習</h1>
        </div>
      </header>

      {/* 学習ハブ（科目切替 + 各コンポーネント） */}
      <div className="max-w-md mx-auto">
        <LearningHub />
      </div>
    </main>
  );
}
