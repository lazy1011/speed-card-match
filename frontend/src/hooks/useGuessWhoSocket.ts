'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GW_CHARACTERS } from '@/data/guessWhoData';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export type GWPhase = 'LOBBY' | 'SELECTING' | 'PLAYING' | 'FINISHED';

export interface GWQuestionLogEntry {
  questionId: string;
  questionText: string;
  answer: boolean;
  askerName: string;
  askerId: string;
}

export interface GWGameResult {
  won: boolean;
  correct: boolean;
  winnerName: string;
  loserName: string;
  guessedCharacterId: number;
  opponentCharacterId: number;
  opponentCharacterName: string;
}

export interface GWPlayerInfo {
  id: string;
  name: string;
}

export function useGuessWhoSocket() {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<GWPhase>('LOBBY');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('');
  const [players, setPlayers] = useState<GWPlayerInfo[]>([]);
  const [mySecretCharacterId, setMySecretCharacterId] = useState<number | null>(null);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [currentTurnPlayerName, setCurrentTurnPlayerName] = useState<string | null>(null);
  const [turnEndsAt, setTurnEndsAt] = useState<number | null>(null);
  const [questionLog, setQuestionLog] = useState<GWQuestionLogEntry[]>([]);
  const [lastQuestionResult, setLastQuestionResult] = useState<GWQuestionLogEntry | null>(null);
  const [gameResult, setGameResult] = useState<GWGameResult | null>(null);
  const [message, setMessage] = useState('');
  const [opponentLeft, setOpponentLeft] = useState(false);

  // Local elimination state (not synced — each player manages their own board)
  const [eliminatedIds, setEliminatedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = sock;

    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));

    sock.on('GW_ROOM_CREATED', (data: { roomCode: string; playerId: string; playerName: string }) => {
      setRoomCode(data.roomCode);
      setMyId(data.playerId);
      setMyName(data.playerName);
      setPlayers([{ id: data.playerId, name: data.playerName }]);
      setMessage('Room created — share the code with your opponent');
    });

    sock.on('GW_ROOM_JOINED', (data: { roomCode: string; playerId: string; playerName: string; players: GWPlayerInfo[] }) => {
      setRoomCode(data.roomCode);
      setMyId(data.playerId);
      setMyName(data.playerName);
      setPlayers(data.players);
      setMessage('');
    });

    sock.on('GW_PLAYER_JOINED', (data: { player: GWPlayerInfo }) => {
      setPlayers(prev => [...prev.filter(p => p.id !== data.player.id), data.player]);
      setMessage('');
    });

    sock.on('GW_ERROR', (data: { message: string }) => {
      setMessage(data.message);
    });

    sock.on('GW_SELECTION_PHASE', () => {
      setPhase('SELECTING');
      setMessage('Select your secret character!');
    });

    sock.on('GW_CHARACTER_CONFIRMED', (data: { characterId: number }) => {
      setMySecretCharacterId(data.characterId);
      const char = GW_CHARACTERS.find(c => c.id === data.characterId);
      setMessage(`You chose ${char?.name ?? 'a character'} — waiting for opponent…`);
    });

    sock.on('GW_OPPONENT_SELECTED', () => {
      setOpponentHasSelected(true);
    });

    sock.on('GW_TURN_START', (data: { currentPlayerId: string; currentPlayerName: string; turnEndsAt: number }) => {
      setPhase('PLAYING');
      setCurrentTurnPlayerId(data.currentPlayerId);
      setCurrentTurnPlayerName(data.currentPlayerName);
      setTurnEndsAt(data.turnEndsAt);
      setLastQuestionResult(null);
      setMessage('');
    });

    sock.on('GW_QUESTION_RESULT', (data: GWQuestionLogEntry) => {
      setLastQuestionResult(data);
      setQuestionLog(prev => [data, ...prev]);
    });

    sock.on('GW_GAME_OVER', (data: {
      winnerId: string; winnerName: string; loserId: string; loserName: string;
      guesserId: string; guessedCharacterId: number;
      opponentCharacterId: number; opponentCharacterName: string; correct: boolean;
    }) => {
      setPhase('FINISHED');
      setCurrentTurnPlayerId(null);
      setTurnEndsAt(null);
      const myCurrentId = myId ?? sock.id ?? '';
      setGameResult({
        won: data.winnerId === myCurrentId,
        correct: data.correct,
        winnerName: data.winnerName,
        loserName: data.loserName,
        guessedCharacterId: data.guessedCharacterId,
        opponentCharacterId: data.opponentCharacterId,
        opponentCharacterName: data.opponentCharacterName,
      });
    });

    sock.on('GW_OPPONENT_LEFT', () => {
      setOpponentLeft(true);
      setPhase('FINISHED');
    });

    sock.on('GW_PLAYER_RECONNECTING', (data: { playerName: string }) => {
      setMessage(`${data.playerName} lost connection — waiting up to 60s…`);
    });

    sock.on('GW_PLAYER_RECONNECTED', (data: { playerName: string }) => {
      setMessage(`${data.playerName} reconnected!`);
      setTimeout(() => setMessage(''), 3000);
    });

    sock.on('GW_RECONNECTED', (data: {
      roomCode: string; playerId: string; playerName: string;
      phase: string; myCharacterId: number | null;
      opponentName: string; opponentHasSelected: boolean;
      currentTurnPlayerId: string | null; turnEndsAt: number | null;
    }) => {
      setRoomCode(data.roomCode);
      setMyId(data.playerId);
      setMyName(data.playerName);
      setMySecretCharacterId(data.myCharacterId);
      setOpponentHasSelected(data.opponentHasSelected);
      setCurrentTurnPlayerId(data.currentTurnPlayerId);
      setTurnEndsAt(data.turnEndsAt);
      if (data.phase === 'SELECTING') setPhase('SELECTING');
      else if (data.phase === 'PLAYING') setPhase('PLAYING');
      setMessage('Reconnected!');
      setTimeout(() => setMessage(''), 3000);
    });

    return () => { sock.disconnect(); };
  }, []);

  // Store myId in a ref so the GW_GAME_OVER handler can access it
  const myIdRef = useRef(myId);
  useEffect(() => { myIdRef.current = myId; }, [myId]);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('GW_CREATE_ROOM', { playerName });
  }, []);

  const joinRoom = useCallback((playerName: string, roomCode: string) => {
    socketRef.current?.emit('GW_JOIN_ROOM', { playerName, roomCode: roomCode.toUpperCase() });
  }, []);

  const selectCharacter = useCallback((characterId: number) => {
    socketRef.current?.emit('GW_SELECT_CHARACTER', { characterId });
  }, []);

  const askQuestion = useCallback((questionId: string) => {
    socketRef.current?.emit('GW_ASK_QUESTION', { questionId });
  }, []);

  const guessCharacter = useCallback((characterId: number) => {
    socketRef.current?.emit('GW_GUESS_CHARACTER', { characterId });
  }, []);

  const toggleEliminated = useCallback((characterId: number) => {
    setEliminatedIds(prev => {
      const next = new Set(prev);
      if (next.has(characterId)) next.delete(characterId);
      else next.add(characterId);
      return next;
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('GW_LEAVE_ROOM');
    setPhase('LOBBY');
    setRoomCode(null);
    setMyId(null);
    setMyName('');
    setPlayers([]);
    setMySecretCharacterId(null);
    setOpponentHasSelected(false);
    setCurrentTurnPlayerId(null);
    setCurrentTurnPlayerName(null);
    setTurnEndsAt(null);
    setQuestionLog([]);
    setLastQuestionResult(null);
    setGameResult(null);
    setEliminatedIds(new Set());
    setOpponentLeft(false);
    setMessage('');
  }, []);

  const resetForRematch = useCallback(() => {
    setPhase('LOBBY');
    setRoomCode(null);
    setMyId(null);
    setMyName('');
    setPlayers([]);
    setMySecretCharacterId(null);
    setOpponentHasSelected(false);
    setCurrentTurnPlayerId(null);
    setCurrentTurnPlayerName(null);
    setTurnEndsAt(null);
    setQuestionLog([]);
    setLastQuestionResult(null);
    setGameResult(null);
    setEliminatedIds(new Set());
    setOpponentLeft(false);
    setMessage('');
  }, []);

  return {
    connected,
    phase,
    roomCode,
    myId,
    myName,
    players,
    mySecretCharacterId,
    opponentHasSelected,
    currentTurnPlayerId,
    currentTurnPlayerName,
    turnEndsAt,
    questionLog,
    lastQuestionResult,
    gameResult,
    message,
    opponentLeft,
    eliminatedIds,
    // Actions
    createRoom,
    joinRoom,
    selectCharacter,
    askQuestion,
    guessCharacter,
    toggleEliminated,
    leaveRoom,
    resetForRematch,
  };
}
