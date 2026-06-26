import { Card, CardValue, GameState } from '../types/game';
import { PlayerState } from './Player';
import { Deck } from './Deck';
import { getNextCallValue, cardsMatch } from '../utils/cardUtils';

/**
 * Core game logic and state management
 */
export class GameLogic {
  private gameState: GameState;
  private players: Map<string, PlayerState>;
  private activePlayers: string[]; // IDs in turn order
  private stack: Card[] = []; // Cards on table awaiting match
  private matchActive: boolean = false; // True when the top card matched the call → claim race is open

  constructor(roomCode: string, playerIds: string[], playerNames: string[]) {
    // Initialize players with equal card distribution
    const deck = new Deck();
    const distributions = deck.distributeEquallyToPlayers(playerIds.length);

    this.players = new Map();
    this.activePlayers = [];

    playerIds.forEach((id, index) => {
      const player = new PlayerState(id, playerNames[index], distributions[index], index);
      this.players.set(id, player);
      this.activePlayers.push(id);
    });

    // Initialize game state
    this.gameState = {
      roomCode,
      currentCall: 2,
      currentPlayerIndex: 0,
      stack: this.stack,
      round: 1,
      winner: null,
      lastMatchedBy: null,
      eliminatedPlayers: [],
    };
  }

  /**
   * Get current game state (safe copy)
   */
  getGameState(): GameState {
    return {
      ...this.gameState,
      stack: [...this.stack],
    };
  }

  /**
   * Get all players
   */
  getPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): PlayerState | null {
    const currentPlayerId = this.activePlayers[this.gameState.currentPlayerIndex];
    return this.players.get(currentPlayerId) || null;
  }

  /**
   * Player draws a card
   * Returns: { drawnCard, matched, shouldClaimStack }
   */
  drawCard(playerId: string): {
    drawnCard: Card | null;
    matched: boolean;
    shouldClaimStack: boolean;
  } {
    const player = this.players.get(playerId);
    if (!player) {
      return { drawnCard: null, matched: false, shouldClaimStack: false };
    }

    const drawnCard = player.drawCard();
    if (!drawnCard) {
      return { drawnCard: null, matched: false, shouldClaimStack: false };
    }

    // Add card to stack
    this.stack.push(drawnCard);
    this.gameState.stack = this.stack;

    // Check if matched current call
    const matched = cardsMatch(drawnCard, {
      value: this.gameState.currentCall,
      suit: 'hearts', // Suit doesn't matter for matching
    });

    // A match opens the claim race — any player may now race to claim the stack.
    if (matched) {
      this.matchActive = true;
    }

    return {
      drawnCard,
      matched,
      shouldClaimStack: matched,
    };
  }

  /**
   * Whether a claim race is currently open (top card matched the call).
   */
  isMatchActive(): boolean {
    return this.matchActive;
  }

  /**
   * Current number of cards sitting on the table.
   */
  getStackSize(): number {
    return this.stack.length;
  }

  /**
   * Close the claim race without anyone winning (timer expired). The stack
   * stays on the table for the next match.
   */
  expireMatch(): void {
    this.matchActive = false;
  }

  /**
   * Penalize a wrong claim: take one of the player's cards and drop it to the
   * bottom of the stack. Returns the forfeited card, or null if they had none.
   */
  penalizeWrongClaim(playerId: string): Card | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    const card = player.removeCardForPenalty();
    if (!card) return null;

    this.stack.unshift(card); // to the bottom of the pile
    this.gameState.stack = this.stack;
    return card;
  }

  /**
   * Player claims the stack. Only succeeds while a claim race is open, and the
   * FIRST successful caller wins the whole stack (the race then closes). Any
   * player may claim — not just the one who drew the matching card.
   * Returns: { success, cardsWon, nextCall }
   */
  claimStack(playerId: string): {
    success: boolean;
    cardsWon: number;
    nextCall: CardValue;
  } {
    const player = this.players.get(playerId);
    if (!player || !this.matchActive || this.stack.length === 0) {
      return { success: false, cardsWon: 0, nextCall: this.gameState.currentCall };
    }

    // Close the race immediately so only the first caller wins.
    this.matchActive = false;

    // Transfer stack to claimed cards
    player.addClaimedCards(this.stack);
    const cardsWon = this.stack.length;

    // Reset stack and advance call
    this.stack = [];
    this.gameState.stack = this.stack;
    this.gameState.lastMatchedBy = playerId;

    const nextCall = getNextCallValue(this.gameState.currentCall);
    this.gameState.currentCall = nextCall;

    return {
      success: true,
      cardsWon,
      nextCall,
    };
  }

  /**
   * Move to next player's turn
   */
  advanceTurn(): void {
    this.gameState.currentPlayerIndex =
      (this.gameState.currentPlayerIndex + 1) % this.activePlayers.length;
  }

  /**
   * Eliminate a player (ran out of cards)
   * Returns: { eliminated, remainingCount, hasWinner }
   */
  eliminatePlayer(playerId: string): {
    eliminated: boolean;
    remainingCount: number;
    winner: string | null;
  } {
    const player = this.players.get(playerId);
    if (!player) {
      return { eliminated: false, remainingCount: this.activePlayers.length, winner: null };
    }

    player.isActive = false;
    this.activePlayers = this.activePlayers.filter((id) => id !== playerId);
    this.gameState.eliminatedPlayers.push(playerId);

    // Check if only one player remains
    let winner: string | null = null;
    if (this.activePlayers.length === 1) {
      winner = this.activePlayers[0];
      this.gameState.winner = winner;
    }

    // Reset current player index if needed
    if (this.gameState.currentPlayerIndex >= this.activePlayers.length) {
      this.gameState.currentPlayerIndex = 0;
    }

    return {
      eliminated: true,
      remainingCount: this.activePlayers.length,
      winner,
    };
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.activePlayers.length <= 1;
  }

  /**
   * Get winner info
   */
  getWinner(): { id: string; name: string } | null {
    if (this.gameState.winner) {
      const winner = this.players.get(this.gameState.winner);
      if (winner) {
        return { id: winner.id, name: winner.name };
      }
    }
    return null;
  }
}
