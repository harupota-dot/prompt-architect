'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── 都市定義 ─────────────────────────────────────────────────────
const CITIES = {
  gotemba: { label: '御殿場', labelEn: 'Gotemba', lat: 35.3086, lon: 138.9333, icon: '🗻' },
  shibuya: { label: '渋谷',   labelEn: 'Shibuya',  lat: 35.6619, lon: 139.7024, icon: '🏙️' },
} as const;
type CityKey = keyof typeof CITIES;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ─── 天気コード ───────────────────────────────────────────────────
function wi(code: number): { emoji: string; desc: string; heroBg: string } {
  if (code === 0)  return { emoji: '☀️',  desc: '快晴',       heroBg: 'from-sky-500 to-blue-600' };
  if (code <= 2)   return { emoji: '🌤️',  desc: '晴れ',       heroBg: 'from-sky-400 to-blue-500' };
  if (code === 3)  return { emoji: '☁️',  desc: '曇り',       heroBg: 'from-slate-500 to-slate-700' };
  if (code <= 48)  return { emoji: '🌫️', desc: '霧',         heroBg: 'from-gray-500 to-slate-600' };
  if (code <= 55)  return { emoji: '🌦️', desc: '霧雨',       heroBg: 'from-blue-500 to-slate-600' };
  if (code <= 65)  return { emoji: '☔',  desc: '雨',         heroBg: 'from-blue-600 to-indigo-700' };
  if (code <= 67)  return { emoji: '🌨️', desc: 'みぞれ',     heroBg: 'from-blue-300 to-slate-500' };
  if (code <= 77)  return { emoji: '⛄',  desc: '雪',         heroBg: 'from-blue-200 to-indigo-400' };
  if (code <= 82)  return { emoji: '🌧️', desc: 'にわか雨',   heroBg: 'from-slate-600 to-blue-700' };
  if (code <= 86)  return { emoji: '🌨️', desc: 'にわか雪',   heroBg: 'from-blue-300 to-slate-500' };
  if (code === 95) return { emoji: '⛈️', desc: '雷雨',       heroBg: 'from-indigo-700 to-slate-900' };
  return                  { emoji: '⛈️', desc: '激しい雷雨', heroBg: 'from-indigo-800 to-slate-900' };
}

// ─── 型定義 ───────────────────────────────────────────────────────
interface HourSlot { time: string; temp: number; code: number; }
interface DaySlot  { date: string; wday: string; code: number; max: number; min: number; }
interface WeatherData {
  temp:      number;
  windspeed: number;
  code:      number;
  hourly:    HourSlot[];
  daily:     DaySlot[];
  fetchedAt: number;
}

// ─── キャッシュ（10分） ───────────────────────────────────────────
const cache: Partial<Record<CityKey, WeatherData>> = {};
const CACHE_TTL = 10 * 60 * 1000;

async function fetchWeather(city: CityKey): Promise<WeatherData> {
  const hit = cache[city];
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) return hit;

  const { lat, lon } = CITIES[city];
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&hourly=temperature_2m,weathercode` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&timezone=Asia%2FTokyo`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j   = await res.json();
  const cw  = j.current_weather;

  const nowHour  = cw.time.slice(0, 13);
  const hTimes   = j.hourly.time as string[];
  const hTemps   = j.hourly.temperature_2m as number[];
  const hCodes   = j.hourly.weathercode as number[];
  const startIdx = Math.max(0, hTimes.findIndex(t => t.startsWith(nowHour)));

  const hourly: HourSlot[] = hTimes
    .slice(startIdx, startIdx + 25)
    .map((t, i) => ({
      time: t.slice(11, 16),
      temp: Math.round(hTemps[startIdx + i]),
      code: hCodes[startIdx + i],
    }));

  const dDates = j.daily.time as string[];
  const dCodes = j.daily.weathercode as number[];
  const dMax   = j.daily.temperature_2m_max as number[];
  const dMin   = j.daily.temperature_2m_min as number[];

  const daily: DaySlot[] = dDates.map((d, i) => {
    const dt = new Date(d + 'T00:00:00');
    return {
      date: `${dt.getMonth() + 1}/${dt.getDate()}`,
      wday: WEEKDAYS[dt.getDay()],
      code: dCodes[i],
      max:  Math.round(dMax[i]),
      min:  Math.round(dMin[i]),
    };
  });

  const data: WeatherData = {
    temp:      Math.round(cw.temperature * 10) / 10,
    windspeed: Math.round(cw.windspeed),
    code:      cw.weathercode,
    hourly, daily,
    fetchedAt: Date.now(),
  };
  cache[city] = data;
  return data;
}

