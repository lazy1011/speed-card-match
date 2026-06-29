import { v4 as uuidv4 } from 'uuid';
import { GameLogic } from '../game/GameState';
import { BluffGameLogic } from '../game/BluffGameLogic';

export type GameMode = 'speed-match' | 'bluff';

/**
 * Room and game instance management
 */
export class RoomManager {
  private rooms: Map<
    string,
    {
      code: string;
      hostId: string;
      playerIds: string[];
      playerNames: string[];
      maxPlayers: number;
      status: 'waiting' | 'active' | 'finished';
      gameMode: GameMode;
      gameLogic: GameLogic | null;
      bluffLogic: BluffGameLogic | null;
      createdAt: number;
      lastActiveAt: number;
    }
  > = new Map();

  /**
   * Create a new room and return the room code
   */
  createRoom(hostId: string, hostName: string, maxPlayers: number = 4, gameMode: GameMode = 'speed-match'): string {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId,
      playerIds: [hostId],
      playerNames: [hostName],
      maxPlayers,
      status: 'waiting' as const,
      gameMode,
      gameLogic: null,
      bluffLogic: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.rooms.set(code, room);
    return code;
  }

  /** Mark a room as recently active so the stale-room sweeper leaves it alone. */
  touch(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) room.lastActiveAt = Date.now();
  }

  /**
   * Delete rooms that have been idle longer than maxIdleMs. Returns the count
   * removed. Called periodically so abandoned rooms don't leak memory forever.
   */
  sweepStaleRooms(maxIdleMs: number = 2 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;
    for (const [code, room] of this.rooms) {
      if (now - room.lastActiveAt > maxIdleMs) {
        this.rooms.delete(code);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get room by code
   */
  getRoom(roomCode: string) {
    return this.rooms.get(roomCode);
  }

  /**
   * Add player to room
   * Returns: { success, message, room }
   */
  addPlayerToRoom(roomCode: string, playerId: string, playerName: string): {
    success: boolean;
    message: string;
    room?: any;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, message: 'Game already started' };
    }

    if (room.playerIds.includes(playerId)) {
      return { success: false, message: 'Player already in room' };
    }

    if (room.playerIds.length >= room.maxPlayers) {
      return { success: false, message: 'Room is full' };
    }

    room.playerIds.push(playerId);
    room.playerNames.push(playerName);

    return {
      success: true,
      message: 'Joined room successfully',
      room: this.getRoomInfo(roomCode),
    };
  }

  /**
   * Start game in room
   * Returns: { success, message }
   */
  startGame(roomCode: string, hostId: string): {
    success: boolean;
    message: string;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    if (room.hostId !== hostId) {
      return { success: false, message: 'Only host can start game' };
    }

    if (room.playerIds.length < 2) {
      return { success: false, message: 'Need at least 2 players' };
    }

    // Initialize game logic based on mode
    if (room.gameMode === 'bluff') {
      room.bluffLogic = new BluffGameLogic(roomCode, room.playerIds, room.playerNames);
      room.gameLogic = null;
    } else {
      room.gameLogic = new GameLogic(roomCode, room.playerIds, room.playerNames);
      room.bluffLogic = null;
    }
    room.status = 'active';

    return { success: true, message: 'Game started' };
  }

  /**
   * Restart a finished/active game in the same room (host only). Re-deals a
   * fresh shuffle to everyone currently in the room.
   */
  restartGame(roomCode: string, hostId: string): { success: boolean; message: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, message: 'Room not found' };
    if (room.hostId !== hostId) return { success: false, message: 'Only host can restart' };
    if (room.playerIds.length < 2) return { success: false, message: 'Need at least 2 players' };

    if (room.gameMode === 'bluff') {
      // Next game starts with the player after the previous winner
      const nextStarterId = room.bluffLogic?.getNextGameStarterId() ?? undefined;
      room.bluffLogic = new BluffGameLogic(roomCode, room.playerIds, room.playerNames, nextStarterId);
      room.gameLogic = null;
    } else {
      room.gameLogic = new GameLogic(roomCode, room.playerIds, room.playerNames);
      room.bluffLogic = null;
    }
    room.status = 'active';
    return { success: true, message: 'Game restarted' };
  }

  /**
   * Get room info for broadcasting
   */
  getRoomInfo(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      code: room.code,
      hostId: room.hostId,
      playerNames: room.playerNames,
      playerIds: room.playerIds,
      playerCount: room.playerIds.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      gameMode: room.gameMode,
      gameState: room.gameLogic?.getGameState() || null,
    };
  }

  /**
   * Remove player from room
   */
  removePlayerFromRoom(roomCode: string, playerId: string): {
    success: boolean;
    message: string;
    roomExists: boolean;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, message: 'Room not found', roomExists: false };
    }

    const playerIndex = room.playerIds.indexOf(playerId);
    if (playerIndex === -1) {
      return { success: false, message: 'Player not in room', roomExists: true };
    }

    room.playerIds.splice(playerIndex, 1);
    room.playerNames.splice(playerIndex, 1);

    // If room is empty, delete it
    if (room.playerIds.length === 0) {
      this.rooms.delete(roomCode);
      return { success: true, message: 'Room deleted', roomExists: false };
    }

    // If host left, assign new host
    if (room.hostId === playerId && room.playerIds.length > 0) {
      room.hostId = room.playerIds[0];
    }

    return { success: true, message: 'Player removed', roomExists: true };
  }

  /**
   * Generate random room code
   */
  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Get game logic for room
   */
  getGameLogic(roomCode: string): GameLogic | null {
    const room = this.rooms.get(roomCode);
    return room?.gameLogic || null;
  }

  getBluffLogic(roomCode: string): BluffGameLogic | null {
    const room = this.rooms.get(roomCode);
    return room?.bluffLogic || null;
  }

  getGameMode(roomCode: string): GameMode | null {
    return this.rooms.get(roomCode)?.gameMode || null;
  }
}
