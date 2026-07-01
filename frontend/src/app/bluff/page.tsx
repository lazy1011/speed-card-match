'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useBluffSocket } from '@/hooks/useBluffSocket';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import BluffTableView from '@/components/bluff/BluffTableView';
import WakeUpLoader from '@/components/WakeUpLoader';
import ChatPanel from '@/components/ChatPanel';

// ─── confetti helper ──────────────────────────────────────────────────────────

async function fireConfetti(): Promise<() => void> {
  const confetti = (await import('canvas-confetti')).default;
  const end = Date.now() + 3500;
  const colors = ['#fbbf24', '#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899', '#ef4444'];
  let rafHandle: number;
  const shoot = () => {
    confetti({ particleCount: 8, angle: 60, spread: 58, origin: { x: 0 }, colors });
    confetti({ particleCount: 8, angle: 120, spread: 58, origin: { x: 1 }, colors });
    if (Date.now() < end) rafHandle = requestAnimationFrame(shoot);
  };
  rafHandle = requestAnimationFrame(shoot);
  return () => cancelAnimationFrame(rafHandle);
}

// ─── BLUFF Logo — SVG 3D effect with sparkles ────────────────────────────────

function BluffLogo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 72 : 42;
  const W = Math.round(fs * 3.8);
  const H = Math.round(fs * 1.3);
  const cx = W / 2;
  const y = Math.round(fs * 1.0);
  const uid = `blg-${size}`;

  // 4-pointed star polygon
  const sr = Math.round(fs * 0.12);
  const sir = Math.round(sr * 0.38);
  function star(scx: number, scy: number) {
    return [
      `${scx},${scy - sr}`, `${scx + sir},${scy - sir}`,
      `${scx + sr},${scy}`, `${scx + sir},${scy + sir}`,
      `${scx},${scy + sr}`, `${scx - sir},${scy + sir}`,
      `${scx - sr},${scy}`, `${scx - sir},${scy - sir}`,
    ].join(' ');
  }

  // Sparkle positions (left & right of text)
  const slx = Math.round(cx - fs * 1.7);
  const sly = Math.round(y * 0.52);
  const srx = Math.round(cx + fs * 1.7);
  const sry = Math.round(y * 0.52);

  return (
    <motion.svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: 'visible', display: 'block', maxWidth: '100%', height: 'auto' }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
    >
      <defs>
        <linearGradient id={uid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBB0" />
          <stop offset="22%" stopColor="#FFD700" />
          <stop offset="62%" stopColor="#FF8800" />
          <stop offset="100%" stopColor="#C44800" />
        </linearGradient>
      </defs>

      {/* Left sparkle — main star + satellite dot */}
      <polygon points={star(slx, sly)} fill="white" opacity="0.92" />
      <circle cx={slx - sr * 0.75} cy={sly + sr * 1.15} r={sr * 0.3} fill="white" opacity="0.58" />

      {/* Right sparkle — main star + satellite dot */}
      <polygon points={star(srx, sry)} fill="white" opacity="0.92" />
      <circle cx={srx + sr * 0.75} cy={sry + sr * 1.15} r={sr * 0.3} fill="white" opacity="0.58" />

      {/* 3D depth layers — dark amber/brown, increasing offset */}
      {[7, 6, 5, 4, 3, 2, 1].map((d) => (
        <text key={d}
          x={cx + d * 1.1}
          y={y + d}
          textAnchor="middle"
          fontSize={fs}
          fontWeight="900"
          fontFamily="Impact, 'Arial Black', Arial, sans-serif"
          fill={`rgba(${35 + d * 9},${12 + d * 4},0,0.92)`}
          letterSpacing="-2"
        >
          BLUFF
        </text>
      ))}

      {/* Dark stroke — gives clean outline separating fill from depth */}
      <text
        x={cx}
        y={y}
        textAnchor="middle"
        fontSize={fs}
        fontWeight="900"
        fontFamily="Impact, 'Arial Black', Arial, sans-serif"
        fill="none"
        stroke="#1e0800"
        strokeWidth={fs > 50 ? 9 : 6}
        strokeLinejoin="round"
        letterSpacing="-2"
      >
        BLUFF
      </text>

      {/* Gold gradient fill on top */}
      <text
        x={cx}
        y={y}
        textAnchor="middle"
        fontSize={fs}
        fontWeight="900"
        fontFamily="Impact, 'Arial Black', Arial, sans-serif"
        fill={`url(#${uid})`}
        letterSpacing="-2"
      >
        BLUFF
      </text>
    </motion.svg>
  );
}

