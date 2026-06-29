'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── 都市定義 ─────────────────────────────────────────────────────
const CITIES = {
  gotemba: { label: '御殿場', labelEn: 'Gotemba', lat: 35.3086, lon: 138.9333, icon: '🗻' },
  shibuya: { label: '渋谷',   labelEn: 'Shibuya',  lat: 35.6619, lon: 139.7024, icon: '🏙️' },
} as const;
type CityKey = keyof typeof CITIES;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ─── 天気コード ヘルパー ──────────────────────────────────────────
function wi(code: number): { emoji: string; desc: string } {
  if (code === 0)  return { emoji: '☀️',  desc: '快晴'       };
  if (code <= 2)   return { emoji: '🌤️',  desc: '晴れ'       };
  if (code === 3)  return { emoji: '☁️',  desc: '曇り'       };
  if (code <= 48)  return { emoji: '🌫️', desc: '霧'         };
  if (code <= 55)  return { emoji: '🌦️', desc: '霧雨'       };
  if (code <= 65)  return { emoji: '☔',  desc: '雨'         };
  if (code <= 67)  return { emoji: '🌨️', desc: 'みぞれ'     };
  if (code <= 77)  return { emoji: '⛄',  desc: '雪'         };
  if (code <= 82)  return { emoji: '🌧️', desc: 'にわか雨'   };
  if (code <= 86)  return { emoji: '🌨️', desc: 'にわか雪'   };
  if (code === 95) return { emoji: '⛈️', desc: '雷雨'       };
  return                  { emoji: '⛈️', desc: '激しい雷雨' };
}

function skyGrad(code: number): string {
  if (code === 0)  return 'from-sky-400 via-blue-400 to-indigo-500';
  if (code <= 2)   return 'from-sky-300 via-blue-300 to-indigo-400';
  if (code === 3)  return 'from-slate-400 via-gray-400 to-slate-500';
  if (code <= 48)  return 'from-gray-400 via-slate-400 to-gray-500';
  if (code <= 65)  return 'from-slate-500 via-blue-600 to-indigo-700';
  if (code <= 77)  return 'from-blue-200 via-slate-300 to-indigo-300';
  return                  'from-indigo-600 via-purple-700 to-slate-800';
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

  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j    = await res.json();
  const cw   = j.current_weather;

  // 現在時刻インデックス（hourly は1時間単位）
  const nowHour = cw.time.slice(0, 13); // "2024-06-29T14"
  const hTimes  = j.hourly.time as string[];
  const hTemps  = j.hourly.temperature_2m as number[];
  const hCodes  = j.hourly.weathercode as number[];
  const startIdx = Math.max(0, hTimes.findIndex(t => t.startsWith(nowHour)));

  const hourly: HourSlot[] = hTimes
    .slice(startIdx, startIdx + 25)
    .map((t, i) => ({
      time: t.slice(11, 16),            // "14:00"
      temp: Math.round(hTemps[startIdx + i]),
      code: hCodes[startIdx + i],
    }));

  // daily
  const dDates = j.daily.time as string[];
  const dCodes = j.daily.weathercode as number[];
  const dMax   = j.daily.temperature_2m_max as number[];
  const dMin   = j.daily.temperature_2m_min as number[];

  const daily: DaySlot[] = dDates.map((d, i) => {
    const dt   = new Date(d + 'T00:00:00');
    const wday = WEEKDAYS[dt.getDay()];
    const mmdd = `${dt.getMonth() + 1}/${dt.getDate()}`;
    return {
      date: mmdd,
      wday,
      code: dCodes[i],
      max:  Math.round(dMax[i]),
      min:  Math.round(dMin[i]),
    };
  });

  const data: WeatherData = {
    temp:      Math.round(cw.temperature * 10) / 10,
    windspeed: Math.round(cw.windspeed),
    code:      cw.weathercode,
    hourly,
    daily,
    fetchedAt: Date.now(),
  };
  cache[city] = data;
  return data;
}

