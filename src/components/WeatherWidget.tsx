'use client';

import { useState, useEffect } from 'react';

// ── 型定義 ──────────────────────────────────────────────────────
interface DayForecast {
  date: string;
  label: string;
  emoji: string;
  desc: string;
  maxTemp: number;
  minTemp: number;
}

interface HourForecast {
  time: string;      // "HH:MM"
  dateStr: string;   // "YYYY-MM-DD"
  emoji: string;
  temp: number;
  apparent: number;
  rainProb: number;
  isNow: boolean;
  isPast: boolean;
}

// ── WMO コード → emoji / 説明 ────────────────────────────────────
function weatherInfo(code: number): { emoji: string; desc: string } {
  if (code === 0)  return { emoji: '☀️',  desc: '快晴'         };
  if (code <= 3)   return { emoji: '⛅',  desc: '晴れ〜曇り'   };
  if (code <= 48)  return { emoji: '🌫️', desc: '霧'           };
  if (code <= 55)  return { emoji: '🌦️', desc: '小雨'         };
  if (code <= 65)  return { emoji: '🌧️', desc: '雨'           };
  if (code <= 77)  return { emoji: '❄️',  desc: '雪'           };
  if (code <= 82)  return { emoji: '🌧️', desc: 'にわか雨'     };
  if (code <= 86)  return { emoji: '🌨️', desc: '雪のにわか降り' };
  if (code === 95) return { emoji: '⛈️', desc: '雷雨'         };
  return           { emoji: '⛈️', desc: '激しい雷雨' };
}

// 降水確率 → バーの色
function rainColor(p: number) {
  if (p >= 70) return 'bg-blue-500';
  if (p >= 40) return 'bg-blue-300';
  if (p >= 20) return 'bg-blue-200';
  return 'bg-gray-100';
}

const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;
const DEFAULT_CITY = '東京';