// ─── スケルトン ───────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-slate-200 animate-pulse shadow-lg">
      <div className="p-5 space-y-4">
        <div className="flex justify-center">
          <div className="h-11 w-56 bg-slate-300 rounded-full" />
        </div>
        <div className="bg-slate-300 rounded-2xl h-32" />
        <div className="bg-white rounded-2xl h-24 border border-slate-200" />
        <div className="bg-white rounded-2xl border border-slate-200 space-y-2 p-3">
          {[0,1,2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
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
    try   { setData(await fetchWeather(c)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(city); }, [city, load]);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="rounded-3xl bg-slate-800 text-white p-6 text-center space-y-3 shadow-lg">
        <p className="text-4xl">📡</p>
        <p className="text-base font-bold">天気データを取得できませんでした</p>
        <button onClick={() => load(city)}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-black active:scale-95 transition-transform">
          再試行
        </button>
      </div>
    );
  }

  const d       = data!;
  const info    = wi(d.code);
  const cityDef = CITIES[city];
  const today   = d.daily[0];

  return (
    <div className="rounded-3xl overflow-hidden shadow-lg bg-white border border-gray-200">

      {/* ══ ヒーロー（現在の天気） ══ */}
      <div className={`bg-gradient-to-br ${info.heroBg} p-5`}>

        {/* 都市トグル */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-black/30 p-1 rounded-full gap-1">
            {(Object.keys(CITIES) as CityKey[]).map(key => (
              <button key={key} onClick={() => setCity(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-black transition-all ${
                  city === key
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white border border-white/50 hover:border-white'
                }`}>
                <span>{CITIES[key].icon}</span>
                <span>{CITIES[key].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 現在気温 + アイコン */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-bold mb-1">
              {cityDef.label} · {cityDef.labelEn}
            </p>
            <div className="flex items-end gap-1">
              <span className="text-7xl font-black text-white leading-none">{d.temp}</span>
              <span className="text-2xl text-white font-bold mb-2">°C</span>
            </div>
            <p className="text-white text-base font-extrabold mt-1">{info.desc}</p>
            <p className="text-white/80 text-sm font-bold mt-0.5">
              💨 {d.windspeed} km/h &nbsp;·&nbsp;
              最高 <span className="text-orange-200 font-black">{today?.max ?? '—'}°</span>
              {' / '}
              最低 <span className="text-blue-200 font-black">{today?.min ?? '—'}°</span>
            </p>
          </div>
          <div className="text-8xl leading-none select-none"
            style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))' }}>
            {info.emoji}
          </div>
        </div>
      </div>

      {/* ══ 時間別予報 ══ */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">
          ⏱ 時間別予報（24時間）
        </p>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
            {d.hourly.map((h, i) => {
              const isNow = i === 0;
              return (
                <div key={i}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl min-w-[60px] border-2 ${
                    isNow
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-gray-200'
                  }`}>
                  <span className={`text-[11px] font-black ${isNow ? 'text-white' : 'text-gray-900'}`}>
                    {isNow ? 'Now' : h.time}
                  </span>
                  <span className="text-2xl leading-none">{wi(h.code).emoji}</span>
                  <span className={`text-sm font-black ${isNow ? 'text-white' : 'text-gray-900'}`}>
                    {h.temp}°
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 区切り */}
      <div className="mx-4 border-t-2 border-gray-100 my-1" />

      {/* ══ 週間予報 ══ */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">
          📅 週間予報
        </p>
        <div className="space-y-1.5">
          {d.daily.map((day, i) => {
            const isToday = i === 0;
            return (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  isToday ? 'bg-slate-900' : 'bg-gray-50 border border-gray-200'
                }`}>
                {/* 曜日 */}
                <div className="w-14 flex-shrink-0">
                  <span className={`text-sm font-black ${isToday ? 'text-white' : 'text-gray-900'}`}>
                    {isToday ? '今日' : `${day.wday}曜`}
                  </span>
                  <span className={`text-xs font-bold ml-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>
                    {day.date}
                  </span>
                </div>
                {/* アイコン */}
                <span className="text-2xl leading-none flex-shrink-0">{wi(day.code).emoji}</span>
                {/* 説明 */}
                <span className={`text-sm font-bold flex-1 truncate ${isToday ? 'text-gray-200' : 'text-gray-700'}`}>
                  {wi(day.code).desc}
                </span>
                {/* 気温 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-black ${isToday ? 'text-blue-300' : 'text-blue-600'}`}>
                    {day.min}°
                  </span>
                  <span className={`text-xs ${isToday ? 'text-gray-500' : 'text-gray-300'}`}>—</span>
                  <span className={`text-sm font-black ${isToday ? 'text-orange-300' : 'text-orange-600'}`}>
                    {day.max}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 更新時刻 */}
        <p className="text-gray-400 text-[10px] font-bold text-right mt-3">
          {new Date(d.fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 更新 · Open-Meteo
        </p>
      </div>

    </div>
  );
}
