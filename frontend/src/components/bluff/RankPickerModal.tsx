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

// Inline panel — NOT a full-screen modal — so the hand stays visible below
export default function RankPickerModal({ starterName, pileTransfer, onPick }: RankPickerModalProps) {
  return (
    <div className="rounded-2xl border-2 border-emerald-500/60 shadow-xl p-5 animate-fade-in-up"
      style={{ background: '#0a1f12' }}>

      {pileTransfer && (
        <div className={`mb-3 rounded-xl p-2.5 text-center text-sm font-bold border ${
          pileTransfer.callerWins
            ? 'bg-rose-900/30 border-rose-600/40 text-rose-300'
            : 'bg-amber-900/30 border-amber-600/40 text-amber-300'
        }`}>
          {pileTransfer.callerWins ? '🎯 Bluff caught! ' : '✅ Legit play! '}
          <span className="text-white">{pileTransfer.loserName}</span> took {pileTransfer.cards} cards.
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🎴</div>
        <div>
          <h2 className="text-white font-extrabold text-base leading-tight">
            {starterName}, pick the series rank
          </h2>
          <p className="text-emerald-400/70 text-xs mt-0.5">
            Check your hand below — everyone must claim this rank
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {RANKS.map((r) => (
          <button
            key={r.value}
            onClick={() => onPick(r.value)}
            className="py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-600 border border-emerald-700/40 hover:border-emerald-400 active:scale-95 text-white font-extrabold text-base transition-all"
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
