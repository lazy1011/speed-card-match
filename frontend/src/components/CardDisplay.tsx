'use client';

import { cardValueToString, cardSuitToSymbol, cardImageUrl, cardBackUrl } from '@/utils/cardUtils';
import { CardValue, CardSuit } from '@/types/game';

interface CardDisplayProps {
  value: CardValue;
  suit: CardSuit;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  clickable?: boolean;
  faceDown?: boolean;
}

export default function CardDisplay({
  value,
  suit,
  size = 'md',
  onClick,
  clickable = false,
  faceDown = false,
}: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-16 h-24',
    md: 'w-24 h-32',
    lg: 'w-32 h-44',
  };

  const src = faceDown ? cardBackUrl() : cardImageUrl(value, suit);
  const alt = faceDown
    ? 'Face-down card'
    : `${cardValueToString(value)} of ${suit} ${cardSuitToSymbol(suit)}`;

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      draggable={false}
      className={`
        ${sizeClasses[size]}
        rounded-lg shadow-lg object-cover bg-white select-none
        ${clickable ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all' : ''}
      `}
    />
  );
}
