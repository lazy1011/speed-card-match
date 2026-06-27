'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardValue, BluffPlayer } from '@/types/game';
import { sfx, initAudioUnlock, setMuted as sfxSetMuted } from '@/utils/sounds';

export interface LogEntry {
  id: string;
  text: string;
  type: 'normal' | 'bluff' | 'skip' | 'series' | 'win';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface Reaction {
  id: string;
  playerName: string;
  emoji: string;
}

export interface BluffStats {
  bluffsCaught: number;
  timesBluffCaught: number;
  cardsTaken: number;
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function rankLabelShort(v: CardValue): string {
  const labels: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return labels[v] ?? String(v);
}

export const useBluffSocket = () => {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<BluffPlayer[]>([]);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [pileSize, setPileSize] = useState(0);
  const [bluffWindowOpen, setBluffWindowOpen] = useState(false);
  const [bluffWindowEndsAt, setBluffWindowEndsAt] = useState<number | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<{ playerName: string; playedById: string | null; claimedRank: CardValue; claimedCount: number } | null>(null);
  const [revealedCards, setRevealedCards] = useState<{ cards: Card[]; claimedRank: CardValue; callerWins: boolean; loserName: string } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [muted, setMuted] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('card_games_muted') === '1'
  );
  const [pileTransfer, setPileTransfer] = useState<{ loserName: string; cards: number; callerWins: boolean } | null>(null);

  const [currentSeriesRank, setCurrentSeriesRank] = useState<CardValue | null>(null);
  const [waitingForRankPick, setWaitingForRankPick] = useState(false);
  const [rankPickStarterId, setRankPickStarterId] = useState<string | null>(null);
  const [rankPickStarterName, setRankPickStarterName] = useState<string | null>(null);
  const [kittySize, setKittySize] = useState(0);

