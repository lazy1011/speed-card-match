'use client';

import { useEffect, useState } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const MESSAGES = [
  { text: 'Waking up the server…', sub: 'Free tier servers sleep when idle' },
  { text: 'Loading game engine…', sub: 'Setting up card decks and rooms' },
  { text: 'Almost ready…', sub: 'Establishing WebSocket connection' },
  { text: 'Hang tight!', sub: 'Should connect any second now' },
];

interface FloatingSymbol {
  id: number;
  suit: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
}

export default function WakeUpLoader() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  // Cycle status message every 6s
  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 6000);
    return () => clearInterval(t);
  }, []);

  // Generate floating symbols once on mount
  useEffect(() => {
    const colors = ['text-red-400', 'text-slate-300', 'text-indigo-400', 'text-red-300'];
    setSymbols(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        suit: SUITS[i % 4],
        left: `${8 + i * 7.5}%`,
        delay: `${(i * 0.38).toFixed(2)}s`,
        duration: `${2.0 + (i % 4) * 0.4}s`,
        size: i % 3 === 0 ? 'text-4xl' : i % 3 === 1 ? 'text-2xl' : 'text-xl',
        color: colors[i % 4],
      }))
    );
  }, []);

  const msg = MESSAGES[msgIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 overflow-hidden">
      {/* Floating card suits */}
      <div className="absolute inset-0 pointer-events-none">
        {symbols.map((s) => (
          <span
            key={s.id}
            className={`absolute bottom-10 ${s.size} ${s.color} opacity-90 animate-float-up select-none`}
            style={{ left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
          >
            {s.suit}
          </span>
        ))}
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 rounded-3xl bg-slate-800/70 backdrop-blur-md ring-1 ring-white/10 shadow-2xl max-w-sm w-full mx-4">
        {/* Spinning ring */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30" />
          <div
            className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-wake-spin"
          />
          <span className="text-3xl">⚡</span>
        </div>

        {/* Status text — fades when message changes */}
        <div key={msgIndex} className="text-center animate-fade-in-up">
          <p className="text-white font-bold text-lg">{msg.text}</p>
          <p className="text-slate-400 text-sm mt-1">{msg.sub}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full animate-wake-progress" />
        </div>

        <p className="text-slate-500 text-xs text-center">
          Speed Card Match · Free hosting wakes up in ~30s
        </p>
      </div>
    </div>
  );
}
