// Card & Deck types
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  value: CardValue;
  suit: CardSuit;
}

// Player types
export interface Player {
  id: string;
  name: string;
  hand: Card[];
  deck: Card[];
  claimedCards: Card[];
  isActive: boolean;
  turnOrder: number;
  cardCount?: number;
}

// Game state types
export interface GameState {
  roomCode: string;
  currentCall: CardValue;
  currentPlayerIndex: number;
  stack: Card[];
  round: number;
  winner: string | null;
  lastMatchedBy: string | null;
  eliminatedPlayers: string[];
}

// Game events
export interface GameEvent {
  type:
    | 'ROOM_UPDATED'
    | 'GAME_STARTED'
    | 'CARD_DRAWN'
    | 'TURN_ADVANCED'
    | 'STACK_CLAIMED'
    | 'PLAYER_ELIMINATED'
    | 'GAME_WON'
    | 'PLAYER_DISCONNECTED'
    | 'ERROR';
  payload: any;
}
