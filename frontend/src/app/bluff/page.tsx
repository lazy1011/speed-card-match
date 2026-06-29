'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useBluffSocket } from '@/hooks/useBluffSocket';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import BluffTableView from '@/components/bluff/BluffTableView';
import WakeUpLoader from '@/components/WakeUpLoader';
import ChatPanel from '@/components/ChatPanel';

// ─── confetti helper ──────────────────────────────────────────────────────────

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default;
  const end = Date.now() + 3000;
  const colors = ['#fbbf24', '#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899'];
  (function shoot() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(shoot);
  })();
}

// ─── BluffLogo ───────────────────────────────────────────────────────────────

function BluffLogo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 'clamp(52px, 14vw, 88px)' : 'clamp(32px, 8vw, 52px)';
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      className="font-black leading-none select-none text-center"
      style={{
        fontSize: fs,
        background: 'linear-gradient(180deg, #fde68a 0%, #fbbf24 40%, #f97316 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(3px 4px 0px #92400e) drop-shadow(0px 0px 20px rgba(251,191,36,0.45))',
        letterSpacing: '-1px',
      }}
    >
      BLUFF
    </motion.div>
  );
}

// ─── TableBackground ─────────────────────────────────────────────────────────

function TableBackground() {
  return (
    <>
      {/* Ambient bokeh glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute" style={{ width: 400, height: 400, left: '-10%', top: '-15%', background: 'radial-gradient(ellipse, rgba(109,40,217,0.22) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 500, height: 500, right: '-15%', bottom: '-20%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 300, height: 300, left: '30%', top: '10%', background: 'radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </>
  );
}

// ─── WinnerOverlay ────────────────────────────────────────────────────────────

function WinnerOverlay({
  winner, isMe, myStats, isHost, onPlayAgain, onLeave,
}: {
  winner: string;
  isMe: boolean;
  myStats: { bluffsCaught: number; timesBluffCaught: number; cardsTaken: number };
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  useEffect(() => { if (isMe) fireConfetti(); }, [isMe]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9,6,30,0.93)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a1240 0%, #0e0a20 100%)',
          border: '1.5px solid rgba(251,191,36,0.3)',
          boxShadow: '0 0 80px rgba(124,58,237,0.35)',
        }}
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
      >
        {/* Stars */}
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
            style={{ left: `${10 + i * 11}%`, top: '8%' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}

        {/* Trophy */}
        <motion.div
          className="text-8xl mb-1"
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
        >
          🏆
        </motion.div>

        {/* WINNER! */}
        <motion.div
          className="font-black mb-1"
          style={{
            fontSize: 'clamp(36px, 12vw, 52px)',
            background: 'linear-gradient(180deg, #fde68a, #fbbf24, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(2px 3px 0 rgba(146,64,14,0.8))',
          }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          WINNER!
        </motion.div>

        <motion.p
          className="text-xl font-black text-white mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {winner}
        </motion.p>

        {isMe && (
          <motion.p className="text-emerald-400 font-bold text-sm mb-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            🎉 That's you!
          </motion.p>
        )}

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-2 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {[
            { val: myStats.bluffsCaught, label: 'Caught', icon: '🎯' },
            { val: myStats.timesBluffCaught, label: 'Got caught', icon: '😬' },
            { val: myStats.cardsTaken, label: 'Cards taken', icon: '🃏' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="flex flex-col gap-2.5">
          {isHost ? (
            <motion.button
              onClick={onPlayAgain}
              className="w-full py-3.5 rounded-2xl font-black text-white"
              style={{
                background: 'linear-gradient(145deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 18px rgba(124,58,237,0.4)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              🔁 Play Again
            </motion.button>
          ) : (
            <p className="text-slate-500 text-sm font-semibold py-1">Waiting for host to restart…</p>
          )}
          <button onClick={onLeave} className="w-full py-2 text-slate-600 hover:text-slate-300 font-semibold text-sm transition-colors">
            Leave Room
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── LobbyTable ───────────────────────────────────────────────────────────────

function LobbyTable({
  players, maxPlayers = 6, roomCode, isHost, onStart, onCopyCode, onShareLink, copiedCode, sharedLink,
}: {
  players: { id: string; name: string }[];
  maxPlayers?: number;
  roomCode: string;
  isHost: boolean;
  onStart: () => void;
  onCopyCode: () => void;
  onShareLink: () => void;
  copiedCode: boolean;
  sharedLink: boolean;
}) {
  const seats = Array.from({ length: Math.max(maxPlayers, players.length) }, (_, i) => players[i] ?? null);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Table oval with seats */}
      <div className="relative w-full" style={{ aspectRatio: '16/9', minHeight: 220, maxHeight: 380 }}>
        <div className="absolute inset-0" style={{
          borderRadius: '40%',
          background: 'radial-gradient(ellipse at 50% 40%, #1e1b3a 0%, #120e2a 80%)',
          border: '4px solid #7c3aed',
          boxShadow: '0 0 40px rgba(124,58,237,0.6), inset 0 0 60px rgba(0,0,0,0.5)',
        }} />

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10 overflow-hidden" style={{
          borderRadius: '40%',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />

        {/* Seat positions */}
        {seats.map((player, i) => {
          // Place up to 6 seats around the oval
          const angle = (i / Math.max(seats.length, 4)) * 2 * Math.PI - Math.PI / 2;
          const rx = 38, ry = 32; // % from center
          const cx = 50 + rx * Math.cos(angle);
          const cy = 50 + ry * Math.sin(angle);

          return (
            <div key={i} className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${cx}%`, top: `${cy}%` }}>
              {player ? (
                <motion.div
                  className="flex flex-col items-center gap-0.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18, delay: i * 0.08 }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center font-black text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(52,211,153,0.1))' }}>
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[9px] text-emerald-300 font-bold max-w-[52px] truncate text-center">
                    {player.name}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col items-center gap-0.5 opacity-35"
                  animate={{ opacity: [0.25, 0.5, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                    <span className="text-slate-600 text-lg font-bold">+</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-semibold">Empty</span>
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Players</div>
            <div className="text-white font-black text-lg">{players.length} / {Math.max(seats.length, maxPlayers)}</div>
          </div>
        </div>
      </div>

      {/* Room code share */}
      <div className="w-full max-w-md rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 text-center">Room Code</p>
        <p className="text-3xl font-mono font-black text-center tracking-[0.4em] mb-3"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          {roomCode}
        </p>
        <div className="flex gap-2">
          <motion.button
            onClick={onCopyCode}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.96 }}
          >
            {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
          </motion.button>
          <motion.button
            onClick={onShareLink}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}
            whileTap={{ scale: 0.96 }}
          >
            {sharedLink ? '✓ Copied!' : '🔗 Share Link'}
          </motion.button>
        </div>
      </div>

      {/* Start / wait */}
      {isHost && players.length >= 2 ? (
        <motion.button
          onClick={onStart}
          className="w-full max-w-md py-4 rounded-2xl font-black text-white text-lg"
          style={{
            background: 'linear-gradient(145deg, #ca8a04, #d97706)',
            boxShadow: '0 4px 24px rgba(251,191,36,0.4)',
            border: '1px solid rgba(251,191,36,0.35)',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 32px rgba(251,191,36,0.55)' }}
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ['0 4px 20px rgba(251,191,36,0.35)', '0 4px 32px rgba(251,191,36,0.6)', '0 4px 20px rgba(251,191,36,0.35)'] }}
          transition={{ boxShadow: { repeat: Infinity, duration: 1.8 } }}
        >
          🎭 Start Game
        </motion.button>
      ) : isHost ? (
        <p className="text-slate-500 text-sm font-semibold">Need at least 2 players to start…</p>
      ) : (
        <p className="text-slate-500 text-sm font-semibold">Waiting for host to start the game…</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BluffPage() {
  const router = useRouter();
  const game = useBluffSocket();
  const { profile, loaded, recordResult } = usePlayerProfile();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);

  useEffect(() => {
    if (game.connected) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2000);
    return () => clearTimeout(t);
  }, [game.connected]);

  useEffect(() => {
    if (loaded && profile && !playerName) setPlayerName(profile.name);
  }, [loaded, profile]);

  useEffect(() => {
    if (!game.winner || resultRecorded) return;
    setResultRecorded(true);
    recordResult('bluff', game.winner === playerName);
  }, [game.winner]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase().slice(0, 6));
      setShowJoinInput(true);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) { alert('Please enter your name'); return; }
    game.joinBluffRoom(playerName);
    setIsHost(true);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) { alert('Please enter your name'); return; }
    if (!joinCode.trim()) { alert('Please enter room code'); return; }
    game.joinBluffRoom(playerName, joinCode);
    setIsHost(false);
  };

  const handleCopyCode = useCallback(() => {
    if (!game.roomCode) return;
    navigator.clipboard.writeText(game.roomCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [game.roomCode]);

  const handleShareLink = useCallback(() => {
    if (!game.roomCode) return;
    const url = `${window.location.origin}/bluff?code=${game.roomCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my Bluff game!', text: `Room code: ${game.roomCode}`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setSharedLink(true);
        setTimeout(() => setSharedLink(false), 2000);
      });
    }
  }, [game.roomCode]);

  const handleSendReaction = useCallback((emoji: string) => {
    game.sendReaction(emoji, playerName);
  }, [game, playerName]);

  const handleSendChat = useCallback((text: string) => {
    game.sendChat(text, playerName);
  }, [game, playerName]);

  // ── Shared page wrapper ────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'radial-gradient(ellipse at 50% 20%, #1c1040 0%, #0a0720 60%, #060412 100%)',
    position: 'relative',
    overflowX: 'hidden',
  };

  // ── Entry screen ──────────────────────────────────────────────────────────

  if (!game.roomCode) {
    return (
      <div style={pageStyle} className="flex flex-col items-center justify-center p-5">
        <TableBackground />
        {showWakeUp && <WakeUpLoader />}

        <div className="relative w-full max-w-md z-10">
          {/* Back */}
          <motion.button
            onClick={() => router.push('/')}
            className="mb-5 flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors"
            whileHover={{ x: -2 }}
          >
            ← Back
          </motion.button>

          {/* Logo */}
          <div className="text-center mb-6">
            <BluffLogo size="lg" />
            <motion.p
              className="text-slate-400 font-semibold mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Lie. Bluff. Win.
            </motion.p>
          </div>

          {/* Card */}
          <motion.div
            className="rounded-3xl p-6"
            style={{
              background: 'rgba(30,27,58,0.85)',
              border: '1px solid rgba(124,58,237,0.3)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {!game.connected && (
              <div className="mb-4 p-3 rounded-2xl text-amber-400 text-sm text-center font-semibold"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                Connecting to server…
              </div>
            )}

            {/* Name input */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-2xl text-white font-bold placeholder-slate-600 focus:outline-none transition"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(124,58,237,0.35)',
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !showJoinInput) handleCreateRoom(); }}
              />
            </div>

            {!showJoinInput && (
              <>
                {/* Play with Friends */}
                <motion.button
                  onClick={handleCreateRoom}
                  disabled={!game.connected || !playerName.trim()}
                  className="w-full py-4 rounded-2xl font-black text-white text-lg mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: game.connected && playerName.trim()
                      ? 'linear-gradient(145deg, #16a34a, #15803d)'
                      : 'rgba(100,100,100,0.3)',
                    boxShadow: game.connected && playerName.trim() ? '0 4px 22px rgba(22,163,74,0.4)' : 'none',
                    border: '1px solid rgba(52,211,153,0.3)',
                  }}
                  whileHover={game.connected && playerName.trim() ? { scale: 1.02 } : undefined}
                  whileTap={game.connected && playerName.trim() ? { scale: 0.97 } : undefined}
                >
                  🎮 Play with Friends
                </motion.button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/8" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-slate-600 text-xs font-semibold" style={{ background: 'rgba(30,27,58,0.85)' }}>or</span>
                  </div>
                </div>

                <motion.button
                  onClick={() => setShowJoinInput(true)}
                  className="w-full py-3.5 rounded-2xl font-black text-slate-300 text-base"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Join Existing Room
                </motion.button>
              </>
            )}

            {showJoinInput && (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Room Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl text-white font-black placeholder-slate-600 focus:outline-none tracking-[0.4em] text-center text-xl transition"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(124,58,237,0.35)',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && joinCode.trim()) handleJoinRoom(); }}
                  />
                </div>
                <motion.button
                  onClick={handleJoinRoom}
                  disabled={!game.connected || !playerName.trim() || !joinCode.trim()}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-base mb-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(145deg, #7c3aed, #6d28d9)',
                    boxShadow: '0 4px 18px rgba(124,58,237,0.35)',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  ✓ Join Room
                </motion.button>
                <button onClick={() => setShowJoinInput(false)} className="w-full py-2 text-slate-600 hover:text-slate-300 text-sm font-semibold transition-colors">
                  ← Back
                </button>
              </>
            )}

            {game.message && (
              <div className="mt-4 p-3 rounded-2xl text-rose-300 text-sm text-center font-semibold"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                {game.message}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  return (
    <div style={pageStyle} className="flex flex-col p-3 md:p-5 pb-24">
      <TableBackground />

      {/* ── Reconnecting overlay ── */}
      <AnimatePresence>
        {game.reconnecting && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(9,6,30,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin" />
              <p className="text-white font-black text-xl">Reconnecting…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game abandoned ── */}
      <AnimatePresence>
        {game.gameAbandoned && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(9,6,30,0.92)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="w-full max-w-sm rounded-3xl p-8 text-center"
              style={{ background: 'rgba(30,27,58,0.98)', border: '1px solid rgba(220,38,38,0.3)' }}>
              <div className="text-6xl mb-4">😔</div>
              <h2 className="text-2xl font-black text-white mb-2">Game Ended</h2>
              <p className="text-slate-400 font-semibold text-sm mb-6">{game.gameAbandoned}</p>
              <button onClick={game.leaveRoom}
                className="w-full py-3.5 rounded-2xl font-black text-white"
                style={{ background: 'linear-gradient(145deg, #991b1b, #dc2626)' }}>
                Exit Game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Winner overlay ── */}
      <AnimatePresence>
        {game.winner && (
          <WinnerOverlay
            winner={game.winner}
            isMe={game.winner === playerName}
            myStats={game.myStats}
            isHost={isHost}
            onPlayAgain={game.restartGame}
            onLeave={game.leaveRoom}
          />
        )}
      </AnimatePresence>

      {/* ── Player-left toast ── */}
      <AnimatePresence>
        {game.playerLeft && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-semibold text-sm text-white"
              style={{ background: 'rgba(30,27,58,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              👋 <span className="font-black text-rose-300">{game.playerLeft}</span> left the game
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating reactions ── */}
      {game.reactions.length > 0 && (
        <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
          {game.reactions.map((r, i) => (
            <motion.div
              key={r.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${12 + (i % 6) * 14}%`, bottom: 80 }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: -160 }}
              transition={{ duration: 2.5 }}
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-white text-[10px] font-bold bg-slate-800/70 px-1.5 py-0.5 rounded-lg mt-0.5 max-w-[56px] truncate">{r.playerName}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <BluffLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              className="font-mono font-black text-sm transition-colors"
              style={{ color: copiedCode ? '#34d399' : '#fbbf24' }}
              title="Copy room code"
            >
              {game.roomCode}
            </button>
            <span className={`w-2 h-2 rounded-full ${game.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={game.toggleMute}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {game.muted ? '🔇' : '🔊'}
          </button>
          <button onClick={game.leaveRoom}
            className="px-3 py-2 rounded-xl font-black text-white text-xs transition-all"
            style={{ background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.35)' }}>
            Leave
          </button>
        </div>
      </div>

      {/* ── Message bar ── */}
      <AnimatePresence>
        {game.message && (
          <motion.div
            className="relative z-10 mb-3 px-4 py-2 rounded-2xl text-slate-300 font-semibold text-center text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {game.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {!game.gameStarted ? (
          // Lobby
          <LobbyTable
            players={game.players}
            roomCode={game.roomCode}
            isHost={isHost}
            onStart={game.startGame}
            onCopyCode={handleCopyCode}
            onShareLink={handleShareLink}
            copiedCode={copiedCode}
            sharedLink={sharedLink}
          />
        ) : (
          // Active game
          <>
            <BluffTableView
              myHand={game.myHand}
              myId={game.myId}
              players={game.players}
              pileSize={game.pileSize}
              bluffWindowOpen={game.bluffWindowOpen}
              currentPlayerId={game.currentPlayerId}
              currentPlayerName={game.currentPlayerName}
              lastPlay={game.lastPlay}
              revealedCards={game.revealedCards}
              currentSeriesRank={game.currentSeriesRank}
              waitingForRankPick={game.waitingForRankPick}
              rankPickStarterId={game.rankPickStarterId}
              rankPickStarterName={game.rankPickStarterName}
              pileTransfer={game.pileTransfer}
              turnEndsAt={game.turnEndsAt}
              onPlayCards={game.playCards}
              onSkipTurn={game.skipTurn}
              onCallBluff={game.callBluff}
              onSetSeriesRank={game.setSeriesRank}
              onSendReaction={handleSendReaction}
            />

            {/* Game log */}
            {game.gameLog.length > 0 && (
              <div className="mt-3 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setLogOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-slate-500 hover:text-slate-300 font-semibold text-xs transition-colors"
                >
                  <span>📋 Game Log ({game.gameLog.length})</span>
                  <span>{logOpen ? '▲' : '▼'}</span>
                </button>
                {logOpen && (
                  <div className="max-h-40 overflow-y-auto px-4 pb-3 space-y-0.5">
                    {[...game.gameLog].reverse().map(entry => (
                      <div key={entry.id} className="flex items-start gap-2 text-[11px] py-0.5">
                        <span className={`font-black shrink-0 ${
                          entry.type === 'bluff' ? 'text-rose-400' :
                          entry.type === 'skip' ? 'text-slate-600' :
                          entry.type === 'series' ? 'text-amber-400' :
                          entry.type === 'win' ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {entry.type === 'bluff' ? '🎯' : entry.type === 'skip' ? '⏭' :
                           entry.type === 'series' ? '🃏' : entry.type === 'win' ? '🏆' : '▶'}
                        </span>
                        <span className="text-slate-400 font-semibold">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat */}
      <ChatPanel
        messages={game.chatMessages}
        onSend={handleSendChat}
        myName={playerName}
        accentColor="rose"
      />
    </div>
  );
}
