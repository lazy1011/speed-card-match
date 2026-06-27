'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, Card, CardValue, GameEvent } from '@/types/game';
import { sfx, initAudioUnlock, setMuted as setSfxMuted } from '@/utils/sounds';
import { preloadCardImages } from '@/utils/cardUtils';

export interface ChatMessage {
  id: string;
  playerName: string;
  text: string;
  timestamp: number;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export const useGameSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [winner, setWinner] = useState<string | null>(null);
  const [recentCard, setRecentCard] = useState<Card | null>(null);
  const [stackSize, setStackSize] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claimEndsAt, setClaimEndsAt] = useState<number | null>(null);
  const [lastClaimedBy, setLastClaimedBy] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [playerLeft, setPlayerLeft] = useState<string | null>(null);
  const [gameAbandoned, setGameAbandoned] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // New feature state
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null);
  const [claimStreak, setClaimStreak] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const playerLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchAvailableAtRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      setSfxMuted(!m);
      return !m;
    });
  }, []);

  const mapPlayers = (arr: any[]): Player[] =>
    (arr || []).map((p, idx) => ({
      id: p.id ?? `player-${idx}`,
      name: p.name,
      hand: [],
      deck: [],
      claimedCards: [],
      isActive: p.isActive ?? true,
      turnOrder: idx,
      cardCount: p.cardCount ?? 0,
    }));

  useEffect(() => {
    initAudioUnlock();
    preloadCardImages();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const newSocket = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setConnected(true);
      setReconnecting(false);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
      setReconnecting(true);
    });

    newSocket.on('reconnect_failed', () => setReconnecting(false));

    newSocket.on('ROOM_UPDATED', (roomInfo: any) => {
      console.log('[Socket] Room updated:', roomInfo);
      setPlayers(
        roomInfo.playerNames.map((name: string, idx: number) => ({
          id: `player-${idx}`,
          name,
          hand: [],
          deck: [],
          claimedCards: [],
          isActive: true,
          turnOrder: idx,
          cardCount: 13,
        }))
      );
    });

    newSocket.on('GAME_STARTED', (data: any) => {
      console.log('[Socket] Game started:', data);
      setGameStarted(true);
      setGameState(data.gameState);
      setStackSize(data.gameState?.stack?.length ?? 0);
      if (data.players) setPlayers(mapPlayers(data.players));
      setCurrentPlayerName(data.currentPlayerName);
      setCurrentPlayerId(data.currentPlayerId ?? null);
      setWinner(null);
      setRecentCard(null);
      setCanClaim(false);
      setClaimEndsAt(null);
      setReactionTimeMs(null);
      setClaimStreak(0);
      setChatMessages([]);
      matchAvailableAtRef.current = null;
      setMessage('Game started! Get ready!');
      sfx.shuffle();
    });

    newSocket.on('CARD_DRAWN', (data: any) => {
      console.log('[Socket] Card drawn:', data);
      setRecentCard(data.drawnCard || null);
      if (typeof data.stackSize === 'number') setStackSize(data.stackSize);
      if (data.players) setPlayers(mapPlayers(data.players));
      setMessage(
        `${data.playerName} drew ${data.drawnCard ? data.drawnCard.value : 'a card'}${
          data.matched ? ' — MATCH! Tap CLAIM! 🎯' : ''
        }`
      );
      sfx.draw();
      setTimeout(() => sfx.flip(), 120);
    });

    newSocket.on('MATCH_AVAILABLE', (data: any) => {
      console.log('[Socket] Match available — claim race open:', data);
      matchAvailableAtRef.current = Date.now();
      setCanClaim(true);
      setLastClaimedBy(null);
      if (typeof data.stackSize === 'number') setStackSize(data.stackSize);
      setClaimEndsAt(Date.now() + (data.claimWindowMs ?? 5000));
      setMessage(`⚡ MATCH on ${data.currentCall}! First to CLAIM wins ${data.stackSize} cards!`);
      sfx.match();
    });

    newSocket.on('MATCH_EXPIRED', (data: any) => {
      console.log('[Socket] Match expired:', data);
      setCanClaim(false);
      setClaimEndsAt(null);
      matchAvailableAtRef.current = null;
      if (typeof data.stackSize === 'number') setStackSize(data.stackSize);
      if (data.players) setPlayers(mapPlayers(data.players));
      setCurrentPlayerName(data.currentPlayerName);
      setCurrentPlayerId(data.currentPlayerId ?? null);
      setGameState((prev) =>
        prev ? { ...prev, currentPlayerIndex: data.currentPlayerIndex } : null
      );
      setMessage('⏱️ Nobody claimed in time — play moves on!');
    });

    newSocket.on('WRONG_CLAIM', (data: any) => {
      console.log('[Socket] Wrong claim:', data);
      if (typeof data.stackSize === 'number') setStackSize(data.stackSize);
      if (data.players) setPlayers(mapPlayers(data.players));
      setMessage(`🚫 ${data.playerName} claimed with no match and forfeited a card!`);
      sfx.wrong();
    });

    newSocket.on('TURN_ADVANCED', (data: any) => {
      console.log('[Socket] Turn advanced:', data);
      setCurrentPlayerName(data.currentPlayerName);
      setCurrentPlayerId(data.currentPlayerId ?? null);
      setGameState((prev) =>
        prev ? { ...prev, currentPlayerIndex: data.currentPlayerIndex } : null
      );
    });

    newSocket.on('STACK_CLAIMED', (data: any) => {
      console.log('[Socket] Stack claimed:', data);
      setCanClaim(false);
      setClaimEndsAt(null);
      setLastClaimedBy(data.playerName || null);
      setRecentCard(null);
      if (typeof data.newStackSize === 'number') setStackSize(data.newStackSize);
      else setStackSize(0);
      if (data.players) setPlayers(mapPlayers(data.players));
      setMessage(
        `${data.playerName} grabbed ${data.cardsWon} cards! Next call: ${data.nextCall}`
      );
      setGameState((prev) =>
        prev ? { ...prev, currentCall: data.nextCall } : null
      );
      sfx.claim();

      // Reaction time and streak tracking
      const myId = socketRef.current?.id;
      if (myId && data.claimerId === myId && matchAvailableAtRef.current !== null) {
        const rt = Date.now() - matchAvailableAtRef.current;
        setReactionTimeMs(rt);
        setClaimStreak(s => s + 1);
        // Clear reaction time badge after 4s
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = setTimeout(() => setReactionTimeMs(null), 4000);
      } else if (data.claimerId !== (socketRef.current?.id)) {
        setClaimStreak(0);
      }
      matchAvailableAtRef.current = null;
    });

    newSocket.on('PLAYER_ELIMINATED', (data: any) => {
      console.log('[Socket] Player eliminated:', data);
      setMessage(`${data.playerName} is out! ${data.remainingPlayers} players left.`);
    });

    newSocket.on('GAME_WON', (data: any) => {
      console.log('[Socket] Game won:', data);
      setWinner(data.winnerName);
      setMessage(`🏆 ${data.winnerName} wins with ${data.finalCardCount} cards!`);
      sfx.win();
    });

    newSocket.on('PLAYER_DISCONNECTED', (data: any) => {
      console.log('[Socket] Player disconnected:', data);
      const name = data?.playerName ?? 'A player';
      setMessage(`${name} disconnected.`);
      if (playerLeftTimerRef.current) clearTimeout(playerLeftTimerRef.current);
      setPlayerLeft(name);
      playerLeftTimerRef.current = setTimeout(() => setPlayerLeft(null), 5000);
    });

    newSocket.on('GAME_ABANDONED', (data: any) => {
      setGameAbandoned(data?.reason ?? 'Not enough players to continue.');
    });

    newSocket.on('CHAT_MESSAGE', (data: any) => {
      const msg: ChatMessage = {
        id: data.id ?? uid(),
        playerName: data.playerName,
        text: data.text,
        timestamp: data.timestamp ?? Date.now(),
      };
      setChatMessages(prev => [...prev.slice(-199), msg]);
    });

    return () => {
      if (playerLeftTimerRef.current) clearTimeout(playerLeftTimerRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      newSocket.close();
    };
  }, []);

  const joinRoom = useCallback(
    (playerName: string, joinCode?: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('JOIN_ROOM', { playerName, roomCode: joinCode }, (response: any) => {
        console.log('[Socket] Join response:', response);
        if (response.success) {
          setRoomCode(response.roomCode);
          setMessage(`Joined room: ${response.roomCode}`);
        } else {
          setMessage(`Error: ${response.message}`);
        }
      });
    },
    []
  );

  const startGame = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('START_GAME', { roomCode }, (result: any) => {
      console.log('[Socket] Start game result:', result);
      if (!result.success) setMessage(`Error: ${result.message}`);
    });
  }, [roomCode]);

  const drawCard = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    const playerId = socketRef.current.id;
    socketRef.current.emit('DRAW_CARD', { roomCode, playerId }, (response: any) => {
      console.log('[Socket] Draw card response:', response);
      if (!response.success) setMessage(`Error: ${response.message}`);
    });
  }, [roomCode]);

  const claimStack = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    const playerId = socketRef.current.id;
    socketRef.current.emit('CLAIM_STACK', { roomCode, playerId, timestamp: Date.now() }, (response: any) => {
      console.log('[Socket] Claim stack response:', response);
      if (!response.success) setMessage(`Error: ${response.message}`);
    });
  }, [roomCode]);

  const restartGame = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('RESTART_GAME', { roomCode }, (result: any) => {
      if (!result?.success) setMessage(`Error: ${result?.message}`);
    });
  }, [roomCode]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    const playerId = socketRef.current.id;
    socketRef.current.emit('LEAVE_ROOM', { roomCode, playerId });
    setRoomCode(null);
    setGameStarted(false);
    setWinner(null);
    setGameAbandoned(null);
    setPlayerLeft(null);
    setReactionTimeMs(null);
    setClaimStreak(0);
    setChatMessages([]);
    setMessage('Left the room');
  }, [roomCode]);

  const sendChat = useCallback((text: string, playerName: string) => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('SEND_CHAT', { roomCode, text, playerName });
  }, [roomCode]);

  const sendReaction = useCallback((emoji: string, playerName: string) => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('SEND_REACTION', { roomCode, emoji, playerName });
  }, [roomCode]);

  return {
    socket: socketRef.current,
    connected,
    roomCode,
    players,
    gameState,
    gameStarted,
    currentPlayerName,
    currentPlayerId,
    myId: socketRef.current?.id ?? null,
    message,
    winner,
    recentCard,
    stackSize,
    canClaim,
    claimEndsAt,
    lastClaimedBy,
    muted,
    reconnecting,
    playerLeft,
    gameAbandoned,
    // New features
    reactionTimeMs,
    claimStreak,
    chatMessages,
    toggleMute,
    joinRoom,
    startGame,
    restartGame,
    drawCard,
    claimStack,
    leaveRoom,
    sendChat,
    sendReaction,
  };
};
