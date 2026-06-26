'use client';

import { cardBackUrl } from '@/utils/cardUtils';

/**
 * Full-screen overlay shown briefly when the game starts: a stack of card backs
 * shuffling. Purely decorative.
 */
export default function ShuffleOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="relative h-44 w-32 mb-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <img
            key={i}
            src={cardBackUrl()}
            alt=""
            aria-hidden
            draggable={false}
            className={`absolute inset-0 h-44 w-32 rounded-xl shadow-2xl select-none ${
              i % 2 === 0 ? 'animate-shuffle-left' : 'animate-shuffle-right'
            }`}
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      <p className="text-2xl font-extrabold tracking-widest text-white animate-pulse">
        SHUFFLING…
      </p>
    </div>
  );
}
