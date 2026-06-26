import { Card, CardValue, Player } from '../types/game';
import { createFullDeck, shuffle } from '../utils/cardUtils';

/**
 * Deck management and distribution
 */
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = shuffle(createFullDeck());
  }

  /**
   * Distribute cards equally among players
   * Returns an array of card arrays, one per player
   */
  distributeEquallyToPlayers(numPlayers: number): Card[][] {
    const cardsPerPlayer = Math.floor(52 / numPlayers);
    const distributions: Card[][] = [];

    for (let i = 0; i < numPlayers; i++) {
      const playerCards = this.cards.splice(0, cardsPerPlayer);
      distributions.push(playerCards);
    }

    // Any remaining cards go back to the pile (unlikely with 2-4 players)
    return distributions;
  }

  /**
   * Draw a single card from the deck
   */
  drawCard(): Card | null {
    return this.cards.length > 0 ? this.cards.pop() || null : null;
  }

  /**
   * Get remaining card count
   */
  getRemainingCount(): number {
    return this.cards.length;
  }
}
