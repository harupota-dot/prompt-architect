'use client';

import { useState, useEffect } from 'react';

interface DayForecast {
  date: string; label: string; emoji: string; desc: string;
  maxTemp: number; minTemp: number;
}
interface HourForecast {
  time: string; dateStr: string; emoji: string;
  temp: number; apparent: number; rainProb: number;
  isNow: boolean; isPast: boolean;
}

function weatherInfo(code: number): { emoji: string; desc: string } {
  if (code === 0)  return { emoji: '☀️',  desc: '快晴'         };
  if (code <= 3)   return { emoji: '⛅',  desc: '晴れ〜曇り'   };
  if (code <= 48)  return { emoji: '🌫️', desc: '霧'           };
  if (code <= 55)  return { emoji: '🌦️', desc: '小雨'         };
  if (code <= 65)  return { emoji: '🌧️', desc: '雨'           };
  if (code <= 77)  return { emoji: '❄️',  desc: '雪'           };
  if (code <= 82)  return { emoji: '🌧️', desc: 'にわか雨'     };
  if (code <= 86)  return { emoji: '🌨️', desc: '雪'           };
  if (code === 95) return { emoji: '⛈️', desc: '雷雨'         };
  return                  { emoji: '⛈️', desc: '激しい雷雨'   };
}

function rainColor(p: number) {
  if (p >= 70) return 'bg-blue-500';
  if (p >= 40) return 'bg-blue-300';
  if (p >= 20) return 'bg-blue-200';
  return 'bg-gray-100';
}

// sky gradient by weather code
function skyGradient(code: number): string {
  if (code === 0)  return 'from-sky-400 via-blue-400 to-indigo-500';
  if (code <= 3)   return 'from-sky-300 via-slate-400 to-blue-500';
  if (code <= 48)  return 'from-slate-400 via-gray-400 to-slate-500';
  if (code <= 65)  return 'from-slate-500 via-blue-500 to-indigo-600';
  if (code <= 77)  return 'from-blue-200 via-slate-300 to-indigo-300';
  return                  'from-indigo-500 via-purple-500 to-slate-600';
}

const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;
const DEFAULT_CITY = '東京';

