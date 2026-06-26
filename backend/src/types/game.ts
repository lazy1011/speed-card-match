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
  hand: Card[]; // Cards in hand (visible to player only)
  deck: Card[]; // Remaining cards to draw from
  claimedCards: Card[]; // Cards won so far
  isActive: boolean; // Still in game
  turnOrder: number; // Position in turn rotation
}

// Room types
export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  createdAt: number;
}

// Game state types
export interface GameState {
  roomCode: string;
  currentCall: CardValue; // Current card value to match
  currentPlayerIndex: number; // Index of player whose turn it is
  stack: Card[]; // Cards on the table (claimed/matched cards)
  round: number;
  winner: string | null; // Player ID of winner
  lastMatchedBy: string | null; // Player ID who last matched
  eliminatedPlayers: string[];
}

// Socket.io Event payloads
export interface JoinRoomRequest {
  playerName: string;
  roomCode?: string; // If joining existing room
}

export interface JoinRoomResponse {
  success: boolean;
  roomCode: string;
  players?: Player[];
  message?: string;
}

export interface StartGameRequest {
  roomCode: string;
}

export interface DrawCardRequest {
  roomCode: string;
  playerId: string;
}

export interface DrawCardResponse {
  success: boolean;
  drawnCard?: Card;
  matched?: boolean; // Did it match the current call?
  currentCall?: CardValue;
  message?: string;
}

export interface ClaimStackRequest {
  roomCode: string;
  playerId: string;
  timestamp: number; // Client timestamp for conflict resolution
}

export interface ClaimStackResponse {
  success: boolean;
  playerId: string;
  cardsWon?: number;
  nextCall?: CardValue;
  message?: string;
}

export interface GameUpdateEvent {
  gameState: GameState;
  players: Player[];
  currentPlayerName: string;
}

export interface PlayerEliminated {
  playerId: string;
  playerName: string;
  remainingPlayers: number;
}

export interface GameWon {
  winnerId: string;
  winnerName: string;
  finalCardCount: number;
}

export interface LeaveRoomRequest {
  roomCode: string;
  playerId: string;
}
