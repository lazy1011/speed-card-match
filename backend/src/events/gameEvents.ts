import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import {
  JoinRoomRequest,
  JoinRoomResponse,
  DrawCardRequest,
  DrawCardResponse,
  ClaimStackRequest,
  ClaimStackResponse,
  LeaveRoomRequest,
} from '../types/game';

/** How long the claim race stays open before it auto-expires. */
const CLAIM_WINDOW_MS = 5000;
/** Grace period after a claim resolves during which late taps are "too slow" (no penalty). */
const CLAIM_GRACE_MS = 1200;

/** Live, broadcast-safe summary of every player (name + current card count). */
function playerSummaries(gameLogic: any) {
  return gameLogic.getPlayers().map((p: any) => ({
    id: p.id,
    name: p.name,
    cardCount: p.getTotalCards(),
    isActive: p.isActive,
  }));
}

/**
 * Setup Socket.io event handlers for game logic
 */
export function setupGameEvents(io: Server, roomManager: RoomManager) {
  // Per-room claim countdown timers and the time the last claim resolved.
  const claimTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const lastClaimResolvedAt = new Map<string, number>();

  function clearClaimTimer(roomCode: string) {
    const t = claimTimers.get(roomCode);
    if (t) {
      clearTimeout(t);
      claimTimers.delete(roomCode);
    }
  }

  /**
   * Shared post-claim flow: broadcast the win, advance the turn, then run
   * elimination / game-over checks. The serial advances the moment the stack
   * is won (handled inside gameLogic.claimStack).
   */
  function broadcastStackClaimed(
    gameLogic: any,
    roomCode: string,
    playerName: string | undefined,
    cardsWon: number,
    nextCall: number
  ) {
    io.to(roomCode).emit('STACK_CLAIMED', {
      playerName,
      cardsWon,
      nextCall,
      newStackSize: gameLogic.getStackSize(),
      players: playerSummaries(gameLogic),
    });

    // Advance turn
    gameLogic.advanceTurn();
    const nextPlayer = gameLogic.getCurrentPlayer();
    io.to(roomCode).emit('TURN_ADVANCED', {
      currentPlayerName: nextPlayer?.name,
      currentPlayerId: nextPlayer?.id,
      currentPlayerIndex: gameLogic.getGameState().currentPlayerIndex,
    });

    // Check for elimination / game over
    gameLogic.getPlayers().forEach((p: any) => {
      if (p.isActive && p.isOutOfCards()) {
        const { winner, remainingCount } = gameLogic.eliminatePlayer(p.id);

        io.to(roomCode).emit('PLAYER_ELIMINATED', {
          playerId: p.id,
          playerName: p.name,
          remainingPlayers: remainingCount,
        });

        console.log(`[Game] Player ${p.name} eliminated in room ${roomCode}`);

        if (winner) {
          const winnerInfo = gameLogic.getWinner();
          io.to(roomCode).emit('GAME_WON', {
            winnerId: winner,
            winnerName: winnerInfo?.name,
            finalCardCount:
              gameLogic.getPlayers().find((pl: any) => pl.id === winner)?.getTotalCards() || 0,
          });

          console.log(`[Game] Player ${winnerInfo?.name} won room ${roomCode}!`);
        }
      }
    });
  }

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);

    /**
     * JOIN_ROOM: Player joins or creates a room
     */
    socket.on('JOIN_ROOM', (data: JoinRoomRequest, callback: (response: JoinRoomResponse) => void) => {
      const playerId = socket.id;
      const playerName = data.playerName || `Player${Math.random().toString(36).substring(7)}`;

      let roomCode = data.roomCode;

      // If no room code, create new room
      if (!roomCode) {
        roomCode = roomManager.createRoom(playerId, playerName, 4);
        console.log(`[Game] New room created: ${roomCode} by ${playerName}`);
      } else {
        // Join existing room
        const result = roomManager.addPlayerToRoom(roomCode, playerId, playerName);
        if (!result.success) {
          callback({ success: false, roomCode, message: result.message });
          return;
        }
      }

      // Join socket to room
      socket.join(roomCode);

      // Store room code in socket data for later
      (socket.data as any).roomCode = roomCode;
      (socket.data as any).playerId = playerId;

      const roomInfo = roomManager.getRoomInfo(roomCode);
      callback({
        success: true,
        roomCode,
        players: roomInfo?.playerNames.map((name, idx) => ({
          id: roomInfo.playerNames[idx], // Use name as temp ID for client
          name,
          hand: [],
          deck: [],
          claimedCards: [],
          isActive: true,
          turnOrder: idx,
        })) || [],
      });

      // Broadcast updated room state to all players
      io.to(roomCode).emit('ROOM_UPDATED', roomInfo);
      console.log(`[Game] Player ${playerName} joined room ${roomCode}`);
    });

    /**
     * START_GAME: Host starts the game
     */
    socket.on('START_GAME', (data: { roomCode: string }, callback?: (result: any) => void) => {
      const { roomCode } = data;
      const playerId = (socket.data as any).playerId;

      const result = roomManager.startGame(roomCode, playerId);
      if (callback) callback(result);

      if (result.success) {
        const gameLogic = roomManager.getGameLogic(roomCode);

        // Broadcast game started
        io.to(roomCode).emit('GAME_STARTED', {
          gameState: gameLogic?.getGameState(),
          players: playerSummaries(gameLogic),
          currentPlayerName: gameLogic?.getCurrentPlayer()?.name,
          currentPlayerId: gameLogic?.getCurrentPlayer()?.id,
        });

        console.log(`[Game] Game started in room ${roomCode}`);
      }
    });

    /**
     * RESTART_GAME: Host restarts a finished/active game (Play Again).
     */
    socket.on('RESTART_GAME', (data: { roomCode: string }, callback?: (result: any) => void) => {
      const { roomCode } = data;
      const playerId = (socket.data as any).playerId;

      const result = roomManager.restartGame(roomCode, playerId);
      if (callback) callback(result);

      if (result.success) {
        clearClaimTimer(roomCode);
        const gameLogic = roomManager.getGameLogic(roomCode);
        io.to(roomCode).emit('GAME_STARTED', {
          gameState: gameLogic?.getGameState(),
          players: playerSummaries(gameLogic),
          currentPlayerName: gameLogic?.getCurrentPlayer()?.name,
          currentPlayerId: gameLogic?.getCurrentPlayer()?.id,
        });
        console.log(`[Game] Game restarted in room ${roomCode}`);
      }
    });

    /**
     * DRAW_CARD: Current player draws a card
     */
    socket.on('DRAW_CARD', (data: DrawCardRequest, callback?: (response: DrawCardResponse) => void) => {
      const { roomCode, playerId } = data;

      const gameLogic = roomManager.getGameLogic(roomCode);
      if (!gameLogic) {
        if (callback) callback({ success: false, message: 'Game not found' });
        return;
      }

      // Cannot draw while a claim race is open — the match must be resolved first.
      if (gameLogic.isMatchActive()) {
        if (callback) callback({ success: false, message: 'Resolve the current match first!' });
        return;
      }

      // Verify it's current player's turn
      const currentPlayer = gameLogic.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.id !== playerId) {
        if (callback) callback({ success: false, message: 'Not your turn' });
        return;
      }

      // Draw card
      const { drawnCard, matched } = gameLogic.drawCard(playerId);
      if (!drawnCard) {
        if (callback) callback({ success: false, message: 'No cards left to draw' });
        return;
      }

      if (callback) {
        callback({
          success: true,
          drawnCard,
          matched,
          currentCall: gameLogic.getGameState().currentCall,
        });
      }

      // Broadcast card drawn to all players
      io.to(roomCode).emit('CARD_DRAWN', {
        playerName: currentPlayer.name,
        drawnCard,
        matched,
        currentCall: gameLogic.getGameState().currentCall,
        stackSize: gameLogic.getStackSize(),
        players: playerSummaries(gameLogic),
      });

      console.log(`[Game] Player ${currentPlayer.name} drew card in room ${roomCode}, matched: ${matched}`);

      if (matched) {
        // Speed-click race: a match opens the claim window for EVERYONE. The
        // first player to send CLAIM_STACK wins the whole stack. We do not
        // advance the turn here — the claim handler (or the expiry timer) does.
        io.to(roomCode).emit('MATCH_AVAILABLE', {
          drawnByName: currentPlayer.name,
          currentCall: gameLogic.getGameState().currentCall,
          stackSize: gameLogic.getStackSize(),
          claimWindowMs: CLAIM_WINDOW_MS,
        });
        console.log(`[Game] MATCH in room ${roomCode} — claim race open`);

        // Start / restart the countdown. If nobody claims in time, the window
        // closes and play moves on.
        clearClaimTimer(roomCode);
        const timer = setTimeout(() => {
          claimTimers.delete(roomCode);
          if (!gameLogic.isMatchActive()) return;
          gameLogic.expireMatch();
          lastClaimResolvedAt.set(roomCode, Date.now());
          gameLogic.advanceTurn();
          const nextPlayer = gameLogic.getCurrentPlayer();
          io.to(roomCode).emit('MATCH_EXPIRED', {
            currentPlayerName: nextPlayer?.name,
            currentPlayerId: nextPlayer?.id,
            currentPlayerIndex: gameLogic.getGameState().currentPlayerIndex,
            stackSize: gameLogic.getStackSize(),
            players: playerSummaries(gameLogic),
          });
          console.log(`[Game] Claim window expired in room ${roomCode}`);
        }, CLAIM_WINDOW_MS);
        claimTimers.set(roomCode, timer);
      } else {
        // No match: advance to next player
        gameLogic.advanceTurn();
        const nextPlayer = gameLogic.getCurrentPlayer();
        io.to(roomCode).emit('TURN_ADVANCED', {
          currentPlayerName: nextPlayer?.name,
          currentPlayerId: nextPlayer?.id,
          currentPlayerIndex: gameLogic.getGameState().currentPlayerIndex,
        });
      }
    });

    /**
     * CLAIM_STACK: A player taps to claim. Three outcomes:
     *  - won: a match was live and this is the first valid tap
     *  - too slow: someone just won the race (within the grace window) → no penalty
     *  - wrong claim: tapped with no match on the table → forfeit a card to the stack
     */
    socket.on(
      'CLAIM_STACK',
      (data: ClaimStackRequest, callback?: (response: ClaimStackResponse) => void) => {
        const { roomCode, playerId } = data;

        const gameLogic = roomManager.getGameLogic(roomCode);
        if (!gameLogic) {
          if (callback)
            callback({ success: false, playerId, cardsWon: 0, nextCall: 2, message: 'Game not found' });
          return;
        }

        const { success, cardsWon, nextCall } = gameLogic.claimStack(playerId);

        if (success) {
          clearClaimTimer(roomCode);
          lastClaimResolvedAt.set(roomCode, Date.now());
          if (callback) callback({ success: true, playerId, cardsWon, nextCall });

          const player = gameLogic.getPlayers().find((p: any) => p.id === playerId);
          console.log(`[Game] ${player?.name} won the race in room ${roomCode} (${cardsWon} cards)`);
          broadcastStackClaimed(gameLogic, roomCode, player?.name, cardsWon, nextCall);
          return;
        }

        // Claim failed. Was it just a lost race (grace) or a genuine wrong claim?
        const sinceResolved = Date.now() - (lastClaimResolvedAt.get(roomCode) || 0);
        if (sinceResolved < CLAIM_GRACE_MS) {
          if (callback)
            callback({
              success: false,
              playerId,
              cardsWon: 0,
              nextCall: gameLogic.getGameState().currentCall,
              message: 'Too slow — someone beat you to it!',
            });
          return;
        }

        // Wrong claim: forfeit a card to the stack.
        const penaltyCard = gameLogic.penalizeWrongClaim(playerId);
        const player = gameLogic.getPlayers().find((p: any) => p.id === playerId);
        if (penaltyCard) {
          io.to(roomCode).emit('WRONG_CLAIM', {
            playerName: player?.name,
            penaltyCard,
            stackSize: gameLogic.getStackSize(),
            players: playerSummaries(gameLogic),
          });
          console.log(`[Game] ${player?.name} wrong-claimed in room ${roomCode} — forfeited a card`);
        }
        if (callback)
          callback({
            success: false,
            playerId,
            cardsWon: 0,
            nextCall: gameLogic.getGameState().currentCall,
            message: penaltyCard
              ? 'Wrong claim! You forfeited a card to the stack.'
              : 'Nothing to claim.',
          });
      }
    );

    /**
     * LEAVE_ROOM: Player leaves room
     */
    socket.on('LEAVE_ROOM', (data: LeaveRoomRequest) => {
      const { roomCode, playerId } = data;

      const result = roomManager.removePlayerFromRoom(roomCode, playerId);
      socket.leave(roomCode);

      if (result.success && result.roomExists) {
        const roomInfo = roomManager.getRoomInfo(roomCode);
        io.to(roomCode).emit('ROOM_UPDATED', roomInfo);
        console.log(`[Game] Player left room ${roomCode}`);
      } else if (!result.roomExists) {
        clearClaimTimer(roomCode);
        console.log(`[Game] Room ${roomCode} deleted`);
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      const roomCode = (socket.data as any).roomCode;
      const playerId = (socket.data as any).playerId;

      if (roomCode && playerId) {
        roomManager.removePlayerFromRoom(roomCode, playerId);
        io.to(roomCode).emit('PLAYER_DISCONNECTED', { playerId });
        console.log(`[Socket] Player disconnected from room ${roomCode}: ${playerId}`);
      }
    });
  });
}
