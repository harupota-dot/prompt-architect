'use client';

import { useState, useEffect } from 'react';

interface DayForecast {
  date: string;
  label: string; // '今日' | '明日'
  emoji: string;
  desc: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

// WMO Weather interpretation codes → emoji + description
function weatherInfo(code: number): { emoji: string; desc: string } {
  if (code === 0)               return { emoji: '☀️', desc: '快晴' };
  if (code <= 3)                return { emoji: '⛅', desc: '晴れ〜曇り' };
  if (code <= 48)               return { emoji: '🌫️', desc: '霧' };
  if (code <= 55)               return { emoji: '🌦️', desc: '小雨' };
  if (code <= 65)               return { emoji: '🌧️', desc: '雨' };
  if (code <= 77)               return { emoji: '❄️', desc: '雪' };
  if (code <= 82)               return { emoji: '🌧️', desc: 'にわか雨' };
  if (code <= 86)               return { emoji: '🌨️', desc: '雪のにわか降り' };
  if (code === 95)              return { emoji: '⛈️', desc: '雷雨' };
  if (code >= 96)               return { emoji: '⛈️', desc: '激しい雷雨' };
  return { emoji: '🌡️', desc: '不明' };
}

// Default: Tokyo. Will use geolocation if available.
const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;
const DEFAULT_CITY = '東京';

export function WeatherWidget() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [city, setCity]         = useState(DEFAULT_CITY);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    let lat = DEFAULT_LAT, lon = DEFAULT_LON;

    const fetchWeather = async (la: number, lo: number) => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${la}&longitude=${lo}` +
          `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
          `&timezone=Asia%2FTokyo&forecast_days=2`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json() as {
          daily: {
            time: string[];
            weathercode: number[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
          };
        };
        const labels = ['今日', '明日'];
        const days: DayForecast[] = data.daily.time.map((d, i) => {
          const { emoji, desc } = weatherInfo(data.daily.weathercode[i]);
          return {
            date:    d,
            label:   labels[i] ?? d,
            emoji,
            desc,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]),
            minTemp: Math.round(data.daily.temperature_2m_min[i]),
            code:    data.daily.weathercode[i],
          };
        });
        setForecast(days);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    // Try geolocation for precise weather
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          // Reverse geocode city name (best-effort — ignore failure)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(d => {
              const c = (d.address?.city || d.address?.town || d.address?.village || d.address?.county) as string | undefined;
              if (c) setCity(c);
            })
            .catch(() => {/* ignore */});
          fetchWeather(lat, lon);
        },
        () => fetchWeather(lat, lon), // fallback to Tokyo on denial
        { timeout: 5000 }
      );
    } else {
      fetchWeather(lat, lon);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-100 to-blue-100 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl animate-pulse">🌤️</span>
        <p className="text-xs text-sky-600 font-medium">天気予報を読み込み中...</p>
      </div>
    );
  }

  if (error || forecast.length === 0) {
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
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">🌍</span>
        <p className="text-xs font-black text-sky-800">{city}の天気予報</p>
        <span className="ml-auto text-[9px] text-sky-400">Open-Meteo</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {forecast.map(day => (
          <div
            key={day.date}
            className="bg-white/70 rounded-xl px-3 py-2.5 flex items-center gap-3"
          >
            <span className="text-2xl leading-none">{day.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-700">{day.label}</p>
              <p className="text-[10px] text-gray-500">{day.desc}</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                <span className="text-red-500">{day.maxTemp}°</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-blue-500">{day.minTemp}°</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
