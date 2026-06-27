import { Card, CardValue } from '../types/game';
import { PlayerState } from './Player';
import { Deck } from './Deck';

type LastPlay = {
  playerId: string;
  playerName: string;
  cards: Card[];
  claimedRank: CardValue;
  claimedCount: number;
};

export class BluffGameLogic {
  private players: Map<string, PlayerState>;
  private activePlayers: string[];
  private pile: Card[] = [];
  private kitty: Card[] = [];
  private lastPlay: LastPlay | null = null;
  private bluffWindowOpen: boolean = false;
  private currentPlayerIndex: number = 0;
  private currentSeriesRank: CardValue | null = null;
  private consecutiveSkips: number = 0;
  private lastPlayerToPlayId: string | null = null;
  private nextStarterId: string | null = null;
  private waitingForRankPick: boolean = false;
  private winnerId: string | null = null;
  private nextGameStarterId: string | null = null;

  constructor(
    _roomCode: string,
    playerIds: string[],
    playerNames: string[],
    startingPlayerId?: string
  ) {
    const deck = new Deck();
    const distributions = deck.distributeEquallyToPlayers(playerIds.length);
    this.kitty = deck.getLeftover();

    this.players = new Map();
    this.activePlayers = [...playerIds];

    playerIds.forEach((id, index) => {
      const player = new PlayerState(id, playerNames[index], [], index);
      player.hand = distributions[index];
      this.players.set(id, player);
    });

    // Set starting player
    if (startingPlayerId && playerIds.includes(startingPlayerId)) {
      this.currentPlayerIndex = playerIds.indexOf(startingPlayerId);
    }
    this.nextStarterId = this.activePlayers[this.currentPlayerIndex];

    // Draw initial series rank from kitty (or random if kitty is empty)
    this.drawInitialSeriesRank();
  }

