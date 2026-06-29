'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Phase {
  label: string;
  labelSub: string;
  duration: number; // seconds
  sizeFrom: number; // circle radius % (0-100)
  sizeTo:   number;
  color:    string;
}

const PHASES: Phase[] = [
  { label: 'はく',               labelSub: '口からゆっくり',   duration: 8, sizeFrom: 72, sizeTo: 42, color: '#6366f1' },
  { label: 'お腹をへこませてはく', labelSub: '腹筋を意識して',  duration: 8, sizeFrom: 42, sizeTo: 22, color: '#8b5cf6' },
  { label: '全部はく',            labelSub: '最後まで吐ききる', duration: 4, sizeFrom: 22, sizeTo: 12, color: '#a855f7' },
  { label: 'とめる',              labelSub: '息を止める',       duration: 3, sizeFrom: 12, sizeTo: 12, color: '#64748b' },
  { label: 'すう',                labelSub: '鼻からすばやく',   duration: 1, sizeFrom: 12, sizeTo: 72, color: '#10b981' },
];
const CYCLE = PHASES.reduce((s, p) => s + p.duration, 0); // 24s

const KCAL_PER_MIN = 3; // 軽いヨガ・腹式呼吸相当

export function BreathingTimer({ onMinutesChange }: { onMinutesChange: (mins: number) => void }) {
  const [running,    setRunning]    = useState(false);
  const [elapsed,   setElapsed]    = useState(0);   // total seconds since start (cumulative)
  const [totalSecs, setTotalSecs]  = useState(0);   // total practiced seconds today
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        setTotalSecs(t => {
          const next = t + 1;
          onMinutesChange(Math.floor(next / 60));
          return next;
        });
      }, 1000);
    } else {
      stop();
    }
    return stop;
  }, [running, stop, onMinutesChange]);

  const posInCycle = elapsed % CYCLE;

  // Determine current phase and progress within it
  let phaseIdx = 0;
  let phaseElapsed = 0;
  let acc = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (posInCycle < acc + PHASES[i].duration) {
      phaseIdx = i; phaseElapsed = posInCycle - acc; break;
    }
    acc += PHASES[i].duration;
  }
  const phase   = PHASES[phaseIdx];
  const phasePct = phase.duration > 0 ? phaseElapsed / phase.duration : 0;
  const radius  = phase.sizeFrom + (phase.sizeTo - phase.sizeFrom) * phasePct;

  // Ring progress (within current phase)
  const RING_R    = 100;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC * (1 - phasePct);

  const totalMins    = Math.floor(totalSecs / 60);
  const totalKcal    = totalMins * KCAL_PER_MIN;
  const cyclesDone   = Math.floor(elapsed / CYCLE);

  const handleReset = () => {
    stop(); setRunning(false); setElapsed(0); setTotalSecs(0);
    onMinutesChange(0);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌬️</span>
        <p className="text-sm font-black text-gray-800">腹式呼吸タイマー</p>
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">24秒サイクル</span>
        {totalKcal > 0 && (
          <span className="ml-auto text-xs font-black text-emerald-600">−{totalKcal} kcal</span>
        )}
      </div>

      {/* Circle animation */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-52 h-52 flex items-center justify-center">
          {/* Background track */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={RING_R} fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <circle cx="120" cy="120" r={RING_R} fill="none" stroke={phase.color}
              strokeWidth="6" strokeLinecap="round" strokeDasharray={RING_CIRC}
              strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
          </svg>

          {/* Breathing circle */}
          <div
            className="rounded-full flex flex-col items-center justify-center text-white font-black shadow-lg"
            style={{
              width:  `${radius * 1.6}px`,
              height: `${radius * 1.6}px`,
              background: `radial-gradient(circle at 40% 35%, ${phase.color}cc, ${phase.color})`,
              transition: `width ${phase.duration}s linear, height ${phase.duration}s linear, background 0.4s`,
              minWidth: '20px', minHeight: '20px',
            }}
          >
            {radius > 25 && (
              <>
                <span className="text-xs leading-tight text-center px-2">{phase.label}</span>
                {radius > 38 && <span className="text-[9px] opacity-70 leading-tight text-center px-2">{phase.labelSub}</span>}
              </>
            )}
          </div>
        </div>

        {/* Phase text (outside circle for small sizes) */}
        {radius <= 25 && (
          <div className="text-center">
            <p className="text-lg font-black" style={{ color: phase.color }}>{phase.label}</p>
            <p className="text-[11px] text-gray-400">{phase.labelSub}</p>
          </div>
        )}

        {/* Phase countdown */}
        <div className="text-center">
          <p className="text-2xl font-black tabular-nums" style={{ color: phase.color }}>
            {phase.duration - phaseElapsed}
            <span className="text-sm font-normal text-gray-400">s</span>
          </p>
          <p className="text-[10px] text-gray-400">{cyclesDone > 0 ? `${cyclesDone}サイクル完了` : '深呼吸で自律神経を整えます'}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[10px] text-gray-400">実施時間</p>
          <p className="text-sm font-black text-gray-800">{totalMins}<span className="text-[10px] font-normal">分</span></p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[10px] text-gray-400">消費</p>
          <p className="text-sm font-black text-emerald-600">{totalKcal}<span className="text-[10px] font-normal">kcal</span></p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[10px] text-gray-400">サイクル</p>
          <p className="text-sm font-black text-violet-600">{cyclesDone}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setRunning(r => !r)}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.98] ${
            running
              ? 'bg-amber-500 text-white'
              : 'bg-violet-600 text-white'
          }`}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-3 rounded-2xl font-black text-sm bg-gray-100 text-gray-500 active:scale-[0.98] transition-all"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
