'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── 都市定義 ─────────────────────────────────────────────────────
const CITIES = {
  gotemba: { label: '御殿場',  labelEn: 'Gotemba', lat: 35.3086, lon: 138.9333, icon: '🗻' },
  shibuya: { label: '渋谷',    labelEn: 'Shibuya',  lat: 35.6619, lon: 139.7024, icon: '🏙️' },
} as const;
type CityKey = keyof typeof CITIES;

// ─── 天気コード → 絵文字・説明 ───────────────────────────────────
function weatherInfo(code: number): { emoji: string; desc: string; bg: string } {
  if (code === 0)  return { emoji: '☀️',  desc: '快晴',         bg: 'from-sky-400 via-blue-400 to-indigo-400' };
  if (code <= 2)   return { emoji: '🌤️',  desc: '晴れ',         bg: 'from-sky-300 via-blue-300 to-indigo-400' };
  if (code === 3)  return { emoji: '☁️',  desc: '曇り',         bg: 'from-slate-400 via-gray-400 to-slate-500' };
  if (code <= 48)  return { emoji: '🌫️', desc: '霧',           bg: 'from-gray-400 via-slate-400 to-gray-500'  };
  if (code <= 55)  return { emoji: '🌦️', desc: '霧雨',         bg: 'from-slate-500 via-blue-500 to-indigo-600' };
  if (code <= 65)  return { emoji: '☔',  desc: '雨',           bg: 'from-slate-600 via-blue-600 to-indigo-700' };
  if (code <= 67)  return { emoji: '🌨️', desc: '雨/みぞれ',   bg: 'from-blue-300 via-slate-400 to-indigo-400' };
  if (code <= 77)  return { emoji: '⛄',  desc: '雪',           bg: 'from-blue-200 via-slate-200 to-indigo-300' };
  if (code <= 82)  return { emoji: '🌧️', desc: 'にわか雨',     bg: 'from-slate-500 via-blue-600 to-indigo-700' };
  if (code <= 86)  return { emoji: '🌨️', desc: 'にわか雪',     bg: 'from-blue-300 via-slate-300 to-indigo-300' };
  if (code === 95) return { emoji: '⛈️', desc: '雷雨',         bg: 'from-indigo-600 via-purple-700 to-slate-800' };
  return                  { emoji: '⛈️', desc: '激しい雷雨',   bg: 'from-indigo-700 via-purple-800 to-slate-900' };
}

// ─── 体感温度カラー ───────────────────────────────────────────────
function tempColor(t: number): string {
  if (t >= 35) return 'text-red-300';
  if (t >= 28) return 'text-orange-200';
  if (t >= 20) return 'text-white';
  if (t >= 10) return 'text-blue-200';
  return 'text-blue-300';
}

// ─── 型 ───────────────────────────────────────────────────────────
interface WeatherData {
  temperature: number;
  windspeed:   number;
  weathercode: number;
  fetchedAt:   number;
}

// ─── キャッシュ（10分間） ─────────────────────────────────────────
const cache: Partial<Record<CityKey, WeatherData>> = {};
const CACHE_TTL = 10 * 60 * 1000;

async function fetchWeather(city: CityKey): Promise<WeatherData> {
  const cached = cache[city];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;

  const { lat, lon } = CITIES[city];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FTokyo`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const cw   = json.current_weather;
  const data: WeatherData = {
    temperature: Math.round(cw.temperature * 10) / 10,
    windspeed:   Math.round(cw.windspeed),
    weathercode: cw.weathercode,
    fetchedAt:   Date.now(),
  };
  cache[city] = data;
  return data;
}

// ─── スケルトン ───────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400 animate-pulse">
      <div className="p-5">
        {/* toggle area */}
        <div className="flex justify-center mb-4">
          <div className="h-9 w-52 bg-white/20 rounded-full" />
        </div>
        {/* main content */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-white/20 rounded-full" />
            <div className="h-14 w-28 bg-white/30 rounded-2xl" />
            <div className="h-4 w-20 bg-white/20 rounded-full" />
          </div>
          <div className="h-20 w-20 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export function CityWeatherWidget() {
  const [city,    setCity]    = useState<CityKey>('gotemba');
  const [data,    setData]    = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(async (c: CityKey) => {
    setLoading(true); setError(false);
    try {
      const d = await fetchWeather(c);
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(city); }, [city, load]);

  const cityDef = CITIES[city];

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-3xl bg-slate-800 text-white p-5 text-center space-y-2">
        <p className="text-3xl">📡</p>
        <p className="text-sm font-bold opacity-70">天気データを取得できませんでした</p>
        <button onClick={() => load(city)}
          className="px-4 py-2 rounded-xl bg-white/15 text-xs font-black active:scale-95 transition-transform">
          再試行
        </button>
      </div>
    );
  }

  const info = weatherInfo(data!.weathercode);

  return (
    <div className={`rounded-3xl overflow-hidden bg-gradient-to-br ${info.bg} shadow-lg`}>
      <div className="p-5">

        {/* ── トグルボタン ── */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-black/20 p-1 rounded-full gap-1">
            {(Object.keys(CITIES) as CityKey[]).map(key => {
              const c = CITIES[key];
              return (
                <button
                  key={key}
                  onClick={() => setCity(key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                    city === key
                      ? 'bg-white text-slate-800 shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 天気メイン表示 ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-bold mb-0.5">
              {cityDef.label} / {cityDef.labelEn}
            </p>
            <div className="flex items-end gap-1">
              <span className={`text-6xl font-black leading-none ${tempColor(data!.temperature)}`}>
                {data!.temperature}
              </span>
              <span className="text-2xl text-white/80 font-bold mb-1">°C</span>
            </div>
            <p className="text-white/80 text-sm font-bold mt-1">{info.desc}</p>
            <p className="text-white/50 text-[10px] mt-0.5">
              💨 {data!.windspeed} km/h
            </p>
          </div>

          {/* 天気アイコン */}
          <div className="text-7xl leading-none select-none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
            {info.emoji}
          </div>
        </div>

        {/* ── 更新時刻 ── */}
        <p className="text-white/30 text-[9px] text-right mt-3">
          {new Date(data!.fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 更新
        </p>
      </div>
    </div>
  );
}