// ─── スケルトン ───────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400 animate-pulse shadow-lg">
      <div className="p-5 space-y-4">
        <div className="flex justify-center">
          <div className="h-9 w-52 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-white/20 rounded-full" />
            <div className="h-14 w-28 bg-white/30 rounded-2xl" />
            <div className="h-3 w-20 bg-white/20 rounded-full" />
          </div>
          <div className="h-20 w-20 bg-white/20 rounded-full" />
        </div>
        <div className="h-24 bg-white/10 rounded-2xl" />
        <div className="space-y-2">
          {[0,1,2].map(i => (
            <div key={i} className="h-9 bg-white/10 rounded-xl" />
          ))}
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
      <div className="rounded-3xl bg-slate-800 text-white p-5 text-center space-y-2 shadow-lg">
        <p className="text-3xl">📡</p>
        <p className="text-sm font-bold opacity-70">天気データを取得できませんでした</p>
        <button onClick={() => load(city)}
          className="px-4 py-2 rounded-xl bg-white/15 text-xs font-black active:scale-95 transition-transform">
          再試行
        </button>
      </div>
    );
  }

  const d       = data!;
  const info    = wi(d.code);
  const grad    = skyGrad(d.code);
  const cityDef = CITIES[city];
  const today   = d.daily[0];

  return (
    <div className={`rounded-3xl overflow-hidden bg-gradient-to-br ${grad} shadow-lg`}>
      <div className="p-5 space-y-4">

        {/* ══ 都市トグル ══ */}
        <div className="flex justify-center">
          <div className="flex bg-black/20 p-1 rounded-full gap-1">
            {(Object.keys(CITIES) as CityKey[]).map(key => (
              <button key={key} onClick={() => setCity(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                  city === key
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-white/70 active:text-white'
                }`}>
                {CITIES[key].icon} {CITIES[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ 現在の天気 ══ */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-bold">
              {cityDef.label} · {cityDef.labelEn}
            </p>
            <div className="flex items-end gap-1 mt-0.5">
              <span className="text-6xl font-black text-white leading-none">{d.temp}</span>
              <span className="text-xl text-white/80 font-bold mb-1">°C</span>
            </div>
            <p className="text-white/90 text-sm font-bold mt-1">{info.desc}</p>
            <p className="text-white/50 text-[10px] mt-0.5">
              💨 {d.windspeed} km/h &nbsp;·&nbsp;
              最高 {today?.max ?? '—'}° / 最低 {today?.min ?? '—'}°
            </p>
          </div>
          <div className="text-7xl leading-none select-none"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}>
            {info.emoji}
          </div>
        </div>

        {/* ══ 時間別予報（横スクロール） ══ */}
        <div>
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-2">
            ⏱ 時間別予報
          </p>
          <div className="overflow-x-auto pb-1 -mx-1">
            <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
              {d.hourly.map((h, i) => {
                const isNow = i === 0;
                return (
                  <div key={i}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[54px] ${
                      isNow ? 'bg-white/30 ring-2 ring-white/60' : 'bg-white/10'
                    }`}>
                    <span className="text-[10px] text-white/70 font-bold">
                      {isNow ? 'Now' : h.time}
                    </span>
                    <span className="text-xl leading-none">{wi(h.code).emoji}</span>
                    <span className="text-xs font-black text-white">{h.temp}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 区切り */}
        <div className="border-t border-white/15" />

        {/* ══ 週間予報 ══ */}
        <div>
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-2">
            📅 週間予報
          </p>
          <div className="space-y-1">
            {d.daily.map((day, i) => {
              const isToday = i === 0;
              return (
                <div key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                    isToday ? 'bg-white/20' : 'bg-white/8'
                  }`}
                  style={{ background: isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }}>
                  {/* 曜日・日付 */}
                  <div className="w-16 flex-shrink-0">
                    <span className={`text-xs font-black ${isToday ? 'text-white' : 'text-white/70'}`}>
                      {isToday ? '今日' : `${day.wday}曜`}
                    </span>
                    <span className="text-[10px] text-white/40 ml-1">{day.date}</span>
                  </div>
                  {/* 天気アイコン */}
                  <span className="text-xl leading-none flex-shrink-0">{wi(day.code).emoji}</span>
                  {/* 天気説明 */}
                  <span className="text-[11px] text-white/60 flex-1 truncate">{wi(day.code).desc}</span>
                  {/* 気温バー */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs font-black text-blue-200">{day.min}°</span>
                    <span className="text-white/30 text-xs">—</span>
                    <span className="text-xs font-black text-orange-200">{day.max}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 更新時刻 */}
        <p className="text-white/25 text-[9px] text-right">
          {new Date(d.fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 更新 · Open-Meteo
        </p>

      </div>
    </div>
  );
}
