'use client';

import { CardValue } from '@/types/game';

const RANKS: { value: CardValue; label: string }[] = [
  { value: 14, label: 'A' }, { value: 13, label: 'K' }, { value: 12, label: 'Q' },
  { value: 11, label: 'J' }, { value: 10, label: '10' }, { value: 9, label: '9' },
  { value: 8, label: '8' }, { value: 7, label: '7' }, { value: 6, label: '6' },
  { value: 5, label: '5' }, { value: 4, label: '4' }, { value: 3, label: '3' },
  { value: 2, label: '2' },
];

function rankLabel(v: CardValue): string {
  const m: Record<number, string> = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
  return m[v] ?? String(v);
}

interface ClaimModalProps {
  selectedCount: number;
  seriesRank: CardValue | null;
  onConfirm: (rank: CardValue, count: number) => void;
  onCancel: () => void;
}

export default function ClaimModal({ selectedCount, seriesRank, onConfirm, onCancel }: ClaimModalProps) {
  // When series rank is fixed, skip rank selection
  if (seriesRank !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs rounded-3xl bg-[#0d2018] border border-emerald-900/60 shadow-2xl p-6 animate-fade-in-up">
          <h2 className="text-white font-extrabold text-xl text-center mb-2">Confirm Play</h2>
          <p className="text-emerald-400/70 text-sm text-center mb-5">
            Playing {selectedCount} card{selectedCount !== 1 ? 's' : ''} as…
          </p>
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-emerald-600/30 border-2 border-emerald-500 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-white">{rankLabel(seriesRank)}</span>
            </div>
          </div>
          <button
            onClick={() => onConfirm(seriesRank, selectedCount)}
            className="w-full py-3 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all mb-2"
          >
            Play as {rankLabel(seriesRank)}
          </button>
          <button onClick={onCancel} className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Cancel — reselect cards
          </button>
        </div>
      </div>
    );
  }

  // Free-pick mode (shouldn't normally happen mid-series but kept as fallback)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#0d2018] border border-emerald-900/60 shadow-2xl p-6 animate-fade-in-up">
        <h2 className="text-white font-extrabold text-xl text-center mb-1">Claim a Rank</h2>
        <p className="text-slate-400 text-sm text-center mb-5">
          Playing {selectedCount} card{selectedCount !== 1 ? 's' : ''} as…
        </p>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {RANKS.map((r) => (
            <button
              key={r.value}
              onClick={() => onConfirm(r.value, selectedCount)}
              className="py-3 rounded-xl bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-800/40 active:scale-95 text-white font-bold text-lg transition-all"
            >
              {r.label}
            </button>
          ))}
        </div>

        <button onClick={onCancel} className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm transition-colors">
          Cancel — reselect cards
        </button>
      </div>
    </div>
  );
}
