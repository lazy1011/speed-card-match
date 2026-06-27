'use client';

import { CardValue } from '@/types/game';

const RANKS: { value: CardValue; label: string }[] = [
  { value: 14, label: 'A' }, { value: 13, label: 'K' }, { value: 12, label: 'Q' },
  { value: 11, label: 'J' }, { value: 10, label: '10' }, { value: 9, label: '9' },
  { value: 8, label: '8' }, { value: 7, label: '7' }, { value: 6, label: '6' },
  { value: 5, label: '5' }, { value: 4, label: '4' }, { value: 3, label: '3' },
  { value: 2, label: '2' },
];

interface RankPickerModalProps {
  starterName: string;
  pileTransfer?: { loserName: string; cards: number; callerWins: boolean } | null;
  onPick: (rank: CardValue) => void;
}

export default function RankPickerModal({ starterName, pileTransfer, onPick }: RankPickerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#0d2018] border border-emerald-900/60 shadow-2xl p-6 animate-fade-in-up">

        {/* Show pile outcome at top so user sees it inside the modal */}
        {pileTransfer && (
          <div className={`mb-4 rounded-2xl p-3 text-center text-sm font-bold border ${
            pileTransfer.callerWins
              ? 'bg-rose-900/30 border-rose-600/40 text-rose-300'
              : 'bg-amber-900/30 border-amber-600/40 text-amber-300'
          }`}>
            {pileTransfer.callerWins ? '🎯 Bluff caught! ' : '✅ Legit play! '}
            <span className="text-white">{pileTransfer.loserName}</span> took {pileTransfer.cards} cards.
          </div>
        )}

        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🎴</div>
          <h2 className="text-white font-extrabold text-xl">{starterName}, pick the rank</h2>
          <p className="text-emerald-400/70 text-sm mt-1">All players must claim this rank this series</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {RANKS.map((r) => (
            <button
              key={r.value}
              onClick={() => onPick(r.value)}
              className="py-3 rounded-xl bg-emerald-900/50 hover:bg-emerald-600 border border-emerald-700/40 hover:border-emerald-400 active:scale-95 text-white font-extrabold text-xl transition-all"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
