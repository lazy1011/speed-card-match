import { Card, CardValue, Player } from '../types/game';

/**
 * Player state management
 */
export class PlayerState implements Player {
  id: string;
  name: string;
  hand: Card[] = []; // Cards drawn but not yet claimed
  deck: Card[] = []; // Undrawn cards from their share
  claimedCards: Card[] = []; // Cards won from matching
  isActive: boolean = true;
  turnOrder: number;

  constructor(id: string, name: string, dealCards: Card[], turnOrder: number) {
    this.id = id;
    this.name = name;
    this.deck = dealCards;
    this.turnOrder = turnOrder;
  }

  /**
   * Draw a card off the top of this player's deck. The card leaves the player's
   * possession and goes to the communal stack (handled by GameLogic), so we do
   * NOT keep it in `hand` — otherwise it would be double-counted in totals.
   */
  drawCard(): Card | null {
    if (this.deck.length > 0) {
      return this.deck.pop() || null;
    }
    return null;
  }

  /**
   * Get total card count (hand + deck + claimed)
   */
  getTotalCards(): number {
    return this.hand.length + this.deck.length + this.claimedCards.length;
  }

  /**
   * Add claimed cards to player's stack
   */
  addClaimedCards(cards: Card[]): void {
    this.claimedCards.push(...cards);
  }

  /**
   * Clear hand (when cards are moved to claimed)
   */
  clearHand(): void {
    this.hand = [];
  }

  /**
   * Remove one card from this player (for a wrong-claim penalty). Prefers
   * already-won cards, then the undrawn deck. Returns the card, or null if the
   * player has none to give.
   */
  removeCardForPenalty(): Card | null {
    if (this.claimedCards.length > 0) {
      return this.claimedCards.pop() || null;
    }
    if (this.deck.length > 0) {
      return this.deck.pop() || null;
    }
    return null;
  }

  /**
   * Check if player is out of cards
   */
  isOutOfCards(): boolean {
    return this.getTotalCards() === 0;
  }

  /**
   * Get cards for display (excludes deck for other players)
   */
  getPublicInfo() {
    return {
      id: this.id,
      name: this.name,
      claimedCards: this.claimedCards,
      isActive: this.isActive,
      turnOrder: this.turnOrder,
      cardCount: this.getTotalCards(),
    };
  }
}
