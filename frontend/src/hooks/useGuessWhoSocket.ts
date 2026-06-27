'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GW_CHARACTERS } from '@/data/guessWhoData';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export type GWPhase = 'LOBBY' | 'SELECTING' | 'PLAYING' | 'FINISHED';

export interface GWQuestionLogEntry {
  questionId: string;
  questionText: string;
  answer: boolean;
  askerName: string;
  askerId: string;
  matchingCharacterIds: number[];
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

// ── Sound helpers (Web Audio API — no files needed) ─────────────────────────

function playYesSound() {
  try {
    const ctx = new AudioContext();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (_) { /* browser may block without user gesture */ }
}

function playNoSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

// ── Hook ────────────────────────────────────────────────────────────────────

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
  // Pending result = the last answer waiting to be reviewed before passing turn
  const [pendingResult, setPendingResult] = useState<GWQuestionLogEntry | null>(null);
  const [gameResult, setGameResult] = useState<GWGameResult | null>(null);
  const [message, setMessage] = useState('');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false);

  // Local elimination state (not synced — each player manages their own board)
  const [eliminatedIds, setEliminatedIds] = useState<Set<number>>(new Set());

  // Keep myId in ref so socket event handlers can access it synchronously
  const myIdRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(null);

  useEffect(() => { myIdRef.current = myId; }, [myId]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Save eliminations to localStorage so they survive reconnects
  useEffect(() => {
    const rc = roomCodeRef.current;
    if (!rc || eliminatedIds.size === 0) return;
    localStorage.setItem(`gw_elim_${rc}`, JSON.stringify([...eliminatedIds]));
  }, [eliminatedIds]);

  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = sock;

    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));

    sock.on('GW_ROOM_CREATED', (data: { roomCode: string; playerId: string; playerName: string }) => {
      setRoomCode(data.roomCode);
      setMyId(data.playerId);
      myIdRef.current = data.playerId;
      setMyName(data.playerName);
      setPlayers([{ id: data.playerId, name: data.playerName }]);
      setMessage('Room created — share the code with your opponent');
    });

    sock.on('GW_ROOM_JOINED', (data: { roomCode: string; playerId: string; playerName: string; players: GWPlayerInfo[] }) => {
      setRoomCode(data.roomCode);
      setMyId(data.playerId);
      myIdRef.current = data.playerId;
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
      // Reset per-game state for rematch
      setGameResult(null);
      setOpponentLeft(false);
      setMySecretCharacterId(null);
      setOpponentHasSelected(false);
      setCurrentTurnPlayerId(null);
      setTurnEndsAt(null);
      setQuestionLog([]);
      setLastQuestionResult(null);
      setPendingResult(null);
      setRematchRequested(false);
      setOpponentRematchRequested(false);
      const rc = roomCodeRef.current;
      if (rc) localStorage.removeItem(`gw_elim_${rc}`);
      setEliminatedIds(new Set());
    });

    sock.on('GW_REMATCH_REQUESTED', (data: { playerId: string }) => {
      const myId = myIdRef.current;
      if (data.playerId !== myId) {
        setOpponentRematchRequested(true);
      }
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
      setPendingResult(null);
      setMessage('');
    });

    sock.on('GW_QUESTION_RESULT', (data: GWQuestionLogEntry) => {
      setLastQuestionResult(data);
      setQuestionLog(prev => [data, ...prev]);

      // Play sound
      if (data.answer) {
        playYesSound();
      } else {
        playNoSound();
      }

      // Show highlight panel only to the asker (so they can review before passing)
      if (data.askerId === myIdRef.current) {
        setPendingResult(data);
      }
    });

    sock.on('GW_GAME_OVER', (data: {
      winnerId: string; winnerName: string; loserId: string; loserName: string;
      guesserId: string; guessedCharacterId: number;
      opponentCharacterId: number; opponentCharacterName: string; correct: boolean;
    }) => {
      setPhase('FINISHED');
      setCurrentTurnPlayerId(null);
      setTurnEndsAt(null);
      setPendingResult(null);
      setGameResult({
        won: data.winnerId === myIdRef.current,
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
      myIdRef.current = data.playerId;
      setMyName(data.playerName);
      setMySecretCharacterId(data.myCharacterId);
      setOpponentHasSelected(data.opponentHasSelected);
      setCurrentTurnPlayerId(data.currentTurnPlayerId);
      setTurnEndsAt(data.turnEndsAt);
      if (data.phase === 'SELECTING') setPhase('SELECTING');
      else if (data.phase === 'PLAYING') setPhase('PLAYING');

      // Restore eliminated characters from localStorage
      const stored = localStorage.getItem(`gw_elim_${data.roomCode}`);
      if (stored) {
        try { setEliminatedIds(new Set(JSON.parse(stored))); } catch (_) {}
      }

      setMessage('Reconnected!');
      setTimeout(() => setMessage(''), 3000);
    });

    return () => { sock.disconnect(); };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('GW_CREATE_ROOM', { playerName });
  }, []);

  const joinRoom = useCallback((playerName: string, code: string) => {
    socketRef.current?.emit('GW_JOIN_ROOM', { playerName, roomCode: code.toUpperCase() });
  }, []);

  const selectCharacter = useCallback((characterId: number) => {
    socketRef.current?.emit('GW_SELECT_CHARACTER', { characterId });
  }, []);

  const askQuestion = useCallback((questionId: string) => {
    socketRef.current?.emit('GW_ASK_QUESTION', { questionId });
  }, []);

  const passTurn = useCallback(() => {
    setPendingResult(null);
    socketRef.current?.emit('GW_PASS_TURN');
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

  const eliminateNonMatching = useCallback((matchingIds: number[]) => {
    setEliminatedIds(prev => {
      const next = new Set(prev);
      GW_CHARACTERS.forEach(c => {
        if (!matchingIds.includes(c.id)) next.add(c.id);
      });
      return next;
    });
  }, []);

  const resetState = useCallback(() => {
    setPhase('LOBBY');
    setRoomCode(null);
    setMyId(null);
    myIdRef.current = null;
    setMyName('');
    setPlayers([]);
    setMySecretCharacterId(null);
    setOpponentHasSelected(false);
    setCurrentTurnPlayerId(null);
    setCurrentTurnPlayerName(null);
    setTurnEndsAt(null);
    setQuestionLog([]);
    setLastQuestionResult(null);
    setPendingResult(null);
    setGameResult(null);
    setEliminatedIds(new Set());
    setOpponentLeft(false);
    setMessage('');
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('GW_LEAVE_ROOM');
    if (roomCodeRef.current) localStorage.removeItem(`gw_elim_${roomCodeRef.current}`);
    resetState();
  }, [resetState]);

  const resetForRematch = useCallback(() => {
    if (roomCodeRef.current) localStorage.removeItem(`gw_elim_${roomCodeRef.current}`);
    resetState();
  }, [resetState]);

  const requestRematch = useCallback(() => {
    if (!socketRef.current || !roomCodeRef.current) return;
    setRematchRequested(true);
    socketRef.current.emit('GW_REMATCH');
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
    pendingResult,
    gameResult,
    message,
    opponentLeft,
    eliminatedIds,
    rematchRequested,
    opponentRematchRequested,
    // Actions
    createRoom,
    joinRoom,
    selectCharacter,
    askQuestion,
    passTurn,
    guessCharacter,
    toggleEliminated,
    eliminateNonMatching,
    leaveRoom,
    resetForRematch,
    requestRematch,
  };
}
