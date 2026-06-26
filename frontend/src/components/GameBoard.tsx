'use client';

import { useEffect, useState } from 'react';

interface GameBoardProps {
  currentPlayerName: string | null;
  gameStarted: boolean;
  roomCode: string | null;
  onDrawCard: () => void;
  onClaimStack: () => void;
  canDraw: boolean;
  canClaim: boolean;
  claimEndsAt: number | null;
  isCurrentPlayer: boolean;
}

export default function GameBoard({
  currentPlayerName,
  gameStarted,
  roomCode,
  onDrawCard,
  onClaimStack,
  canDraw,
  canClaim,
  claimEndsAt,
  isCurrentPlayer,
}: GameBoardProps) {
  // Live countdown (seconds remaining) for the claim window.
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!claimEndsAt) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, (claimEndsAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [claimEndsAt]);

  return (
    <div className="rounded-2xl bg-slate-800/80 ring-1 ring-white/10 shadow-xl p-6 backdrop-blur">
      <div className="mb-5 pb-5 border-b border-white/10">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">⚡ Speed Card Match</h1>
        {roomCode && (
          <p className="text-sm text-slate-400 mt-1">
            Room <span className="font-mono font-semibold text-emerald-400">{roomCode}</span>
          </p>
        )}
      </div>

      {gameStarted && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider text-slate-400">Current Turn</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{currentPlayerName ?? '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDrawCard}
              disabled={!canDraw || !isCurrentPlayer || canClaim}
              className={`
                px-6 py-4 rounded-xl font-bold text-white transition-all
                ${
                  canDraw && isCurrentPlayer && !canClaim
                    ? 'bg-gradient-to-b from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-blue-900/40 active:scale-95 cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              🂠 Draw Card
            </button>

            <button
              onClick={onClaimStack}
              className={`
                relative overflow-hidden px-6 py-4 rounded-xl font-bold text-white transition-all active:scale-95 cursor-pointer
                ${
                  canClaim
                    ? 'bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-red-900/40 animate-pulse-fast ring-2 ring-amber-300'
                    : 'bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
                }
              `}
            >
              <span className="relative z-10">
                🎯 CLAIM!{canClaim && secondsLeft > 0 ? ` ${secondsLeft.toFixed(1)}s` : ''}
              </span>
              {/* Countdown bar drains across the button while the race is open */}
              {canClaim && claimEndsAt && (
                <span
                  key={claimEndsAt}
                  className="absolute bottom-0 left-0 h-1.5 bg-amber-300 animate-countdown-bar"
                  style={{ animationDuration: `${Math.max(0, (claimEndsAt - Date.now()) / 1000)}s` }}
                />
              )}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            {canClaim
              ? '⚡ MATCH! First to tap CLAIM wins the stack — but a wrong tap costs you a card!'
              : isCurrentPlayer
              ? 'Your turn — draw a card.'
              : 'Watch for a match, then race to claim. Careful: wrong claims are penalized.'}
          </p>
        </div>
      )}
    </div>
  );
}