// ─── TableBackground ─────────────────────────────────────────────────────────

function TableBackground() {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute" style={{ width: 500, height: 500, left: '-15%', top: '-20%', background: 'radial-gradient(ellipse, rgba(109,40,217,0.28) 0%, transparent 68%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 600, height: 600, right: '-20%', bottom: '-25%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 68%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 350, height: 350, left: '35%', top: '5%', background: 'radial-gradient(ellipse, rgba(251,191,36,0.07) 0%, transparent 68%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 300, height: 300, right: '10%', top: '30%', background: 'radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 68%)', borderRadius: '50%' }} />
      </div>
      {/* Neon grid mesh — matches reference */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          'linear-gradient(rgba(160,80,255,0.07) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(160,80,255,0.07) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />
      {/* Dot overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </>
  );
}

// ─── WinnerOverlay — matches reference screenshot 7 ──────────────────────────

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
  useEffect(() => {
    if (!isMe) return;
    let cancel: (() => void) | undefined;
    fireConfetti().then(c => { cancel = c; });
    return () => { cancel?.(); };
  }, [isMe]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,2,18,0.96)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Rotating sunburst rays behind modal */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: 4,
            height: '55vh',
            background: `linear-gradient(to top, transparent 0%, rgba(251,191,36,${0.18 + (i % 3) * 0.08}) 100%)`,
            transformOrigin: 'bottom center',
            left: '50%',
            top: '50%',
            marginLeft: -2,
            marginTop: '-55vh',
          }}
          animate={{ rotate: [i * 30, i * 30 + 360] }}
          transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
        />
      ))}

      <motion.div
        className="w-full max-w-sm rounded-3xl p-7 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a1240 0%, #0e0a20 100%)',
          border: '2px solid rgba(251,191,36,0.45)',
          boxShadow: '0 0 100px rgba(251,191,36,0.22), 0 0 180px rgba(124,58,237,0.18)',
        }}
        initial={{ scale: 0.65, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
      >
        {/* Glitter dots */}
        {[...Array(10)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 3 : 5,
              height: i % 2 === 0 ? 3 : 5,
              background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#a855f7' : '#3b82f6',
              left: `${8 + i * 9}%`,
              top: `${6 + (i % 4) * 8}%`,
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.5, 0.8] }}
            transition={{ duration: 1.4 + i * 0.1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}

        {/* Trophy */}
        <motion.div
          className="leading-none mb-1 select-none"
          style={{ fontSize: 100 }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
        >
          🏆
        </motion.div>

        {/* WINNER! — red bold with gold outline */}
        <motion.div
          className="font-black leading-none mb-2 select-none"
          style={{
            fontSize: 'clamp(52px, 16vw, 72px)',
            color: '#dc2626',
            textShadow:
              '-3px -3px 0 #fbbf24, 3px -3px 0 #fbbf24, -3px 3px 0 #fbbf24, 3px 3px 0 #fbbf24,' +
              '-3px 0 0 #fbbf24, 3px 0 0 #fbbf24, 0 -3px 0 #fbbf24, 0 3px 0 #fbbf24,' +
              '5px 5px 0 rgba(0,0,0,0.5), 0 0 40px rgba(220,38,38,0.6)',
          }}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}
        >
          WINNER!
        </motion.div>

        <motion.p
          className="text-xl font-black text-white mb-1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          {winner}
          {isMe && <span className="ml-2 text-emerald-400 text-base font-bold">← You!</span>}
        </motion.p>

        {/* Floating +coins */}
        <div className="relative h-8 mb-3 pointer-events-none overflow-hidden">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="absolute font-black text-yellow-400 text-base"
              style={{ left: `${22 + i * 28}%` }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: -44 }}
              transition={{ delay: 0.9 + i * 0.18, duration: 1.3, repeat: Infinity, repeatDelay: 2.2 }}
            >
              💰+100
            </motion.div>
          ))}
        </div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-3 gap-2 mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {[
            { val: myStats.bluffsCaught, label: 'Caught', icon: '🎯' },
            { val: myStats.timesBluffCaught, label: 'Got caught', icon: '😬' },
            { val: myStats.cardsTaken, label: 'Cards taken', icon: '🃏' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-2.5 text-center"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.22)' }}>
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-[9px] text-yellow-500/70 font-bold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="flex flex-col gap-2.5">
          {isHost ? (
            <motion.button
              onClick={onPlayAgain}
              className="w-full py-4 rounded-2xl font-black text-white text-base"
              style={{
                background: 'linear-gradient(145deg, #ca8a04, #d97706)',
                boxShadow: '0 4px 22px rgba(251,191,36,0.45)',
                border: '1px solid rgba(251,191,36,0.4)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              🔁 Play Again
            </motion.button>
          ) : (
            <p className="text-slate-500 text-sm font-semibold py-1">Waiting for host to restart…</p>
          )}
          <button onClick={onLeave}
            className="w-full py-2 text-slate-600 hover:text-slate-300 font-semibold text-sm transition-colors">
            Leave Room
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── LobbyTable — rounded rectangle with seat glow rings ──────────────────────

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
      {/* Table with seats */}
      <div className="relative w-full" style={{ aspectRatio: '16/9', minHeight: 220, maxHeight: 380 }}>
        {/* Rounded rectangle table surface */}
        <div className="absolute inset-0" style={{
          borderRadius: 80,
          background: 'radial-gradient(ellipse at 50% 40%, #22204a 0%, #181530 60%, #100d24 100%)',
          border: '4px solid #9040e8',
          boxShadow:
            '0 0 0 2px rgba(140,60,240,0.25), ' +
            '0 0 45px rgba(155,68,250,0.75), ' +
            '0 0 90px rgba(130,50,225,0.35), ' +
            'inset 0 0 80px rgba(0,0,0,0.6)',
        }} />

        {/* Dot pattern */}
        <div className="absolute inset-0 overflow-hidden" style={{
          borderRadius: 80,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          opacity: 0.08,
        }} />

        {/* Seat positions around table */}
        {seats.map((player, i) => {
          const angle = (i / Math.max(seats.length, 4)) * 2 * Math.PI - Math.PI / 2;
          const rx = 38, ry = 32;
          const cx = 50 + rx * Math.cos(angle);
          const cy = 50 + ry * Math.sin(angle);
          const isFirst = i === 0;
          const ringClr = player
            ? (isFirst ? '#fbbf24' : i % 2 === 0 ? '#34d399' : '#a78bfa')
            : '#334155';

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
                  <motion.div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${ringClr}30, ${ringClr}15)`,
                      border: `2.5px solid ${ringClr}`,
                      boxShadow: `0 0 0 2px rgba(0,0,0,0.5), 0 0 14px ${ringClr}88`,
                    }}
                    animate={{ boxShadow: [`0 0 0 2px rgba(0,0,0,0.5), 0 0 8px ${ringClr}66`, `0 0 0 2px rgba(0,0,0,0.5), 0 0 20px ${ringClr}cc`, `0 0 0 2px rgba(0,0,0,0.5), 0 0 8px ${ringClr}66`] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </motion.div>
                  <span className="text-[9px] font-black max-w-[52px] truncate text-center"
                    style={{ color: ringClr }}>
                    {player.name}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col items-center gap-0.5 opacity-30"
                  animate={{ opacity: [0.2, 0.45, 0.2] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
                >
                  <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                    <span className="text-slate-600 text-xl font-bold">+</span>
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
            <div className="text-white font-black text-xl">{players.length}/{Math.max(seats.length, maxPlayers)}</div>
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
          <motion.button onClick={onCopyCode}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.96 }}>
            {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
          </motion.button>
          <motion.button onClick={onShareLink}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}
            whileTap={{ scale: 0.96 }}>
            {sharedLink ? '✓ Copied!' : '🔗 Share Link'}
          </motion.button>
        </div>
      </div>

      {/* Start Game — gold 3D pill button */}
      {isHost && players.length >= 2 ? (
        <motion.button
          onClick={onStart}
          className="w-full max-w-md font-black text-white text-lg"
          style={{
            padding: '18px 24px',
            borderRadius: '100px',
            background: 'linear-gradient(180deg, #fde047 0%, #eab308 30%, #ca8a04 80%)',
            boxShadow:
              '0 8px 28px rgba(234,179,8,0.55), ' +
              'inset 0 2px 0 rgba(255,255,255,0.35), ' +
              'inset 0 -4px 0 rgba(0,0,0,0.25)',
            color: '#1a0a00',
            textShadow: '0 1px 0 rgba(255,255,255,0.4)',
          }}
          whileHover={{ scale: 1.03, boxShadow: '0 10px 36px rgba(234,179,8,0.7), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25)' }}
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ['0 6px 22px rgba(234,179,8,0.45), inset 0 2px 0 rgba(255,255,255,0.35)', '0 10px 36px rgba(234,179,8,0.7), inset 0 2px 0 rgba(255,255,255,0.35)', '0 6px 22px rgba(234,179,8,0.45), inset 0 2px 0 rgba(255,255,255,0.35)'] }}
          transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
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
  // Keep a ref so the recordResult effect always sees the current name without re-running
  const playerNameRef = useRef(playerName);

  // Always keep the ref in sync so closures read the latest name without stale values
  playerNameRef.current = playerName;

  useEffect(() => {
    if (game.connected) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2000);
    return () => clearTimeout(t);
  }, [game.connected]);

  useEffect(() => {
    if (loaded && profile && !playerName) setPlayerName(profile.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, profile]); // intentionally omits playerName — only pre-fills once on load

  useEffect(() => {
    if (!game.winner || resultRecorded) return;
    setResultRecorded(true);
    recordResult('bluff', game.winner === playerNameRef.current);
  }, [game.winner, resultRecorded, recordResult]);

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

  const { sendReaction, sendChat } = game;

  const handleSendReaction = useCallback((emoji: string) => {
    sendReaction(emoji, playerName);
  }, [sendReaction, playerName]);

  const handleSendChat = useCallback((text: string) => {
    sendChat(text, playerName);
  }, [sendChat, playerName]);

  const pageStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'radial-gradient(ellipse at 50% 20%, #1c1040 0%, #0a0720 60%, #060412 100%)',
    position: 'relative',
    overflowX: 'hidden',
  };

  // ── Entry screen ──────────────────────────────────────────────────────────

  if (!game.roomCode) {
    const canAct = game.connected && !!playerName.trim();

    return (
      <div style={pageStyle} className="flex flex-col items-center justify-center min-h-[100dvh] p-5">
        <TableBackground />
        {showWakeUp && <WakeUpLoader />}

        {/* Back button */}
        <motion.button
          onClick={() => router.push('/')}
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors"
          whileHover={{ x: -2 }}
        >
          ← Back
        </motion.button>

        <div className="relative w-full max-w-md z-10">
          {/* 3D Logo above table */}
          <div className="flex justify-center mb-2">
            <BluffLogo size="lg" />
          </div>
          <motion.p
            className="text-slate-400 font-semibold text-center mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Lie. Bluff. Win.
          </motion.p>

          {/* Table-shaped form container */}
          <motion.div
            className="relative overflow-hidden"
            style={{
              borderRadius: 80,
              background: 'radial-gradient(ellipse at 50% 35%, #22204a 0%, #131128 100%)',
              border: '5px solid #9040e8',
              boxShadow:
                '0 0 0 2px rgba(140,60,240,0.25), ' +
                '0 0 60px rgba(155,68,250,0.75), ' +
                '0 0 120px rgba(130,50,225,0.35), ' +
                'inset 0 0 90px rgba(0,0,0,0.55)',
              padding: '40px 28px 36px',
            }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Dot pattern inside table */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              opacity: 0.08,
            }} />

            <div className="relative z-10">
              {/* Connection status */}
              {!game.connected && (
                <div className="mb-4 p-3 rounded-2xl text-amber-400 text-sm text-center font-semibold"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  Connecting to server…
                </div>
              )}

              {/* Name input */}
              <div className="mb-4">
                <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-widest">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-2xl text-white font-bold placeholder-slate-600 focus:outline-none transition"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(144,64,232,0.4)',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !showJoinInput) handleCreateRoom(); }}
                />
              </div>

              {!showJoinInput ? (
                <>
                  {/* Green 3D Play with Friends button */}
                  <motion.button
                    onClick={handleCreateRoom}
                    disabled={!canAct}
                    className="w-full font-black text-white text-lg mb-3 disabled:cursor-not-allowed"
                    style={{
                      padding: '18px 24px',
                      borderRadius: '100px',
                      background: canAct
                        ? 'linear-gradient(180deg, #86d46a 0%, #4db830 35%, #369020 80%)'
                        : 'rgba(80,80,80,0.35)',
                      border: canAct ? '2px solid rgba(255,255,255,0.45)' : '2px solid rgba(80,80,80,0.3)',
                      boxShadow: canAct
                        ? 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -5px 0 rgba(0,0,0,0.28), 0 10px 32px rgba(0,0,0,0.55), 0 0 0 4px rgba(255,255,255,0.08)'
                        : 'none',
                      opacity: canAct ? 1 : 0.5,
                      fontSize: '1.15rem',
                      letterSpacing: '0.5px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                    whileHover={canAct ? { scale: 1.03 } : undefined}
                    whileTap={canAct ? { scale: 0.97 } : undefined}
                  >
                    🎮 Play with Friends
                  </motion.button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-slate-600 text-xs font-semibold"
                        style={{ background: 'rgba(13,10,30,0.9)' }}>or</span>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => setShowJoinInput(true)}
                    className="w-full py-3.5 rounded-2xl font-black text-slate-300 text-base"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Join Existing Room
                  </motion.button>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-widest">Room Code</label>
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
                        border: '1.5px solid rgba(144,64,232,0.4)',
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' && joinCode.trim()) handleJoinRoom(); }}
                    />
                  </div>
                  <motion.button
                    onClick={handleJoinRoom}
                    disabled={!canAct || !joinCode.trim()}
                    className="w-full py-4 rounded-2xl font-black text-white text-base mb-2 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(145deg, #7c3aed, #6d28d9)',
                      boxShadow: '0 4px 18px rgba(124,58,237,0.35)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ✓ Join Room
                  </motion.button>
                  <button onClick={() => setShowJoinInput(false)}
                    className="w-full py-2 text-slate-600 hover:text-slate-300 text-sm font-semibold transition-colors">
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
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Game / lobby screen ───────────────────────────────────────────────────

  return (
    <div style={pageStyle} className="flex flex-col p-3 md:p-5 pb-24">
      <TableBackground />

      {/* Reconnecting */}
      <AnimatePresence>
        {game.reconnecting && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(9,6,30,0.88)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin" />
              <p className="text-white font-black text-xl">Reconnecting…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game abandoned */}
      <AnimatePresence>
        {game.gameAbandoned && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(9,6,30,0.95)', backdropFilter: 'blur(8px)' }}
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

      {/* Winner overlay */}
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

      {/* Player-left toast */}
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

      {/* Floating reactions */}
      {game.reactions.length > 0 && (
        <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
          {game.reactions.map((r, i) => (
            <motion.div key={r.id} className="absolute flex flex-col items-center"
              style={{ left: `${12 + (i % 6) * 14}%`, bottom: 80 }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: -160 }}
              transition={{ duration: 2.5 }}>
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-white text-[10px] font-bold bg-slate-800/70 px-1.5 py-0.5 rounded-lg mt-0.5 max-w-[56px] truncate">{r.playerName}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BluffLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <button onClick={handleCopyCode}
              className="font-mono font-black text-sm transition-colors"
              style={{ color: copiedCode ? '#34d399' : '#fbbf24' }}
              title="Copy room code">
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

      {/* Message bar */}
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

      {/* Main content */}
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {!game.gameStarted ? (
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

      <ChatPanel
        messages={game.chatMessages}
        onSend={handleSendChat}
        myName={playerName}
        accentColor="rose"
      />
    </div>
  );
}