  const [playerLeft, setPlayerLeft] = useState<string | null>(null);
  const [gameAbandoned, setGameAbandoned] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // New feature state
  const [turnEndsAt, setTurnEndsAt] = useState<number | null>(null);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [myStats, setMyStats] = useState<BluffStats>({ bluffsCaught: 0, timesBluffCaught: 0, cardsTaken: 0 });

  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | null>(null);
  const playerLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      sfxSetMuted(next);
      return next;
    });
  }, []);

  const appendLog = useCallback((text: string, type: LogEntry['type']) => {
    setGameLog(prev => [...prev.slice(-99), { id: uid(), text, type, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    initAudioUnlock();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const sock = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      myIdRef.current = sock.id ?? null;
    });
    sock.on('disconnect', () => {
      setConnected(false);
      setReconnecting(true);
    });
    sock.on('reconnect_failed', () => setReconnecting(false));

    sock.on('ROOM_UPDATED', (info: any) => {
      setPlayers(
        (info.playerNames || []).map((name: string, idx: number) => ({
          id: info.playerIds?.[idx] || `player-${idx}`,
          name,
          handSize: 0,
          isActive: true,
        }))
      );
    });

    sock.on('BLUFF_GAME_STARTED', (data: any) => {
      setGameStarted(true);
      setPlayers(data.players || []);
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      setPileSize(0);
      setBluffWindowOpen(false);
      setBluffWindowEndsAt(null);
      setLastPlay(null);
      setRevealedCards(null);
      setWinner(null);
      setPileTransfer(null);
      setCurrentSeriesRank(data.seriesRank ?? null);
      setKittySize(data.kittySize ?? 0);
      setWaitingForRankPick(false);
      setRankPickStarterId(null);
      setRankPickStarterName(null);
      setTurnEndsAt(null);
      setGameLog([]);
      setChatMessages([]);
      setReactions([]);
      setMyStats({ bluffsCaught: 0, timesBluffCaught: 0, cardsTaken: 0 });
      const rankLabel = rankLabelShort(data.seriesRank);
      setMessage(`Game started! Series rank: ${rankLabel}. Cards dealt.`);
      appendLog(`Game started — series rank: ${rankLabel}`, 'series');
      sfx.shuffle();
    });

    sock.on('MY_HAND', (data: { cards: Card[] }) => {
      setMyHand(data.cards || []);
    });

    sock.on('BLUFF_TURN_TIMER', (data: { endsAt: number }) => {
      setTurnEndsAt(data.endsAt);
    });

    sock.on('BLUFF_CARDS_PLAYED', (data: any) => {
      setPileSize(data.newPileSize);
      setPlayers(data.players || []);
      setLastPlay({ playerName: data.playerName, playedById: data.playedById ?? null, claimedRank: data.claimedRank, claimedCount: data.claimedCount });
      if (data.currentPlayerId) setCurrentPlayerId(data.currentPlayerId);
      if (data.currentPlayerName) setCurrentPlayerName(data.currentPlayerName);
      setMessage(`${data.playerName} played ${data.claimedCount} card${data.claimedCount > 1 ? 's' : ''} as ${rankLabelShort(data.claimedRank)}`);
      appendLog(`${data.playerName} played ${data.claimedCount}× ${rankLabelShort(data.claimedRank)}`, 'normal');
      sfx.cardPlay();
    });

    sock.on('BLUFF_WINDOW_OPEN', (data: any) => {
      setBluffWindowOpen(true);
      setBluffWindowEndsAt(data.bluffWindowMs ? Date.now() + data.bluffWindowMs : null);
      setRevealedCards(null);
    });

    sock.on('BLUFF_WINDOW_CLOSED', () => {
      setBluffWindowOpen(false);
      setBluffWindowEndsAt(null);
    });

    sock.on('BLUFF_PLAYER_SKIPPED', (data: any) => {
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      setTurnEndsAt(null);
      setMessage(`${data.skipperName} skipped.`);
      appendLog(`${data.skipperName} skipped${data.autoSkipped ? ' (timed out)' : ''}`, 'skip');
      sfx.skip();
    });

    sock.on('BLUFF_CALLED', (data: any) => {
      setRevealedCards({
        cards: data.revealedCards,
        claimedRank: data.claimedRank,
        callerWins: data.callerWins,
        loserName: data.loserName,
      });
      setTurnEndsAt(null);
      if (data.callerWins) {
        setMessage(`🎯 Bluff caught by ${data.callerName}! ${data.loserName} takes the pile.`);
        appendLog(`${data.callerName} caught ${data.loserName}'s bluff!`, 'bluff');
        sfx.bluffCaught();
        // Track my stats
        const myId = myIdRef.current;
        if (myId) {
          if (data.callerId === myId) setMyStats(s => ({ ...s, bluffsCaught: s.bluffsCaught + 1 }));
          if (data.loserId === myId) setMyStats(s => ({ ...s, timesBluffCaught: s.timesBluffCaught + 1 }));
        }
      } else {
        setMessage(`✅ Legit play! ${data.callerName} got caught — ${data.loserName} takes the pile.`);
        appendLog(`${data.callerName} called Show — but it was legit!`, 'bluff');
        sfx.legitPlay();
        const myId = myIdRef.current;
        if (myId && data.loserId === myId) {
          setMyStats(s => ({ ...s, timesBluffCaught: s.timesBluffCaught + 1 }));
        }
      }
    });

    sock.on('BLUFF_SETTLED', (data: any) => {
      setPileSize(data.newPileSize ?? 0);
      setPlayers(data.players || []);
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      setLastPlay(null);
      if (data.cardsReceived > 0) {
        setPileTransfer({ loserName: data.loserName, cards: data.cardsReceived, callerWins: data.callerWins });
        setTimeout(() => setPileTransfer(null), 4500);
        // Track cards taken
        const myId = myIdRef.current;
        if (myId && data.loserId === myId) {
          setMyStats(s => ({ ...s, cardsTaken: s.cardsTaken + data.cardsReceived }));
        }
      }
      if (data.rankPickNeeded && data.nextStarterId) {
        setWaitingForRankPick(true);
        setRankPickStarterId(data.nextStarterId);
        setRankPickStarterName(data.nextStarterName ?? null);
        setCurrentSeriesRank(null);
      }
    });

    sock.on('BLUFF_SERIES_DISCARDED', (data: any) => {
      setPileSize(0);
      setLastPlay(null);
      setRevealedCards(null);
      setCurrentSeriesRank(null);
      setMessage(data.message || 'Series discarded.');
      appendLog('Series discarded — pile cleared', 'series');
      sfx.seriesDiscard();
    });

    sock.on('BLUFF_RANK_PICK_NEEDED', (data: any) => {
      setWaitingForRankPick(true);
      setRankPickStarterId(data.nextStarterId);
      setRankPickStarterName(data.nextStarterName);
      setCurrentSeriesRank(null);
      setCurrentPlayerId(data.nextStarterId);
      setCurrentPlayerName(data.nextStarterName);
    });

    sock.on('BLUFF_SERIES_STARTED', (data: any) => {
      setCurrentSeriesRank(data.seriesRank);
      setWaitingForRankPick(false);
      setRankPickStarterId(null);
      setRankPickStarterName(null);
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      setRevealedCards(null);
      setLastPlay(null);
      setMessage(`${data.starterName} set rank: ${rankLabelShort(data.seriesRank)}. ${data.currentPlayerName}'s turn.`);
      appendLog(`${data.starterName} set rank: ${rankLabelShort(data.seriesRank)}`, 'series');
      sfx.rankPicked();
    });

    sock.on('BLUFF_TURN_ADVANCED', (data: any) => {
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      if (data.seriesRank !== undefined) setCurrentSeriesRank(data.seriesRank);
    });

    sock.on('BLUFF_GAME_WON', (data: any) => {
      setWinner(data.winnerName);
      setTurnEndsAt(null);
      setMessage(`🏆 ${data.winnerName} emptied their hand and wins!`);
      appendLog(`${data.winnerName} wins! 🏆`, 'win');
      sfx.win();
    });

    sock.on('PLAYER_RECONNECTING', (data: any) => {
      const name = data?.playerName ?? 'A player';
      setMessage(`${name} lost connection — waiting up to 60s for them to reconnect…`);
      if (playerLeftTimerRef.current) clearTimeout(playerLeftTimerRef.current);
      setPlayerLeft(`${name} (reconnecting…)`);
      playerLeftTimerRef.current = setTimeout(() => setPlayerLeft(null), 8000);
    });

    sock.on('PLAYER_RECONNECTED', (data: any) => {
      const name = data?.playerName ?? 'A player';
      setMessage('');
      if (playerLeftTimerRef.current) clearTimeout(playerLeftTimerRef.current);
      setPlayerLeft(`${name} reconnected ✓`);
      playerLeftTimerRef.current = setTimeout(() => setPlayerLeft(null), 4000);
    });

    sock.on('PLAYER_DISCONNECTED', (data: any) => {
      const name = data?.playerName ?? 'A player';
      setMessage(`${name} disconnected.`);
      if (playerLeftTimerRef.current) clearTimeout(playerLeftTimerRef.current);
      setPlayerLeft(name);
      playerLeftTimerRef.current = setTimeout(() => setPlayerLeft(null), 5000);
    });

    sock.on('GAME_ABANDONED', (data: any) => {
      setGameAbandoned(data?.reason ?? 'Not enough players to continue.');
    });

    sock.on('REACTION', (data: any) => {
      const reaction: Reaction = {
        id: data.id ?? uid(),
        playerName: data.playerName,
        emoji: data.emoji,
      };
      setReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3500);
    });

    sock.on('CHAT_MESSAGE', (data: any) => {
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
      sock.close();
    };
  }, [appendLog]);

  const joinBluffRoom = useCallback((playerName: string, joinCode?: string) => {
    if (!socketRef.current) return;
    const mode = joinCode ? undefined : 'bluff';
    socketRef.current.emit('JOIN_ROOM', { playerName, roomCode: joinCode, gameMode: mode }, (res: any) => {
      if (res.success) {
        setRoomCode(res.roomCode);
        setMessage(`Joined room: ${res.roomCode}`);
      } else {
        setMessage(`Error: ${res.message}`);
      }
    });
  }, []);

  const startGame = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('START_GAME', { roomCode }, (res: any) => {
      if (!res.success) setMessage(`Error: ${res.message}`);
    });
  }, [roomCode]);

  const playCards = useCallback(
    (cardIndices: number[], claimedRank: CardValue, claimedCount: number) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('PLAY_BLUFF_CARDS', { roomCode, cardIndices, claimedRank, claimedCount }, (res: any) => {
        if (!res.success) setMessage(`Error: ${res.message}`);
      });
    },
    [roomCode]
  );

  const skipTurn = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('SKIP_BLUFF_TURN', { roomCode }, (res: any) => {
      if (!res.success) setMessage(`Error: ${res.message}`);
    });
  }, [roomCode]);

  const setSeriesRank = useCallback(
    (rank: CardValue) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('SET_SERIES_RANK', { roomCode, rank }, (res: any) => {
        if (!res.success) setMessage(`Error: ${res.message}`);
      });
    },
    [roomCode]
  );

  const callBluff = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('CALL_BLUFF', { roomCode }, (res: any) => {
      if (!res.success) setMessage(`Error: ${res.message}`);
    });
  }, [roomCode]);

  const restartGame = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('RESTART_GAME', { roomCode }, (res: any) => {
      if (!res?.success) setMessage(`Error: ${res?.message}`);
    });
  }, [roomCode]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('LEAVE_ROOM', { roomCode, playerId: socketRef.current.id });
    setRoomCode(null);
    setGameStarted(false);
    setWinner(null);
    setMyHand([]);
    setCurrentSeriesRank(null);
    setWaitingForRankPick(false);
    setGameAbandoned(null);
    setPlayerLeft(null);
    setTurnEndsAt(null);
    setGameLog([]);
    setChatMessages([]);
    setReactions([]);
    setMyStats({ bluffsCaught: 0, timesBluffCaught: 0, cardsTaken: 0 });
    setMessage('Left the room');
  }, [roomCode]);

  const sendReaction = useCallback((emoji: string, playerName: string) => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('SEND_REACTION', { roomCode, emoji, playerName });
  }, [roomCode]);

  const sendChat = useCallback((text: string, playerName: string) => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('SEND_CHAT', { roomCode, text, playerName });
  }, [roomCode]);

  return {
    connected,
    roomCode,
    players,
    myHand,
    pileSize,
    bluffWindowOpen,
    bluffWindowEndsAt,
    currentPlayerId,
    currentPlayerName,
    lastPlay,
    revealedCards,
    gameStarted,
    winner,
    message,
    muted,
    myId: myIdRef.current ?? socketRef.current?.id ?? null,
    currentSeriesRank,
    waitingForRankPick,
    rankPickStarterId,
    rankPickStarterName,
    kittySize,
    pileTransfer,
    reconnecting,
    playerLeft,
    gameAbandoned,
    // New features
    turnEndsAt,
    gameLog,
    reactions,
    chatMessages,
    myStats,
    // Actions
    toggleMute,
    joinBluffRoom,
    startGame,
    playCards,
    skipTurn,
    setSeriesRank,
    callBluff,
    restartGame,
    leaveRoom,
    sendReaction,
    sendChat,
  };
};
