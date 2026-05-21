import { NextResponse } from 'next/server';

// Mock data endpoint — ready for Google Health Connect integration.
// Future: swap mock values with real OAuth-authenticated Health Connect API calls.
export async function GET() {
  const today = new Date().toISOString().split('T')[0];
  const steps = 4523;
  const activeMinutes = 32;
  const calories = Math.round(steps * 0.04);

  const spartanComment =
    steps >= 8000
      ? '素晴らしい！体を動かすことが成功の土台だ！その調子でやりきれ！'
      : steps >= 5000
      ? 'まだ足りない！8000歩が最低ラインだぞ！今すぐ立ち上がって歩け！'
      : '歩数が少なすぎる！デスクにかじりついてサボってないか？今すぐ動け！';

  return NextResponse.json({
    today: {
      date: today,
      steps,
      activeMinutes,
      calories,
      source: 'mock',
    },
    weeklyAverage: {
      steps: 6234,
      activeMinutes: 42,
    },
    spartanComment,
    note: 'モックデータ表示中。将来的にGoogle Health Connectと連携予定。',
  });
}
