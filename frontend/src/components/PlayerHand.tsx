'use client';

import { Card } from '@/types/game';
import CardDisplay from './CardDisplay';

interface PlayerHandProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}

export default function PlayerHand({ cards, onCardClick }: PlayerHandProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Your Hand ({cards.length})</h2>
      <div className="flex gap-4 flex-wrap">
        {cards.length > 0 ? (
          cards.map((card, idx) => (
            <div key={idx} onClick={() => onCardClick?.(card)}>
              <CardDisplay
                value={card.value}
                suit={card.suit}
                size="sm"
                clickable={!!onCardClick}
              />
            </div>
          ))
        ) : (
          <p className="text-gray-500">No cards in hand</p>
        )}
      </div>
    </div>
  );
}