// ── メインコンポーネント ─────────────────────────────────────────
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
          `&timezone=Asia%2FTokyo&forecast_days=2`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json() as {
          daily: {
            time: string[];
            weathercode: number[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
          };
          hourly: {
            time: string[];                  // "YYYY-MM-DDTHH:00"
            temperature_2m: number[];
            apparent_temperature: number[];
            weathercode: number[];
            precipitation_probability: number[];
          };
        };

        // ── 日別 ──
        const dayList: DayForecast[] = data.daily.time.map((d, i) => {
          const { emoji, desc } = weatherInfo(data.daily.weathercode[i]);
          return {
            date:    d,
            label:   i === 0 ? '今日' : '明日',
            emoji,
            desc,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]),
            minTemp: Math.round(data.daily.temperature_2m_min[i]),
          };
        });

        // ── 時間別（現在〜翌日22:00 に絞る） ──
        const now     = new Date();
        const nowHour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        const hourList: HourForecast[] = data.hourly.time
          .map((t, i) => {
            const [dateStr, timeStr] = t.split('T');
            const hour = parseInt(timeStr.split(':')[0], 10);
            const { emoji } = weatherInfo(data.hourly.weathercode[i]);
            return {
              time:     `${String(hour).padStart(2, '0')}:00`,
              dateStr,
              emoji,
              temp:     Math.round(data.hourly.temperature_2m[i]),
              apparent: Math.round(data.hourly.apparent_temperature[i]),
              rainProb: data.hourly.precipitation_probability[i] ?? 0,
              isNow:    dateStr === todayStr && hour === nowHour,
              isPast:   dateStr === todayStr && hour < nowHour,
            };
          })
          // 今日の06:00以降 + 翌日22:00まで
          .filter(h => {
            if (h.dateStr === todayStr) return parseInt(h.time) >= 6;
            return parseInt(h.time) <= 22;
          })
          .slice(0, 36); // 最大36エントリ (今日18h + 翌日22h)

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
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(d => {
              const c = (d.address?.city || d.address?.town || d.address?.village || d.address?.county) as string | undefined;
              if (c) setCity(c);
            })
            .catch(() => {});
          fetchWeather(lat, lon);
        },
        () => fetchWeather(lat, lon),
        { timeout: 5000 }
      );
    } else {
      fetchWeather(lat, lon);
    }
  }, []);

  // ── ローディング / エラー ───────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-100 to-blue-100 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl animate-pulse">🌤️</span>
        <p className="text-xs text-sky-600 font-medium">天気予報を読み込み中...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🌤️</span>
        <div>
          <p className="text-xs font-bold text-sky-700">天気予報</p>
          <p className="text-[10px] text-sky-500">データを取得できませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl overflow-hidden">

      {/* ヘッダー + タブ切り替え */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-base">🌍</span>
        <p className="text-xs font-black text-sky-800">{city}の天気予報</p>
        <span className="ml-auto flex items-center gap-1 bg-sky-100 rounded-xl p-0.5">
          <button
            onClick={() => setView('daily')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              view === 'daily' ? 'bg-white text-sky-700 shadow-sm' : 'text-sky-500 hover:text-sky-700'
            }`}
          >今日・明日</button>
          <button
            onClick={() => setView('hourly')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              view === 'hourly' ? 'bg-white text-sky-700 shadow-sm' : 'text-sky-500 hover:text-sky-700'
            }`}
          >時間帯</button>
        </span>
        <span className="text-[9px] text-sky-300">Open-Meteo</span>
      </div>

      {/* ── 日別ビュー ── */}
      {view === 'daily' && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {days.map(day => (
            <div key={day.date} className="bg-white/80 rounded-xl px-3 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-3xl leading-none">{day.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-600">{day.label}</p>
                <p className="text-[10px] text-gray-400">{day.desc}</p>
                <p className="text-sm font-black text-gray-800 mt-0.5">
                  <span className="text-red-500">{day.maxTemp}°</span>
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
        <div className="pb-3">
          {/* 凡例 */}
          <div className="px-4 pb-1.5 flex items-center gap-3 text-[9px] text-sky-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>&nbsp;雨70%+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block"/>&nbsp;雨40%+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-200 inline-block"/>&nbsp;雨20%+</span>
          </div>

          {/* 水平スクロール */}
          <div className="overflow-x-auto px-3 pb-1">
            <div className="flex gap-1.5 min-w-max">
              {hours.map((h, i) => {
                const isTomorrow = h.dateStr !== days[0]?.date;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl min-w-[3.5rem] transition-all ${
                      h.isNow
                        ? 'bg-yellow-400/90 shadow-md ring-2 ring-yellow-300'
                        : h.isPast
                        ? 'bg-white/30 opacity-40'
                        : isTomorrow
                        ? 'bg-indigo-50/80'
                        : 'bg-white/70'
                    }`}
                  >
                    {/* 日付区切りラベル */}
                    {isTomorrow && i > 0 && hours[i - 1].dateStr !== h.dateStr && (
                      <span className="text-[8px] text-indigo-400 font-bold -mb-0.5">明日</span>
                    )}

                    {/* 時刻 */}
                    <p className={`text-[9px] font-black leading-none ${
                      h.isNow ? 'text-yellow-900' : h.isPast ? 'text-gray-400' : 'text-sky-700'
                    }`}>
                      {h.isNow ? 'NOW' : h.time}
                    </p>

                    {/* 天気アイコン */}
                    <span className="text-xl leading-none">{h.emoji}</span>

                    {/* 気温 */}
                    <p className={`text-[10px] font-black leading-none ${
                      h.isNow ? 'text-yellow-900' : 'text-gray-700'
                    }`}>{h.temp}°</p>

                    {/* 体感気温（サブ） */}
                    <p className="text-[8px] text-gray-400 leading-none">{h.apparent}°</p>

                    {/* 降水確率バー */}
                    <div className="w-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${rainColor(h.rainProb)}`}
                        style={{ width: `${h.rainProb}%` }}
                      />
                    </div>
                    <p className={`text-[8px] leading-none ${h.rainProb >= 50 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      {h.rainProb}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 今日のウォーキング天気アドバイス */}
          {(() => {
            const walkHour = hours.find(h => !h.isPast && h.rainProb < 30 && parseInt(h.time) >= 8 && parseInt(h.time) <= 21);
            if (!walkHour) return null;
            return (
              <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-sm">🚶</span>
                <p className="text-[10px] text-green-700 font-semibold">
                  <span className="font-black">{walkHour.time}</span> 頃がウォーキングのベストタイム！（雨{walkHour.rainProb}%）
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
