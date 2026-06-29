import Link from 'next/link';
import { LearningHub } from '@/components/LearningHub';

export const metadata = { title: 'Learning — SPARTA AI' };

export default function LearnPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-indigo-50 to-white">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0">
            ‹
          </Link>
          <span className="text-xl">🎓</span>
          <h1 className="text-base font-black text-gray-900">Learning</h1>
        </div>
      </header>
      <div className="max-w-md mx-auto">
        <LearningHub />
      </div>
    </main>
  );
}
