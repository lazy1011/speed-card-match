import { CardSuit, CardValue } from '@/types/game';

export function cardValueToString(value: CardValue): string {
  switch (value) {
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    case 14:
      return 'A';
    default:
      return value.toString();
  }
}

export function cardSuitToSymbol(suit: CardSuit): string {
  switch (suit) {
    case 'hearts':
      return '♥️';
    case 'diamonds':
      return '♦️';
    case 'clubs':
      return '♣️';
    case 'spades':
      return '♠️';
    default:
      return '';
  }
}

const CARD_IMAGE_BASE = 'https://deckofcardsapi.com/static/img';

function cardValueToCode(value: CardValue): string {
  switch (value) {
    case 10:
      return '0';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    case 14:
      return 'A';
    default:
      return value.toString();
  }
}

function cardSuitToCode(suit: CardSuit): string {
  switch (suit) {
    case 'hearts':
      return 'H';
    case 'diamonds':
      return 'D';
    case 'clubs':
      return 'C';
    case 'spades':
      return 'S';
    default:
      return '';
  }
}

/** Realistic card-face image URL, e.g. KH.png (King of Hearts), 0S.png (10 of Spades). */
export function cardImageUrl(value: CardValue, suit: CardSuit): string {
  return `${CARD_IMAGE_BASE}/${cardValueToCode(value)}${cardSuitToCode(suit)}.png`;
}

/** Face-down card-back image URL. */
export function cardBackUrl(): string {
  return `${CARD_IMAGE_BASE}/back.png`;
}

let preloaded = false;
/** Warm the browser cache with all 52 faces + the back so flips never flash. */
export function preloadCardImages(): void {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const suits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const urls = [cardBackUrl(), ...suits.flatMap((s) => values.map((v) => cardImageUrl(v, s)))];
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
