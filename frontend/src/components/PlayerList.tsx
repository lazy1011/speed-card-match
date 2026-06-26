'use client';

import { Player } from '@/types/game';
import { avatarFor } from '@/utils/avatars';

interface PlayerListProps {
  players: Player[];
  currentPlayerName: string | null;
}

export default function PlayerList({ players, currentPlayerName }: PlayerListProps) {
  return (
    <div className="rounded-2xl bg-slate-800/80 ring-1 ring-white/10 shadow-xl p-6">
      <h2 className="text-lg font-bold mb-4 text-white tracking-tight">
        Players <span className="text-slate-400 font-normal">({players.length})</span>
      </h2>
      <div className="space-y-2">
        {players.map((player) => {
          const isTurn = player.name === currentPlayerName;
          return (
            <div
              key={player.id}
              className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                isTurn
                  ? 'bg-amber-400/15 ring-2 ring-amber-400'
                  : 'bg-slate-900/50 ring-1 ring-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ring-2 ${
                    isTurn ? 'bg-amber-400/20 ring-amber-400' : 'bg-slate-700/60 ring-white/10'
                  }`}
                >
                  {avatarFor(player.name, player.turnOrder)}
                </span>
                <span className="font-semibold text-white">{player.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    player.isActive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {player.cardCount ?? 0} 🎴
                </span>
                {isTurn && (
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-1 rounded-full">
                    TURN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
