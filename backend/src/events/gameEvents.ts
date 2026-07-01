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
  CardValue,
} from '../types/game';

/** How long the claim race stays open before it auto-expires. */
const CLAIM_WINDOW_MS = 5000;
/** Grace period after a claim resolves during which late taps are "too slow" (no penalty). */
const CLAIM_GRACE_MS = 1200;
/** Bluff turn timeout — player is auto-skipped if they don't act in this window. */
const BLUFF_TURN_TIMEOUT_MS = 30_000;

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
  const bluffWindowTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const bluffTurnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Absolute epoch (ms) when the current turn timer expires per room, so reconnecting
  // players receive the remaining duration instead of a fresh 30-second window.
  const bluffTurnEndsAt = new Map<string, number>();

  // Reconnect grace period: key = `${roomCode}:${playerName}`
  // NOTE: Key uses playerName because the client doesn't persist its player ID across page reloads.
  // A stronger fix (player-ID tokens in localStorage) would prevent the name-squatting window.
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingReconnects = new Map<string, { oldPlayerId: string; roomCode: string; playerName: string }>();

  // Emoji allowlist — must stay in sync with REACTION_EMOJIS in BluffTableView.tsx
  const ALLOWED_REACTION_EMOJIS = new Set(['😂', '🔥', '👏', '😱', '🤡', '💀', '🎭', '👀']);

  const RECONNECT_GRACE_MS = 60_000; // 1 minute

  function clearClaimTimer(roomCode: string) {
    const t = claimTimers.get(roomCode);
    if (t) { clearTimeout(t); claimTimers.delete(roomCode); }
  }

  function clearBluffTimer(roomCode: string) {
    const t = bluffWindowTimers.get(roomCode);
    if (t) { clearTimeout(t); bluffWindowTimers.delete(roomCode); }
  }

  function clearBluffTurnTimer(roomCode: string) {
    const t = bluffTurnTimers.get(roomCode);
    if (t) { clearTimeout(t); bluffTurnTimers.delete(roomCode); }
    bluffTurnEndsAt.delete(roomCode);
  }

  function clearReconnectTimer(key: string) {
    const t = reconnectTimers.get(key);
    if (t) { clearTimeout(t); reconnectTimers.delete(key); }
  }

  function startBluffTurnTimer(roomCode: string) {
    clearBluffTurnTimer(roomCode);
    const endsAt = Date.now() + BLUFF_TURN_TIMEOUT_MS;
    io.to(roomCode).emit('BLUFF_TURN_TIMER', { endsAt });

    const t = setTimeout(() => {
      bluffTurnTimers.delete(roomCode);
      const bluffLogic = roomManager.getBluffLogic(roomCode);
      if (!bluffLogic || bluffLogic.isGameOver() || bluffLogic.isWaitingForRankPick()) return;

      const currentPlayer = bluffLogic.getCurrentPlayer();
      if (!currentPlayer) return;

      // Window open: accept previous play silently, advance turn
      if (bluffLogic.isBluffWindowOpen()) {
        clearBluffTimer(roomCode);
        bluffLogic.closeBluffWindow();
        const prevWinnerId = bluffLogic.checkWinner();
        io.to(roomCode).emit('BLUFF_WINDOW_CLOSED', { reason: 'timeout' });
        if (prevWinnerId) {
          const winner = bluffLogic.getWinner();
          io.to(roomCode).emit('BLUFF_GAME_WON', { winnerId: prevWinnerId, winnerName: winner?.name });
          return;
        }
        bluffLogic.advanceTurn();
        const nextPlayer = bluffLogic.getCurrentPlayer();
        io.to(roomCode).emit('BLUFF_PLAYER_SKIPPED', {
          skipperName: currentPlayer.name,
          currentPlayerId: nextPlayer?.id,
          currentPlayerName: nextPlayer?.name,
          seriesRank: bluffLogic.getCurrentSeriesRank(),
          autoSkipped: true,
        });
        startBluffTurnTimer(roomCode);
        return;
      }

      // Normal turn: auto-skip
      const result = bluffLogic.skipTurn(currentPlayer.id);
      if (!result.success) return;

      if (result.seriesDiscarded) {
        io.to(roomCode).emit('BLUFF_SERIES_DISCARDED', { message: `${currentPlayer.name} timed out — pile discarded` });
        const nextStarterName = bluffLogic.getPlayers().find(p => p.id === result.nextStarterId)?.name;
        io.to(roomCode).emit('BLUFF_RANK_PICK_NEEDED', { nextStarterId: result.nextStarterId, nextStarterName });
      } else {
        bluffLogic.advanceTurn();
        const nextPlayer = bluffLogic.getCurrentPlayer();
        io.to(roomCode).emit('BLUFF_PLAYER_SKIPPED', {
          skipperName: currentPlayer.name,
          currentPlayerId: nextPlayer?.id,
          currentPlayerName: nextPlayer?.name,
          seriesRank: bluffLogic.getCurrentSeriesRank(),
          autoSkipped: true,
        });
        startBluffTurnTimer(roomCode);
      }
      console.log(`[Bluff] ${currentPlayer.name} timed out in room ${roomCode}`);
    }, BLUFF_TURN_TIMEOUT_MS);

    bluffTurnTimers.set(roomCode, t);
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

      // ── Reconnect path: player returning within grace period ─────────────
      if (roomCode) {
        const reconnectKey = `${roomCode}:${playerName}`;
        const pending = pendingReconnects.get(reconnectKey);
        if (pending) {
          clearReconnectTimer(reconnectKey);
          pendingReconnects.delete(reconnectKey);

          const { oldPlayerId } = pending;

          // New socket adopts the old player ID so all game logic keeps working
          socket.join(roomCode);
          socket.join(oldPlayerId); // io.to(oldPlayerId) now reaches this socket
          (socket.data as any).roomCode = roomCode;
          (socket.data as any).playerId = oldPlayerId;

          // Re-send full game state so the reconnected client rebuilds its UI
          const gameMode = roomManager.getGameMode(roomCode);
          if (gameMode === 'bluff') {
            const bluffLogic = roomManager.getBluffLogic(roomCode);
            if (bluffLogic) {
              socket.emit('BLUFF_GAME_STARTED', {
                players: bluffLogic.getPlayerSummaries(),
                currentPlayerId: bluffLogic.getCurrentPlayer()?.id,
                currentPlayerName: bluffLogic.getCurrentPlayer()?.name,
                pileSize: bluffLogic.getPileSize(),
                seriesRank: bluffLogic.getCurrentSeriesRank(),
                kittySize: bluffLogic.getKittySize(),
              });
              socket.emit('MY_HAND', { cards: bluffLogic.getHandForPlayer(oldPlayerId) });
              // Tell the client which player ID it owns (new socket ID ≠ old player ID)
              socket.emit('MY_PLAYER_ID', { playerId: oldPlayerId });

              // Resume turn timer only if it's this player's turn
              if (bluffLogic.getCurrentPlayer()?.id === oldPlayerId) {
                startBluffTurnTimer(roomCode);
              }
            }
          }

          io.to(roomCode).emit('PLAYER_RECONNECTED', { playerId: oldPlayerId, playerName });
          callback({ success: true, roomCode, players: [] });
          console.log(`[Socket] ${playerName} reconnected to room ${roomCode}`);
          return;
        }
      }

      // If no room code, create new room
      if (!roomCode) {
        const gameMode = data.gameMode || 'speed-match';
        roomCode = roomManager.createRoom(playerId, playerName, 4, gameMode);
        console.log(`[Game] New room created: ${roomCode} by ${playerName} (mode: ${gameMode})`);
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
        const gameMode = roomManager.getGameMode(roomCode);

        if (gameMode === 'bluff') {
          const bluffLogic = roomManager.getBluffLogic(roomCode);
          if (!bluffLogic) return;

          // Broadcast game started (hand sizes only, not actual cards)
          io.to(roomCode).emit('BLUFF_GAME_STARTED', {
            players: bluffLogic.getPlayerSummaries(),
            currentPlayerId: bluffLogic.getCurrentPlayer()?.id,
            currentPlayerName: bluffLogic.getCurrentPlayer()?.name,
            pileSize: 0,
            seriesRank: bluffLogic.getCurrentSeriesRank(),
            kittySize: bluffLogic.getKittySize(),
          });

          // Send each player's private hand
          const roomInfo = roomManager.getRoomInfo(roomCode);
          (roomInfo?.playerIds || []).forEach((pid: string) => {
            io.to(pid).emit('MY_HAND', { cards: bluffLogic.getHandForPlayer(pid) });
          });

          startBluffTurnTimer(roomCode);
          console.log(`[Game] Bluff game started in room ${roomCode}`);
        } else {
          const gameLogic = roomManager.getGameLogic(roomCode);
          io.to(roomCode).emit('GAME_STARTED', {
            gameState: gameLogic?.getGameState(),
            players: playerSummaries(gameLogic),
            currentPlayerName: gameLogic?.getCurrentPlayer()?.name,
            currentPlayerId: gameLogic?.getCurrentPlayer()?.id,
          });
          console.log(`[Game] Speed Match game started in room ${roomCode}`);
        }
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
        clearBluffTimer(roomCode);
        const gameMode = roomManager.getGameMode(roomCode);

        if (gameMode === 'bluff') {
          const bluffLogic = roomManager.getBluffLogic(roomCode);
          if (!bluffLogic) return;

          io.to(roomCode).emit('BLUFF_GAME_STARTED', {
            players: bluffLogic.getPlayerSummaries(),
            currentPlayerId: bluffLogic.getCurrentPlayer()?.id,
            currentPlayerName: bluffLogic.getCurrentPlayer()?.name,
            pileSize: 0,
            seriesRank: bluffLogic.getCurrentSeriesRank(),
            kittySize: bluffLogic.getKittySize(),
          });

          const roomInfo = roomManager.getRoomInfo(roomCode);
          (roomInfo?.playerIds || []).forEach((pid: string) => {
            io.to(pid).emit('MY_HAND', { cards: bluffLogic.getHandForPlayer(pid) });
          });
          startBluffTurnTimer(roomCode);
          console.log(`[Game] Bluff game restarted in room ${roomCode}`);
        } else {
          const gameLogic = roomManager.getGameLogic(roomCode);
          io.to(roomCode).emit('GAME_STARTED', {
            gameState: gameLogic?.getGameState(),
            players: playerSummaries(gameLogic),
            currentPlayerName: gameLogic?.getCurrentPlayer()?.name,
            currentPlayerId: gameLogic?.getCurrentPlayer()?.id,
          });
          console.log(`[Game] Speed Match game restarted in room ${roomCode}`);
        }
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
     * PLAY_BLUFF_CARDS: Current player plays cards face-down claiming them as the series rank.
     * If there is an open bluff window from the previous play, this play implicitly accepts it
     * (no Show) and closes the window before processing the new play.
     */
    socket.on(
      'PLAY_BLUFF_CARDS',
      (
        data: { roomCode: string; cardIndices: number[]; claimedRank: CardValue; claimedCount: number },
        callback?: (res: any) => void
      ) => {
        const { roomCode, cardIndices, claimedRank, claimedCount } = data;
        const playerId = (socket.data as any).playerId;

        const bluffLogic = roomManager.getBluffLogic(roomCode);
        if (!bluffLogic) {
          if (callback) callback({ success: false, message: 'Bluff game not found' });
          return;
        }

        clearBluffTurnTimer(roomCode);
        roomManager.touch(roomCode);

        // If a bluff window is open, this new play implicitly accepts the previous play (no Show).
        // Close the window first and check if the previous player won by emptying their hand.
        if (bluffLogic.isBluffWindowOpen()) {
          clearBluffTimer(roomCode);
          bluffLogic.closeBluffWindow();
          const prevWinnerId = bluffLogic.checkWinner();
          io.to(roomCode).emit('BLUFF_WINDOW_CLOSED', { reason: 'next-play' });
          if (prevWinnerId) {
            const winner = bluffLogic.getWinner();
            io.to(roomCode).emit('BLUFF_GAME_WON', {
              winnerId: prevWinnerId,
              winnerName: winner?.name,
              nextGameStarterId: bluffLogic.getNextGameStarterId(),
            });
            console.log(`[Bluff] ${winner?.name} won room ${roomCode} (previous play accepted)`);
            if (callback) callback({ success: false, message: 'Previous player won the game' });
            return;
          }
        }

        const result = bluffLogic.playCards(playerId, cardIndices, claimedRank, claimedCount);
        if (!result.success) {
          if (callback) callback(result);
          return;
        }
        if (callback) callback({ success: true });

        // CRITICAL: send the player's updated hand immediately so their next selection uses correct indices
        socket.emit('MY_HAND', { cards: bluffLogic.getHandForPlayer(playerId) });

        // Capture played-by name before advancing turn
        const playedByName = bluffLogic.getPlayers().find((p) => p.id === playerId)?.name;
        const seriesRank = bluffLogic.getCurrentSeriesRank();

        // Advance turn — next player must Show or play
        bluffLogic.advanceTurn();
        const nextPlayer = bluffLogic.getCurrentPlayer();

        io.to(roomCode).emit('BLUFF_CARDS_PLAYED', {
          playerName: playedByName,
          playedById: playerId,
          claimedCount,
          claimedRank: seriesRank ?? claimedRank,
          newPileSize: bluffLogic.getPileSize(),
          players: bluffLogic.getPlayerSummaries(),
          seriesRank,
          currentPlayerId: nextPlayer?.id,
          currentPlayerName: nextPlayer?.name,
        });

        // SHOW window is open indefinitely — no auto-close timer.
        // It closes when: (a) someone calls Show, or (b) the next player plays.
        io.to(roomCode).emit('BLUFF_WINDOW_OPEN', {
          playedByName,
          playedById: playerId,
          claimedCount,
          claimedRank: seriesRank ?? claimedRank,
        });

        startBluffTurnTimer(roomCode);
        console.log(`[Bluff] ${playedByName} played ${claimedCount}x${seriesRank} in room ${roomCode}`);
      }
    );

    /**
     * SKIP_BLUFF_TURN: Current player skips their turn.
     * If all players skip consecutively, the series is discarded.
     */
    socket.on(
      'SKIP_BLUFF_TURN',
      (data: { roomCode: string }, callback?: (res: any) => void) => {
        const { roomCode } = data;
        const playerId = (socket.data as any).playerId;

        const bluffLogic = roomManager.getBluffLogic(roomCode);
        if (!bluffLogic) {
          if (callback) callback({ success: false, message: 'Bluff game not found' });
          return;
        }

        clearBluffTurnTimer(roomCode);
        roomManager.touch(roomCode);

        const result = bluffLogic.skipTurn(playerId);
        if (!result.success) {
          if (callback) callback(result);
          return;
        }
        if (callback) callback({ success: true });

        const skipperName = bluffLogic.getPlayers().find((p) => p.id === playerId)?.name;

        if (result.seriesDiscarded) {
          io.to(roomCode).emit('BLUFF_SERIES_DISCARDED', { message: 'All players skipped — pile discarded' });
          const nextStarterName = bluffLogic.getPlayers().find((p) => p.id === result.nextStarterId)?.name;
          io.to(roomCode).emit('BLUFF_RANK_PICK_NEEDED', { nextStarterId: result.nextStarterId, nextStarterName });
          console.log(`[Bluff] Series discarded in room ${roomCode} — ${nextStarterName} picks rank`);
        } else {
          bluffLogic.advanceTurn();
          const nextPlayer = bluffLogic.getCurrentPlayer();
          io.to(roomCode).emit('BLUFF_PLAYER_SKIPPED', {
            skipperName,
            currentPlayerId: nextPlayer?.id,
            currentPlayerName: nextPlayer?.name,
            seriesRank: bluffLogic.getCurrentSeriesRank(),
          });
          startBluffTurnTimer(roomCode);
          console.log(`[Bluff] ${skipperName} skipped in room ${roomCode}`);
        }
      }
    );

    /**
     * SET_SERIES_RANK: Series starter picks the rank for the next series.
     */
    socket.on(
      'SET_SERIES_RANK',
      (data: { roomCode: string; rank: CardValue }, callback?: (res: any) => void) => {
        const { roomCode, rank } = data;
        const playerId = (socket.data as any).playerId;

        const bluffLogic = roomManager.getBluffLogic(roomCode);
        if (!bluffLogic) {
          if (callback) callback({ success: false, message: 'Bluff game not found' });
          return;
        }

        clearBluffTurnTimer(roomCode);

        const result = bluffLogic.setSeriesRank(playerId, rank);
        if (!result.success) {
          if (callback) callback(result);
          return;
        }
        if (callback) callback({ success: true });

        const currentPlayer = bluffLogic.getCurrentPlayer();
        const starterName = bluffLogic.getPlayers().find((p) => p.id === playerId)?.name;

        io.to(roomCode).emit('BLUFF_SERIES_STARTED', {
          seriesRank: rank,
          starterId: playerId,
          starterName,
          currentPlayerId: currentPlayer?.id,
          currentPlayerName: currentPlayer?.name,
        });

        startBluffTurnTimer(roomCode);
        console.log(`[Bluff] New series rank ${rank} set by ${starterName} in room ${roomCode}`);
      }
    );

    /**
     * CALL_BLUFF: Any player (not the one who played) calls "show" on the last play.
     */
    socket.on(
      'CALL_BLUFF',
      (data: { roomCode: string }, callback?: (res: any) => void) => {
        const { roomCode } = data;
        const callerId = (socket.data as any).playerId;

        const bluffLogic = roomManager.getBluffLogic(roomCode);
        if (!bluffLogic) {
          if (callback) callback({ success: false, message: 'Bluff game not found' });
          return;
        }

        if (!bluffLogic.isBluffWindowOpen()) {
          if (callback) callback({ success: false, message: 'No show window open' });
          return;
        }

        clearBluffTimer(roomCode);
        clearBluffTurnTimer(roomCode);
        roomManager.touch(roomCode);

        const result = bluffLogic.callBluff(callerId);
        if (!result.success) {
          if (callback) callback(result);
          return;
        }
        if (callback) callback({ success: true });

        // Send each player's updated hand immediately after cards move
        const roomInfo = roomManager.getRoomInfo(roomCode);
        (roomInfo?.playerIds || []).forEach((pid: string) => {
          io.to(pid).emit('MY_HAND', { cards: bluffLogic.getHandForPlayer(pid) });
        });

        // Check winner NOW (before emitting anything) so we know if rank-pick is needed
        const winnerId = bluffLogic.checkWinner();

        const callerName = bluffLogic.getPlayers().find((p) => p.id === callerId)?.name;
        const nextStarterName = bluffLogic.getPlayers().find((p) => p.id === result.nextStarterId)?.name;
        const loserId = bluffLogic.getPlayers().find((p) => p.name === result.loserName)?.id;

        // Reveal the last play's cards
        io.to(roomCode).emit('BLUFF_CALLED', {
          callerName,
          callerId,
          revealedCards: result.revealedCards,
          claimedRank: result.claimedRank,
          callerWins: result.callerWins,
          loserName: result.loserName,
          loserId,
          totalPileCards: result.loserReceivesCards,
        });

        // Settlement — embed rank-pick info so frontend can update in one event
        io.to(roomCode).emit('BLUFF_SETTLED', {
          loserName: result.loserName,
          loserId,
          cardsReceived: result.loserReceivesCards,
          callerWins: result.callerWins,
          newPileSize: 0,
          players: bluffLogic.getPlayerSummaries(),
          currentPlayerId: bluffLogic.getCurrentPlayer()?.id,
          currentPlayerName: bluffLogic.getCurrentPlayer()?.name,
          // Rank-pick info — null when game is already won
          rankPickNeeded: !winnerId,
          nextStarterId: winnerId ? null : result.nextStarterId,
          nextStarterName: winnerId ? null : nextStarterName,
        });

        io.to(roomCode).emit('BLUFF_WINDOW_CLOSED', { reason: 'called' });

        if (winnerId) {
          const winner = bluffLogic.getWinner();
          io.to(roomCode).emit('BLUFF_GAME_WON', {
            winnerId,
            winnerName: winner?.name,
            nextGameStarterId: bluffLogic.getNextGameStarterId(),
          });
        } else {
          // Keep BLUFF_RANK_PICK_NEEDED as a redundant safety net
          io.to(roomCode).emit('BLUFF_RANK_PICK_NEEDED', {
            nextStarterId: result.nextStarterId,
            nextStarterName,
          });
        }

        console.log(`[Bluff] Show called in room ${roomCode} — callerWins: ${result.callerWins}, nextStarter: ${nextStarterName}`);
      }
    );

    /**
     * SEND_CHAT: Player sends a chat message to the room
     */
    socket.on('SEND_CHAT', (data: { roomCode: string; text: string; playerName: string }) => {
      if (!data.roomCode || !data.text?.trim()) return;
      io.to(data.roomCode).emit('CHAT_MESSAGE', {
        playerName: data.playerName || 'Unknown',
        text: data.text.trim().slice(0, 200),
        timestamp: Date.now(),
        id: Math.random().toString(36).slice(2, 10),
      });
    });

    /**
     * SEND_REACTION: Player sends an emoji reaction to the room
     */
    socket.on('SEND_REACTION', (data: { roomCode: string; emoji: string; playerName: string }) => {
      if (!data.roomCode || !data.emoji) return;
      if (!ALLOWED_REACTION_EMOJIS.has(data.emoji)) return;
      io.to(data.roomCode).emit('REACTION', {
        playerName: data.playerName || 'Unknown',
        emoji: data.emoji,
        id: Math.random().toString(36).slice(2, 10),
      });
    });

    /**
     * LEAVE_ROOM: Player voluntarily leaves room
     */
    socket.on('LEAVE_ROOM', (data: LeaveRoomRequest) => {
      const { roomCode, playerId } = data;

      // Look up name before removal
      const roomInfo = roomManager.getRoomInfo(roomCode);
      const playerIdx = (roomInfo?.playerIds ?? []).indexOf(playerId);
      const playerName = playerIdx >= 0 ? (roomInfo!.playerNames[playerIdx] ?? 'A player') : 'A player';
      const wasActive = roomInfo?.status === 'active';

      // Cancel any pending reconnect grace timer for this player
      const reconnectKey = `${roomCode}:${playerName}`;
      clearReconnectTimer(reconnectKey);
      pendingReconnects.delete(reconnectKey);

      // Remove from Bluff's activePlayers before splicing from room
      if (wasActive) {
        const bluffLgcLeave = roomManager.getBluffLogic(roomCode);
        if (bluffLgcLeave) {
          const { winnerId: bluffWinnerLeave } = bluffLgcLeave.removePlayer(playerId);
          if (bluffWinnerLeave) {
            const w = bluffLgcLeave.getWinner();
            if (w) io.to(roomCode).emit('BLUFF_GAME_WON', { winnerName: w.name, winnerId: w.id });
          }
        }
      }

      const result = roomManager.removePlayerFromRoom(roomCode, playerId);
      socket.leave(roomCode);

      if (result.success && result.roomExists) {
        const updated = roomManager.getRoomInfo(roomCode);
        io.to(roomCode).emit('ROOM_UPDATED', updated);

        if (wasActive) {
          io.to(roomCode).emit('PLAYER_DISCONNECTED', {
            playerId,
            playerName,
            remainingCount: updated?.playerCount ?? 0,
          });
          if ((updated?.playerCount ?? 0) <= 1) {
            io.to(roomCode).emit('GAME_ABANDONED', {
              reason: `${playerName} left the game — not enough players to continue.`,
            });
          }
        }
        console.log(`[Game] ${playerName} left room ${roomCode}`);
      } else if (!result.roomExists) {
        clearClaimTimer(roomCode);
        clearBluffTimer(roomCode);
        clearBluffTurnTimer(roomCode);
        console.log(`[Game] Room ${roomCode} deleted after ${playerName} left`);
      }
    });

    /**
     * Handle disconnect (network loss / closed tab)
     * Active-game disconnects get a 60-second grace period before removal.
     */
    socket.on('disconnect', () => {
      const roomCode = (socket.data as any).roomCode;
      const playerId = (socket.data as any).playerId;

      if (roomCode && playerId) {
        const roomInfo = roomManager.getRoomInfo(roomCode);
        const playerIdx = (roomInfo?.playerIds ?? []).indexOf(playerId);
        const playerName = playerIdx >= 0 ? (roomInfo!.playerNames[playerIdx] ?? 'A player') : 'A player';
        const wasActive = roomInfo?.status === 'active';

        if (wasActive) {
          // Only pause the turn timer if it's this player's turn
          const bluffLogic = roomManager.getBluffLogic(roomCode);
          if (bluffLogic?.getCurrentPlayer()?.id === playerId) {
            clearBluffTurnTimer(roomCode);
          }

          const reconnectKey = `${roomCode}:${playerName}`;
          pendingReconnects.set(reconnectKey, { oldPlayerId: playerId, roomCode, playerName });
          io.to(roomCode).emit('PLAYER_RECONNECTING', { playerId, playerName });
          console.log(`[Socket] ${playerName} disconnected — 60s grace period started (room ${roomCode})`);

          const timer = setTimeout(() => {
            reconnectTimers.delete(reconnectKey);
            pendingReconnects.delete(reconnectKey);

            clearBluffTurnTimer(roomCode);

            // Remove from Bluff's activePlayers so turn order stays consistent
            const bluffLgc = roomManager.getBluffLogic(roomCode);
            if (bluffLgc) {
              const { winnerId: bluffWinner } = bluffLgc.removePlayer(playerId);
              if (bluffWinner) {
                const w = bluffLgc.getWinner();
                if (w) io.to(roomCode).emit('BLUFF_GAME_WON', { winnerName: w.name, winnerId: w.id });
              }
            }

            const result = roomManager.removePlayerFromRoom(roomCode, playerId);

            if (result.roomExists) {
              const updated = roomManager.getRoomInfo(roomCode);
              io.to(roomCode).emit('PLAYER_DISCONNECTED', {
                playerId,
                playerName,
                remainingCount: updated?.playerCount ?? 0,
              });
              if ((updated?.playerCount ?? 0) <= 1) {
                io.to(roomCode).emit('GAME_ABANDONED', {
                  reason: `${playerName} disconnected — not enough players to continue.`,
                });
              }
            } else {
              clearClaimTimer(roomCode);
              clearBluffTimer(roomCode);
            }
            console.log(`[Socket] ${playerName} grace period expired — removed from room ${roomCode}`);
          }, RECONNECT_GRACE_MS);

          reconnectTimers.set(reconnectKey, timer);
        } else {
          // Not in an active game — remove immediately (lobby disconnect)
          clearBluffTurnTimer(roomCode);
          const result = roomManager.removePlayerFromRoom(roomCode, playerId);
          if (result.roomExists) {
            const updated = roomManager.getRoomInfo(roomCode);
            io.to(roomCode).emit('ROOM_UPDATED', updated);
          } else {
            clearClaimTimer(roomCode);
            clearBluffTimer(roomCode);
          }
          console.log(`[Socket] ${playerName} disconnected from room ${roomCode}`);
        }
      }
    });
  });
}
