'use client';

import { useEffect, useRef, useState } from 'react';
import CardDisplay from '@/components/CardDisplay';
import { Card, CardValue } from '@/types/game';

interface PileDisplayProps {
  pileSize: number;
  lastPlay: { playerName: string; playedById: string | null; claimedRank: CardValue; claimedCount: number } | null;
  bluffWindowOpen: boolean;
  revealedCards: { cards: Card[]; claimedRank: CardValue; callerWins: boolean; loserName: string } | null;
  pileAnim: 'receive' | 'take' | null;
}

function rankLabel(v: CardValue): string {
  const m: Record<number, string> = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
  return m[v] ?? String(v);
}

export default function PileDisplay({
  pileSize, lastPlay, bluffWindowOpen, revealedCards, pileAnim,
}: PileDisplayProps) {
  const stackCards = Math.min(pileSize, 6);
  const [flipCount, setFlipCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const prevRevealRef = useRef<typeof revealedCards>(null);

  useEffect(() => {
    const wasNull = prevRevealRef.current === null;
    prevRevealRef.current = revealedCards;

    if (!revealedCards) {
      setFlipCount(0);
      setShowResult(false);
      return;
    }
    if (!wasNull) return; // already animating or done

    // New reveal — reset and animate
    setFlipCount(0);
    setShowResult(false);
    const total = revealedCards.cards.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < total; i++) {
      timers.push(setTimeout(() => setFlipCount(i + 1), 180 + i * 380));
    }
    const resultTimer = setTimeout(() => setShowResult(true), 180 + total * 380 + 250);
    timers.push(resultTimer);
    return () => timers.forEach(clearTimeout);
  }, [revealedCards]);

  const pileAnimClass =
    pileAnim === 'receive' ? 'animate-pile-receive' :
    pileAnim === 'take' ? 'animate-pile-take' : '';

  return (
    <div className="rounded-2xl border border-slate-700/40 p-5 flex flex-col items-center gap-4" style={{ background: '#0d1a10' }}>
      <div className="flex items-center justify-between w-full">
        <h3 className="text-white font-black text-base">Pile</h3>
        {bluffWindowOpen && (
          <span className="text-xs font-bold text-rose-400 animate-pulse-fast px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-900/20">
            Show window open
          </span>
        )}
      </div>

      {/* Stacked face-down cards */}
      <div
        className={`relative flex items-center justify-center ${pileAnimClass}`}
        style={{ height: 112, width: Math.max(80, 80 + (stackCards - 1) * 8) }}
      >
        {stackCards === 0 ? (
          <div className="w-20 h-28 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs font-bold">
            Empty
          </div>
        ) : (
          Array.from({ length: stackCards }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: i * 8, top: i * 2, zIndex: i }}
            >
              <CardDisplay value={2} suit="spades" size="sm" faceDown />
            </div>
          ))
        )}
      </div>

      {pileSize > 0 && (
        <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-300 text-sm font-bold" style={{ background: '#162218' }}>
          {pileSize} card{pileSize !== 1 ? 's' : ''} in pile
        </span>
      )}

      {/* Last play info */}
      {lastPlay && !revealedCards && (
        <div className="text-center rounded-xl px-4 py-2 border border-slate-700/30 w-full" style={{ background: '#162218' }}>
          <p className="text-slate-400 text-xs font-semibold mb-0.5">Last play</p>
          <p className="text-white font-bold text-sm">
            {lastPlay.playerName} — {lastPlay.claimedCount}× <span className="text-yellow-400">{rankLabel(lastPlay.claimedRank)}</span>
          </p>
        </div>
      )}

      {/* Revealed cards with flip animation */}
      {revealedCards && (
        <div className="w-full rounded-xl p-3 border border-slate-700/30" style={{ background: '#162218' }}>
          <p className="text-center text-xs text-slate-400 font-semibold mb-3">
            {flipCount < revealedCards.cards.length ? '🃏 Revealing…' : 'Cards revealed'}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {revealedCards.cards.map((c, i) => {
              const flipped = i < flipCount;
              return (
                <div key={i} style={{ perspective: 600, width: 64, height: 96 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Back (face-down) */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden' }}>
                      <CardDisplay value={2} suit="spades" size="sm" faceDown />
                    </div>
                    {/* Front (face-up) */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <CardDisplay value={c.value} suit={c.suit} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {showResult && (
            <p className="text-center text-sm mt-3 font-black animate-fade-in-up">
              {revealedCards.callerWins ? (
                <span className="text-rose-400">🎯 BLUFF! Claimed {rankLabel(revealedCards.claimedRank)}s</span>
              ) : (
                <span className="text-emerald-400">✅ LEGIT — all {rankLabel(revealedCards.claimedRank)}s</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