  private drawInitialSeriesRank(): void {
    if (this.kitty.length > 0) {
      const idx = Math.floor(Math.random() * this.kitty.length);
      const card = this.kitty.splice(idx, 1)[0];
      this.currentSeriesRank = card.value;
    } else {
      const ranks: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      this.currentSeriesRank = ranks[Math.floor(Math.random() * ranks.length)];
    }
    this.waitingForRankPick = false;
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  getPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  getCurrentPlayer(): PlayerState | null {
    const id = this.activePlayers[this.currentPlayerIndex];
    return this.players.get(id) || null;
  }

  getHandForPlayer(playerId: string): Card[] {
    return this.players.get(playerId)?.hand || [];
  }

  getPileSize(): number {
    return this.pile.length;
  }

  getKittySize(): number {
    return this.kitty.length;
  }

  isBluffWindowOpen(): boolean {
    return this.bluffWindowOpen;
  }

  getLastPlay(): LastPlay | null {
    return this.lastPlay;
  }

  getCurrentSeriesRank(): CardValue | null {
    return this.currentSeriesRank;
  }

  isWaitingForRankPick(): boolean {
    return this.waitingForRankPick;
  }

  getNextStarterId(): string | null {
    return this.nextStarterId;
  }

  isGameOver(): boolean {
    return this.winnerId !== null;
  }

  getWinner(): { id: string; name: string } | null {
    if (!this.winnerId) return null;
    const p = this.players.get(this.winnerId);
    return p ? { id: p.id, name: p.name } : null;
  }

  getNextGameStarterId(): string | null {
    return this.nextGameStarterId;
  }

  getPlayerSummaries() {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand.length,
      isActive: p.isActive,
    }));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Series starter sets the rank for this series.
   */
  setSeriesRank(
    playerId: string,
    rank: CardValue
  ): { success: boolean; message: string } {
    if (!this.waitingForRankPick)
      return { success: false, message: 'Not waiting for rank pick' };
    if (playerId !== this.nextStarterId)
      return { success: false, message: 'Not your turn to pick rank' };

    this.currentSeriesRank = rank;
    this.waitingForRankPick = false;
    this.consecutiveSkips = 0;
    this.lastPlayerToPlayId = null;

    // Current player is already set to nextStarter in endSeries()
    return { success: true, message: `Series rank set to ${rank}` };
  }

  /**
   * Play cards face-down, claiming they are the series rank.
   */
  playCards(
    playerId: string,
    cardIndices: number[],
    claimedRank: CardValue,
    claimedCount: number
  ): { success: boolean; message: string } {
    if (this.waitingForRankPick)
      return { success: false, message: 'Waiting for rank to be set' };
    if (this.bluffWindowOpen)
      return { success: false, message: 'Bluff window open — wait or call Show' };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId)
      return { success: false, message: 'Not your turn' };

    // Enforce series rank
    if (this.currentSeriesRank !== null && claimedRank !== this.currentSeriesRank)
      return {
        success: false,
        message: `Must claim ${this.currentSeriesRank} for this series`,
      };

    const player = this.players.get(playerId)!;
    const handSize = player.hand.length;

    if (cardIndices.length < 1 || cardIndices.length > 4)
      return { success: false, message: 'Must play 1–4 cards' };
    if (cardIndices.some((i) => i < 0 || i >= handSize))
      return { success: false, message: 'Invalid card selection' };
    if (cardIndices.length !== new Set(cardIndices).size)
      return { success: false, message: 'Duplicate card indices' };

    const sorted = [...cardIndices].sort((a, b) => b - a);
    const played: Card[] = sorted.map((i) => player.hand.splice(i, 1)[0]);

    this.pile.push(...played);
    this.lastPlay = {
      playerId,
      playerName: player.name,
      cards: played,
      claimedRank: this.currentSeriesRank ?? claimedRank,
      claimedCount,
    };
    this.bluffWindowOpen = true;
    this.consecutiveSkips = 0;
    this.lastPlayerToPlayId = playerId;

    return { success: true, message: 'Cards played' };
  }

  /**
   * Skip your turn. If all active players skip in a row, the series is discarded.
   */
  skipTurn(playerId: string): {
    success: boolean;
    message: string;
    seriesDiscarded: boolean;
    nextStarterId: string | null;
  } {
    if (this.waitingForRankPick)
      return {
        success: false,
        message: 'Waiting for rank to be set',
        seriesDiscarded: false,
        nextStarterId: null,
      };
    if (this.bluffWindowOpen)
      return {
        success: false,
        message: 'Cannot skip during bluff window',
        seriesDiscarded: false,
        nextStarterId: null,
      };

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId)
      return {
        success: false,
        message: 'Not your turn',
        seriesDiscarded: false,
        nextStarterId: null,
      };

    this.consecutiveSkips++;

    if (this.consecutiveSkips >= this.activePlayers.length) {
      // All players skipped — discard the pile and end the series
      this.pile = [];
      const nextStarter = this.lastPlayerToPlayId || this.activePlayers[this.currentPlayerIndex];
      this.endSeries(nextStarter);
      return {
        success: true,
        message: 'All players skipped — series discarded',
        seriesDiscarded: true,
        nextStarterId: nextStarter,
      };
    }

    return {
      success: true,
      message: 'Skipped',
      seriesDiscarded: false,
      nextStarterId: null,
    };
  }

  /**
   * Call bluff on the last play. Resolves the series.
   */
  callBluff(callerId: string): {
    success: boolean;
    message: string;
    callerWins: boolean;
    loserName: string;
    loserPlayerId: string;
    loserReceivesCards: number;
    revealedCards: Card[];
    claimedRank: CardValue;
    nextStarterId: string;
  } {
    const fail = (msg: string) => ({
      success: false,
      message: msg,
      callerWins: false,
      loserName: '',
      loserPlayerId: '',
      loserReceivesCards: 0,
      revealedCards: [] as Card[],
      claimedRank: 2 as CardValue,
      nextStarterId: '',
    });

    if (!this.bluffWindowOpen || !this.lastPlay) return fail('No bluff window open');
    if (callerId === this.lastPlay.playerId) return fail('Cannot call show on yourself');

    const { playerId, cards, claimedRank } = this.lastPlay;
    const allMatch = cards.every((c) => c.value === claimedRank);
    const callerWins = !allMatch; // bluff caught → caller wins

    const loserPlayerId = callerWins ? playerId : callerId;
    const loserPlayer = this.players.get(loserPlayerId)!;
    loserPlayer.hand.push(...this.pile);
    const piledCount = this.pile.length;

    // Determine who picks next rank:
    // - caller wins (bluff caught): caller picks
    // - play was legit (caller gets caught): the person who played picks
    const nextStarter = callerWins ? callerId : playerId;

    this.pile = [];
    this.lastPlay = null;
    this.bluffWindowOpen = false;
    this.consecutiveSkips = 0;
    this.endSeries(nextStarter);

    return {
      success: true,
      message: callerWins
        ? `Bluff caught! ${loserPlayer.name} takes the pile.`
        : `Legit play! ${loserPlayer.name} takes the pile.`,
      callerWins,
      loserName: loserPlayer.name,
      loserPlayerId,
      loserReceivesCards: piledCount,
      revealedCards: cards,
      claimedRank,
      nextStarterId: nextStarter,
    };
  }

  /** Close the bluff window (called when it times out without a show). */
  closeBluffWindow(): void {
    this.bluffWindowOpen = false;
  }

  /** Advance to next player in turn order. */
  advanceTurn(): void {
    if (this.waitingForRankPick) return;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.activePlayers.length;
  }

  /** Check if any player has emptied their hand (wins). */
  checkWinner(): string | null {
    for (const [id, player] of this.players) {
      if (player.isActive && player.hand.length === 0) {
        this.winnerId = id;
        // Player next to winner starts the next game
        const winnerIdx = this.activePlayers.indexOf(id);
        const nextIdx = (winnerIdx + 1) % this.activePlayers.length;
        this.nextGameStarterId = this.activePlayers[nextIdx];
        return id;
      }
    }
    return null;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * End the current series: clear pile/rank, set nextStarter, enter rank-pick phase.
   */
  private endSeries(nextStarterId: string): void {
    this.currentSeriesRank = null;
    this.lastPlayerToPlayId = null;
    this.consecutiveSkips = 0;
    this.nextStarterId = nextStarterId;
    this.waitingForRankPick = true;

    // Move turn pointer to the nextStarter
    const idx = this.activePlayers.indexOf(nextStarterId);
    if (idx !== -1) this.currentPlayerIndex = idx;
  }
}
