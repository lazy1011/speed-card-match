'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/types/game';
import { cardBackUrl } from '@/utils/cardUtils';
import CardDisplay from './CardDisplay';

interface StackDisplayProps {
  stackSize: number;
  recentCard?: Card | null;
  claimActive?: boolean; // Claim race is open → pulse/glow the felt
}

export default function StackDisplay({ stackSize, recentCard, claimActive }: StackDisplayProps) {
  // Bump a key every time a new card is drawn so the CSS animation re-fires.
  const [dealKey, setDealKey] = useState(0);
  const [glow, setGlow] = useState(false);
  const prevStackSize = useRef(stackSize);

  useEffect(() => {
    if (recentCard) setDealKey((k) => k + 1);
  }, [recentCard]);

  useEffect(() => {
    // Stack dropped to 0 → it was just claimed. Flash the glow.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevStackSize.current > 0 && stackSize === 0) {
      setGlow(true);
      timer = setTimeout(() => setGlow(false), 700);
    }
    prevStackSize.current = stackSize;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [stackSize]);

  // Faint face-down pile behind the top card; depth grows with the stack.
  const pileDepth = Math.min(Math.max(stackSize - 1, 0), 4);

  return (
    <div
      className={`relative rounded-2xl shadow-xl p-8 min-h-64 flex flex-col items-center justify-center
        bg-gradient-to-b from-emerald-700 to-emerald-900 ring-1 ring-emerald-500/30
        ${glow ? 'animate-stack-glow' : ''}
        ${claimActive ? 'ring-4 ring-amber-300 animate-pulse-fast' : ''}
      `}
    >
      <h3 className="text-emerald-100 text-xs font-bold tracking-[0.3em] mb-4">THE STACK</h3>

      {claimActive && (
        <span className="absolute top-3 right-3 text-xs font-bold text-slate-900 bg-amber-300 px-2 py-1 rounded-full animate-bounce">
          CLAIM NOW!
        </span>
      )}

      <div className="relative w-32 h-44 mb-4">
        {/* Stacked pile of face-down cards behind the top card */}
        {Array.from({ length: pileDepth }).map((_, i) => (
          <img
            key={i}
            src={cardBackUrl()}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute w-32 h-44 rounded-lg shadow-md select-none"
            style={{ top: -(i + 1) * 3, left: (i + 1) * 3, opacity: 0.85 }}
          />
        ))}

        {/* Top card: real face, dealt + flipped in */}
        {recentCard ? (
          <div key={dealKey} className="absolute inset-0 animate-card-deal">
            <div className="animate-card-flip">
              <CardDisplay value={recentCard.value} suit={recentCard.suit} size="lg" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-emerald-500/50 text-emerald-200/70 text-sm">
            Empty
          </div>
        )}
      </div>

      <p className="text-white text-2xl font-extrabold">{stackSize}</p>
      <p className="text-emerald-200 text-xs tracking-wider">cards on table</p>
    </div>
  );
}
