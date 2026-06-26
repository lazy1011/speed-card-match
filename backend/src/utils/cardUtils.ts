import { Card, CardValue, CardSuit } from '../types/game';

/**
 * Convert numeric card value to display string (J=11, Q=12, K=13, A=14)
 */
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

/**
 * Check if two cards match (same value, suit doesn't matter)
 */
export function cardsMatch(card1: Card, card2: Card): boolean {
  return card1.value === card2.value;
}

/**
 * Get next call value in sequence (2 → 3 → ... → 14 → 2)
 */
export function getNextCallValue(currentCall: CardValue): CardValue {
  if (currentCall === 14) {
    return 2;
  }
  return (currentCall + 1) as CardValue;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create a full deck of 52 cards
 */
export function createFullDeck(): Card[] {
  const suits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }

  return deck;
}
