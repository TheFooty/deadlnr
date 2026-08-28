'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, X, Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { APP_THEMES } from '@/lib/types';

type PomodoroMode = 'work' | 'short' | 'long';

const MODE_CONFIG = {
  work:  { label: 'Focus',       defaultMin: 25, options: [15, 20, 25, 30, 45, 60] },
  short: { label: 'Short Break', defaultMin: 5,  options: [3, 5, 8, 10, 15] },
  long:  { label: 'Long Break',  defaultMin: 15, options: [10, 15, 20, 30] },
};

const STORAGE_KEY = 'deadlnr_pomodoro';

// Simple Web Audio ding (no file needed)
function playDing(ctx: AudioContext, freq = 880, dur = 0.35) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playCompletion(ctx: AudioContext) {
  // Three ascending notes
  playDing(ctx, 660, 0.3);
  setTimeout(() => playDing(ctx, 880, 0.3), 220);
  setTimeout(() => playDing(ctx, 1100, 0.45), 440);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PomodoroTimer() {
  const { theme } = useTheme();
  const themeColors = APP_THEMES[theme] || APP_THEMES.default;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [durations, setDurations] = useState({
    work: MODE_CONFIG.work.defaultMin,
    short: MODE_CONFIG.short.defaultMin,
    long: MODE_CONFIG.long.defaultMin,
  });
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.defaultMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0); // completed work sessions
  const [openSelect, setOpenSelect] = useState<PomodoroMode | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const justCompletedRef = useRef(false);

  // Persist state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.durations) setDurations(s.durations);
        if (s.sessions) setSessions(s.sessions);
        if (s.mode) {
          setMode(s.mode);
          setTimeLeft((s.timeLeft != null ? s.timeLeft : (s.durations?.[s.mode] ?? MODE_CONFIG[s.mode as PomodoroMode].defaultMin) * 60));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, durations, sessions, timeLeft }));
    } catch {}
  }, [mode, durations, sessions, timeLeft]);

  // Init AudioContext lazily on first user gesture
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleComplete = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    justCompletedRef.current = true;

    // Play sound
    if (audioCtxRef.current) {
      playCompletion(audioCtxRef.current);
    }

    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const labels = { work: 'Focus session complete! Time for a break.', short: 'Break over — back to work!', long: 'Long break done! Ready to focus?' };
      new Notification('Deadlnr Pomodoro', { body: labels[mode], icon: '/icon-192.png' });
    }

    // Auto-advance mode
    if (mode === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      const next: PomodoroMode = newSessions % 4 === 0 ? 'long' : 'short';
      setMode(next);
      setTimeLeft(durations[next] * 60);
    } else {
      setMode('work');
      setTimeLeft(durations.work * 60);
    }
  }, [mode, sessions, durations, stopTimer]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [isRunning, handleComplete, stopTimer]);

  const handleStart = () => {
    ensureAudio();
    // Request notification permission on first start
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(true);
    justCompletedRef.current = false;
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    justCompletedRef.current = false;
    setTimeLeft(durations[mode] * 60);
  };

  const handleModeChange = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode] * 60);
    setOpenSelect(null);
  };

  const handleDurationChange = (m: PomodoroMode, mins: number) => {
    const updated = { ...durations, [m]: mins };
    setDurations(updated);
    if (m === mode) setTimeLeft(mins * 60);
    setOpenSelect(null);
    setIsRunning(false);
  };

  const totalSeconds = durations[mode] * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const circumference = 2 * Math.PI * 42; // r=42
  const strokeDashoffset = circumference * (1 - progress);

  const modeColors: Record<PomodoroMode, string> = {
    work: themeColors.uiAccent,
    short: '#27a644',
    long: '#06b6d4',
  };
  const activeColor = modeColors[mode];

  return (
    <>
      {/* Floating Toggle Button — bottom-right, safe-area aware */}
      <button
        onClick={() => { setIsOpen((o) => !o); ensureAudio(); }}
        aria-label="Pomodoro Timer"
        className={`fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#191a1b]/90 text-white shadow-xl backdrop-blur-md
          active:scale-95 transition-all
          ${isRunning ? 'pr-3.5 pl-2.5 py-2' : 'h-12 w-12 justify-center'}
          sm:bottom-8 sm:right-6`}
        style={{
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: isRunning ? `0 0 0 2px ${activeColor}55, 0 4px 20px rgba(0,0,0,0.5)` : '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: isRunning ? `${activeColor}22` : 'transparent' }}
        >
          <Timer className="h-4 w-4" style={{ color: isRunning ? activeColor : '#8a8f98' }} />
        </span>
        {isRunning && (
          <span className="text-sm font-mono font-bold tabular-nums" style={{ color: activeColor }}>
            {formatTime(timeLeft)}
          </span>
        )}
      </button>

      {/* Timer Panel — slides up from bottom on mobile, appears as modal on desktop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/[0.1] p-6 shadow-2xl mx-0 sm:mx-4"
            style={{ backgroundColor: themeColors.card }}
          >
            {/* Handle bar (mobile) */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" style={{ color: activeColor }} />
                <span className="font-semibold text-white text-sm">Pomodoro Timer</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-black/30 p-1 gap-1 mb-6">
              {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
                  style={mode === m ? {
                    backgroundColor: `${modeColors[m]}22`,
                    color: modeColors[m],
                  } : { color: '#8a8f98' }}
                >
                  {MODE_CONFIG[m].label}
                </button>
              ))}
            </div>

            {/* Ring Timer */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
                  {/* Track */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                  {/* Progress */}
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={activeColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-mono font-bold tabular-nums text-white">
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                    {MODE_CONFIG[mode].label}
                  </span>
                </div>
              </div>

              {/* Session dots */}
              <div className="flex items-center gap-1.5 mt-4">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full transition-all"
                    style={{ backgroundColor: i < (sessions % 4) ? activeColor : 'rgba(255,255,255,0.12)' }}
                  />
                ))}
                <span className="ml-2 text-[11px] text-white/30 font-mono">
                  {sessions} done
                </span>
              </div>
            </div>

            {/* Duration Pickers */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => (
                <div key={m} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenSelect(openSelect === m ? null : m)}
                    className="w-full flex items-center justify-between rounded-lg border border-white/[0.1] bg-black/20 px-2.5 py-2 text-xs text-white/60 hover:border-white/20 transition-colors"
                  >
                    <span className="truncate">{durations[m]}m</span>
                    <ChevronDown className="h-3 w-3 shrink-0 ml-1 text-white/30" />
                  </button>
                  <p className="text-[10px] text-white/25 text-center mt-1">{MODE_CONFIG[m].label}</p>

                  {openSelect === m && (
                    <div className="absolute bottom-full mb-1 left-0 z-10 w-full rounded-lg border border-white/[0.12] shadow-xl overflow-hidden"
                      style={{ backgroundColor: themeColors.surface2 || '#1f2021' }}>
                      {MODE_CONFIG[m].options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleDurationChange(m, opt)}
                          className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.08]"
                          style={{ color: durations[m] === opt ? modeColors[m] : '#d0d6e0' }}
                        >
                          {opt} min
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={isRunning ? handlePause : handleStart}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-95"
                style={{ backgroundColor: activeColor }}
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRunning ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
