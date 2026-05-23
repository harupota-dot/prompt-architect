/**
 * SPARTA AI — Sound Engine
 *
 * 5種類の通知音を Web Audio API で合成生成します。
 * 外部音声ファイルが不要で、後から差し替えも容易な定数管理設計。
 *
 * 音声ファイルを使う場合は SOUND_FILE_MAP に URL を設定すると
 * playSound() が自動的に Audio オブジェクトに切り替わります。
 */

export type SoundType = 'sparta' | 'alarm' | 'digital' | 'chime' | 'gong';

export interface SoundDef {
  value: SoundType;
  label: string;
  emoji: string;
  desc: string;
}

export const SOUND_TYPES: SoundDef[] = [
  { value: 'sparta',  label: 'スパルタ怒声',    emoji: '😤', desc: 'ノコギリ波5連打・荒々しい鬼コーチ' },
  { value: 'alarm',   label: '激しいアラーム',   emoji: '🚨', desc: '矩形波6連打・高低交互の警戒音'     },
  { value: 'digital', label: 'デジタル警告音',   emoji: '🤖', desc: 'SFサイレン・周波数スウィープ'       },
  { value: 'chime',   label: 'チャイム',         emoji: '🔔', desc: 'C-E-G-C の心地よいベル音'          },
  { value: 'gong',    label: 'ゴング音',         emoji: '🥊', desc: '重厚な倍音ゴング・3秒余韻'         },
];

// ── 外部音声ファイル差し替え用マップ ──────────────────────────
// 値を URL 文字列にするとそちらを優先再生します。
// 例: sparta: '/sounds/sparta.mp3'
const SOUND_FILE_MAP: Partial<Record<SoundType, string>> = {
  // sparta:  '/sounds/sparta.mp3',
  // alarm:   '/sounds/alarm.mp3',
  // digital: '/sounds/digital.mp3',
  // chime:   '/sounds/chime.mp3',
  // gong:    '/sounds/gong.mp3',
};

// ── ユーザー設定 ────────────────────────────────────────────────
const SOUND_PREF_KEY   = 'sparta-sound-pref';
const SOUND_VOLUME_KEY = 'sparta-sound-volume'; // 0.0 - 1.0

export function getSoundPref(): SoundType {
  if (typeof window === 'undefined') return 'alarm';
  return (localStorage.getItem(SOUND_PREF_KEY) as SoundType) ?? 'alarm';
}
export function setSoundPref(t: SoundType): void {
  if (typeof window !== 'undefined') localStorage.setItem(SOUND_PREF_KEY, t);
}
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.7;
  return parseFloat(localStorage.getItem(SOUND_VOLUME_KEY) ?? '0.7');
}
export function setSoundVolume(v: number): void {
  if (typeof window !== 'undefined') localStorage.setItem(SOUND_VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
}

// ── メイン再生関数 ───────────────────────────────────────────────
/**
 * @param type  未指定の場合はユーザー設定の音を使用
 * @param vol   0.0 - 1.0 (未指定はユーザー設定)
 */
export function playSound(type?: SoundType, vol?: number): void {
  if (typeof window === 'undefined') return;
  const soundType = type ?? getSoundPref();
  const volume    = vol  ?? getSoundVolume();

  // 外部ファイルが設定されていれば Audio オブジェクトで再生
  const fileUrl = SOUND_FILE_MAP[soundType];
  if (fileUrl) {
    try {
      const audio = new Audio(fileUrl);
      audio.volume = volume;
      audio.play().catch(() => {/* autoplay blocked — silent */});
    } catch { /* ignore */ }
    return;
  }

  // Web Audio API で合成再生
  const ctx = createAudioContext();
  if (!ctx) return;
  synth[soundType](ctx, volume);
}

// ── AudioContext 生成 ────────────────────────────────────────────
type WindowWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
function createAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    return AC ? new AC() : null;
  } catch { return null; }
}

// ── ヘルパー: オシレーター生成 ───────────────────────────────────
function osc(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startT: number,
  endT: number,
  peakGain: number,
  gainEnd = 0.001
): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(peakGain, startT);
  g.gain.exponentialRampToValueAtTime(gainEnd, endT);
  o.start(startT);
  o.stop(endT + 0.01);
}

// ── 5種類のサウンド合成 ───────────────────────────────────────────
const synth: Record<SoundType, (ctx: AudioContext, vol: number) => void> = {

  // 1. スパルタ怒声 — ノコギリ波 上昇スウィープ×5連打
  sparta: (ctx, vol) => {
    for (let i = 0; i < 5; i++) {
      const t = ctx.currentTime + i * 0.16;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(i % 2 === 0 ? 180 : 360, t);
      o.frequency.exponentialRampToValueAtTime(i % 2 === 0 ? 900 : 1800, t + 0.14);
      g.gain.setValueAtTime(vol * 0.8, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.start(t); o.stop(t + 0.15);
    }
    // 最後にノイズバースト風の和音
    [220, 330, 440].forEach((f, j) => osc(ctx, 'square', f, ctx.currentTime + 0.85, ctx.currentTime + 1.15, vol * 0.5 / (j + 1)));
  },

  // 2. 激しいアラーム — 矩形波高低交互×6連打
  alarm: (ctx, vol) => {
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.18;
      osc(ctx, 'square', i % 2 === 0 ? 1200 : 900, t, t + 0.15, vol * 0.65);
    }
  },

  // 3. デジタル警告音 — サイン波 周波数スウィープ往復
  digital: (ctx, vol) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    const ramps: [number, number][] = [
      [300, 0], [1600, 0.35], [300, 0.70], [1600, 1.05], [300, 1.40],
    ];
    ramps.forEach(([f, t]) => o.frequency.linearRampToValueAtTime(f, ctx.currentTime + t));
    g.gain.setValueAtTime(vol * 0.55, ctx.currentTime);
    g.gain.setValueAtTime(vol * 0.55, ctx.currentTime + 1.35);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.45);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 1.5);
  },

  // 4. チャイム — サイン波 C5-E5-G5-C6 順次
  chime: (ctx, vol) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.28;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      // 倍音でリアルなベル感
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'sine'; o2.frequency.value = freq * 2.75;
      g.gain.setValueAtTime(vol * 0.45, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      g2.gain.setValueAtTime(vol * 0.15, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.start(t); o.stop(t + 2.0);
      o2.start(t); o2.stop(t + 0.8);
    });
  },

  // 5. ゴング音 — 倍音列×サイン波 3秒余韻
  gong: (ctx, vol) => {
    const fundamental = 80;
    [1, 2.756, 5.404, 8.933, 13.27].forEach((ratio, i) => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const bq = ctx.createBiquadFilter();
      o.connect(bq); bq.connect(g); g.connect(ctx.destination);
      bq.type = 'lowpass';
      bq.frequency.value = fundamental * ratio * 4;
      o.type = 'sine';
      o.frequency.value = fundamental * ratio;
      const peakVol = vol * (i === 0 ? 0.6 : 0.3 / (i + 1));
      g.gain.setValueAtTime(peakVol, t);
      g.gain.setValueAtTime(peakVol * 0.9, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
      o.start(t); o.stop(t + 3.6);
    });
    // アタック強調: 短い高周波パルス
    osc(ctx, 'square', 800, ctx.currentTime, ctx.currentTime + 0.03, vol * 0.2);
  },
};