export function WeatherWidget() {
  const [days,    setDays]    = useState<DayForecast[]>([]);
  const [hours,   setHours]   = useState<HourForecast[]>([]);
  const [city,    setCity]    = useState(DEFAULT_CITY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [view,    setView]    = useState<'daily' | 'hourly'>('daily');

  useEffect(() => {
    let lat = DEFAULT_LAT, lon = DEFAULT_LON;

    const fetchWeather = async (la: number, lo: number) => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${la}&longitude=${lo}` +
          `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
          `&hourly=temperature_2m,apparent_temperature,weathercode,precipitation_probability` +
          `&current=temperature_2m,apparent_temperature,weathercode,precipitation_probability` +
          `&timezone=Asia%2FTokyo&forecast_days=2`;

        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json() as {
          current?: { temperature_2m: number; apparent_temperature: number; weathercode: number };
          daily: { time: string[]; weathercode: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
          hourly: { time: string[]; temperature_2m: number[]; apparent_temperature: number[]; weathercode: number[]; precipitation_probability: number[] };
        };

        const dayList: DayForecast[] = data.daily.time.map((d, i) => {
          const { emoji, desc } = weatherInfo(data.daily.weathercode[i]);
          return { date: d, label: i === 0 ? '今日' : '明日', emoji, desc,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]),
            minTemp: Math.round(data.daily.temperature_2m_min[i]) };
        });

        const now      = new Date();
        const nowHour  = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        const hourList: HourForecast[] = data.hourly.time
          .map((t, i) => {
            const [dateStr, timeStr] = t.split('T');
            const hour = parseInt(timeStr, 10);
            const { emoji } = weatherInfo(data.hourly.weathercode[i]);
            return { time: `${String(hour).padStart(2,'0')}:00`, dateStr, emoji,
              temp:     Math.round(data.hourly.temperature_2m[i]),
              apparent: Math.round(data.hourly.apparent_temperature[i]),
              rainProb: data.hourly.precipitation_probability[i] ?? 0,
              isNow:    dateStr === todayStr && hour === nowHour,
              isPast:   dateStr === todayStr && hour < nowHour };
          })
          .filter(h => {
            if (h.dateStr === todayStr) return parseInt(h.time) >= 6;
            return parseInt(h.time) <= 22;
          })
          .slice(0, 36);

        setDays(dayList);
        setHours(hourList);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          lat = pos.coords.latitude; lon = pos.coords.longitude;
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(d => {
              const c = (d.address?.city || d.address?.town || d.address?.village || d.address?.county) as string | undefined;
              if (c) setCity(c);
            }).catch(() => {});
          fetchWeather(lat, lon);
        },
        () => fetchWeather(lat, lon),
        { timeout: 5000 }
      );
    } else {
      fetchWeather(lat, lon);
    }
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-500 p-5 text-white text-center animate-pulse">
        <p className="text-4xl mb-2">🌤️</p>
        <p className="text-sm font-bold opacity-70">天気予報を読み込み中...</p>
      </div>
    );
  }
  if (error || days.length === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-sky-300 to-blue-400 p-5 text-white text-center">
        <p className="text-4xl mb-1">🌤️</p>
        <p className="text-sm font-bold opacity-80">天気予報</p>
        <p className="text-xs opacity-60">取得できませんでした</p>
      </div>
    );
  }

  const today = days[0];
  const nowHour = hours.find(h => h.isNow) ?? hours.find(h => !h.isPast);
  const currentTemp = nowHour?.temp ?? today.maxTemp;
  const currentEmoji = nowHour?.emoji ?? today.emoji;
  const gradient = skyGradient(0); // use blue sky as base

  return (
    <div className="rounded-3xl overflow-hidden shadow-lg">

      {/* ── ヒーローパネル ── */}
      <div className={`bg-gradient-to-br ${gradient} px-5 pt-6 pb-4 text-white`}>
        {/* 都市 + タブ */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold opacity-70 flex items-center gap-1">
              <span>📍</span>{city}
            </p>
            <p className="text-[10px] opacity-50 mt-0.5">
              {new Date().toLocaleDateString('ja-JP', { month:'long', day:'numeric', weekday:'short' })}
            </p>
          </div>
          <div className="flex gap-1 bg-white/20 p-0.5 rounded-xl backdrop-blur-sm">
            <button onClick={() => setView('daily')}
              className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                view === 'daily' ? 'bg-white/90 text-sky-700' : 'text-white/80'
              }`}>日別</button>
            <button onClick={() => setView('hourly')}
              className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                view === 'hourly' ? 'bg-white/90 text-sky-700' : 'text-white/80'
              }`}>時間別</button>
          </div>
        </div>

        {/* 現在気温 BIG */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-end gap-2 leading-none">
              <span className="text-8xl font-black leading-none tracking-tight">{currentTemp}</span>
              <span className="text-3xl font-bold opacity-70 mb-2">°C</span>
            </div>
            <p className="text-sm font-bold opacity-90 mt-1">{today.desc}</p>
            {nowHour && (
              <p className="text-xs opacity-60 mt-0.5">体感 {nowHour.apparent}°C</p>
            )}
          </div>
          <span className="text-7xl leading-none drop-shadow-lg">{currentEmoji}</span>
        </div>

        {/* 今日の最高・最低 */}
        <div className="flex items-center gap-3 mt-4 text-sm font-bold">
          <span className="opacity-80">↑ <span className="text-orange-300">{today.maxTemp}°</span></span>
          <span className="opacity-80">↓ <span className="text-sky-200">{today.minTemp}°</span></span>
          {nowHour && (
            <span className="opacity-70 text-xs ml-auto">
              🌂 {nowHour.rainProb}%
            </span>
          )}
        </div>
      </div>

      {/* ── 日別ビュー ── */}
      {view === 'daily' && (
        <div className="bg-white px-4 py-4 grid grid-cols-2 gap-3">
          {days.map(day => (
            <div key={day.date}
              className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <span className="text-3xl">{day.emoji}</span>
              <div>
                <p className="text-xs font-black text-gray-700">{day.label}</p>
                <p className="text-[10px] text-gray-400">{day.desc}</p>
                <p className="text-sm font-black mt-0.5">
                  <span className="text-orange-500">{day.maxTemp}°</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="text-blue-500">{day.minTemp}°</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 時間別ビュー ── */}
      {view === 'hourly' && (
        <div className="bg-white py-3">
          <div className="overflow-x-auto px-3 pb-1">
            <div className="flex gap-2 min-w-max">
              {hours.map((h, i) => {
                const isTomorrow = h.dateStr !== days[0]?.date;
                return (
                  <div key={i}
                    className={`flex flex-col items-center gap-1 px-2.5 py-2.5 rounded-2xl min-w-[3.8rem] ${
                      h.isNow  ? 'bg-yellow-400 shadow-md'
                      : h.isPast ? 'bg-gray-50 opacity-40'
                      : isTomorrow ? 'bg-indigo-50'
                      : 'bg-gray-50'
                    }`}>
                    {isTomorrow && i > 0 && hours[i-1].dateStr !== h.dateStr && (
                      <span className="text-[8px] text-indigo-400 font-bold -mb-0.5">明日</span>
                    )}
                    <p className={`text-[9px] font-black ${h.isNow ? 'text-yellow-900' : 'text-gray-500'}`}>
                      {h.isNow ? 'NOW' : h.time}
                    </p>
                    <span className="text-xl">{h.emoji}</span>
                    <p className={`text-sm font-black ${h.isNow ? 'text-yellow-900' : 'text-gray-800'}`}>
                      {h.temp}°
                    </p>
                    <p className="text-[9px] text-gray-400">{h.apparent}°</p>
                    <div className="w-8 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${rainColor(h.rainProb)}`}
                        style={{ width: `${h.rainProb}%` }} />
                    </div>
                    <p className={`text-[9px] font-bold ${h.rainProb >= 50 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {h.rainProb}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best walk time */}
          {(() => {
            const w = hours.find(h => !h.isPast && h.rainProb < 30 && parseInt(h.time) >= 8 && parseInt(h.time) <= 21);
            if (!w) return null;
            return (
              <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-base">🚶</span>
                <p className="text-xs text-emerald-700 font-semibold">
                  <span className="font-black">{w.time}</span> 頃がウォーキングのベストタイム（雨 {w.rainProb}%）
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
