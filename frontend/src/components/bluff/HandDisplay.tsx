'use client';

import CardDisplay from '@/components/CardDisplay';
import { Card } from '@/types/game';
import { sfx } from '@/utils/sounds';

interface HandDisplayProps {
  cards: Card[];
  selectedIndices: number[];   // display-position indices
  onToggle: (index: number) => void;
  onSort?: () => void;
  isSorted?: boolean;
  disabled: boolean;
  playAnim?: boolean;
}

export default function HandDisplay({
  cards, selectedIndices, onToggle, onSort, isSorted, disabled, playAnim,
}: HandDisplayProps) {
  const sel = new Set(selectedIndices);

  return (
    <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: '#0d1a10' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-black text-base">Your Hand</h3>
        <div className="flex items-center gap-2">
          {onSort && cards.length > 1 && (
            <button
              onClick={onSort}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all active:scale-95 border ${
                isSorted
                  ? 'bg-emerald-700/60 border-emerald-500/60 text-emerald-200 hover:bg-emerald-600/60'
                  : 'bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isSorted ? '↕ Sorted' : '↕ Sort'}
            </button>
          )}
          <span className="text-slate-500 text-sm font-semibold">{cards.length} cards</span>
          {sel.size > 0 && !playAnim && (
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-900 text-xs font-black">
              {sel.size} selected
            </span>
          )}
          {playAnim && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-black animate-pulse-fast">
              Playing…
            </span>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-slate-600">
          <span className="text-3xl mb-2">🎉</span>
          <p className="text-sm font-bold">No cards left!</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {cards.map((card, i) => {
            const isSelected = sel.has(i);
            const isAnimating = playAnim && isSelected;
            return (
              <button
                key={`${card.value}-${card.suit}-${i}`}
                onClick={() => {
                  if (!disabled && !playAnim) {
                    sfx.cardPick(!isSelected);
                    onToggle(i);
                  }
                }}
                disabled={disabled || playAnim}
                className={`
                  relative rounded-xl transition-all duration-150 outline-none
                  ${(disabled || playAnim) ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${isAnimating ? 'animate-cards-to-pile' : ''}
                  ${!isAnimating && isSelected ? 'card-selected' : ''}
                  ${!isAnimating && !isSelected && !disabled && !playAnim ? 'card-hover' : ''}
                  ${!isSelected && (disabled || playAnim) ? 'opacity-50' : ''}
                `}
              >
                <CardDisplay value={card.value} suit={card.suit} size="sm" />
                {isSelected && !isAnimating && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-slate-900 text-xs font-black flex items-center justify-center shadow-lg">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
