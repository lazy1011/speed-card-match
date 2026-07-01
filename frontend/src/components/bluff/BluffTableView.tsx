'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardValue, BluffPlayer } from '@/types/game';
import { sfx } from '@/utils/sounds';

// ─── helpers ─────────────────────────────────────────────────────────────────

const SUITS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

function rnkLabel(v: CardValue): string {
  const m: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return m[v] ?? String(v);
}

const ALL_RANKS: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Casino character avatars — DiceBear illustrated characters, one per seat
const PLAYER_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jester&backgroundColor=1e1b3a',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo&backgroundColor=1e1b3a',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Tyler&backgroundColor=1e1b3a',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=1e1b3a',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Wolfgang&backgroundColor=1e1b3a',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Eagle&backgroundColor=1e1b3a',
];

// ─── Opponent positions ───────────────────────────────────────────────────────

function getOpponentPositions(n: number): React.CSSProperties[] {
  switch (n) {
    case 1:
      return [{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }];
    case 2:
      return [
        { position: 'absolute', top: '10%', left: '27%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '10%', left: '73%', transform: 'translateX(-50%)', zIndex: 10 },
      ];
    case 3:
      return [
        { position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '5%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '5%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
    case 4:
      return [
        { position: 'absolute', top: '10%', left: '27%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '10%', left: '73%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '5%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '5%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
    default:
      return [
        { position: 'absolute', top: '10%', left: '18%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '10%', left: '82%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '5%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '5%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
  }
}

// ─── FaceDownStack — blue card backs ─────────────────────────────────────────

function FaceDownStack({ count }: { count: number }) {
  const layers = Math.min(4, count);
  return (
    <div className="relative" style={{ width: 34 + layers * 2, height: 48 + layers * 2 }}>
      {[...Array(layers)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-md overflow-hidden"
          style={{
            width: 34, height: 48,
            left: i * 2, top: i * 2,
            background: 'linear-gradient(145deg, #1e3a8a 0%, #1a306e 100%)',
            border: '1.5px solid rgba(255,255,255,0.85)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.55)',
            zIndex: i,
          }}
        >
          <div style={{
            position: 'absolute', inset: 2,
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 0, transparent 6px),' +
              'repeating-linear-gradient(-45deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 0, transparent 6px)',
            backgroundSize: '6px 6px',
          }} />
          {i === layers - 1 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 14, height: 14, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '50%' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PlayingCard ─────────────────────────────────────────────────────────────

function PlayingCard({
  card, selected, onClick, disabled, compact,
}: {
  card: Card; selected?: boolean; onClick?: () => void; disabled?: boolean; compact?: boolean;
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const rank = rnkLabel(card.value);
  const suit = SUITS[card.suit];
  const clr = isRed ? '#dc2626' : '#111827';
  const W = compact ? 52 : 68;
  const H = compact ? 74 : 96;
  const fs = compact ? 9 : 12;
  const centerFs = compact ? 20 : 28;

  return (
    <motion.div
      onClick={!disabled ? onClick : undefined}
      className="relative bg-white select-none"
      style={{
        width: W, height: H, flexShrink: 0,
        borderRadius: compact ? 8 : 10,
        border: selected ? '2.5px solid #fbbf24' : '1.5px solid #d1d5db',
        cursor: 'inherit',
        boxShadow: selected
          ? '0 0 22px rgba(251,191,36,0.85), 0 8px 22px rgba(0,0,0,0.65)'
          : '0 5px 14px rgba(0,0,0,0.6)',
      }}
      animate={{ y: selected ? (compact ? -12 : -18) : 0, scale: selected ? 1.08 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
    >
      <div className="absolute top-1 left-1 leading-none" style={{ color: clr, fontSize: fs, fontWeight: 900 }}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ color: clr, fontSize: centerFs, fontWeight: 900 }}>
        {suit}
      </div>
      <div className="absolute bottom-1 right-1 rotate-180 leading-none" style={{ color: clr, fontSize: fs, fontWeight: 900 }}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
    </motion.div>
  );
}

// ─── TurnTimer — MY turn ring (shown beside my slot) ────────────────────────

function TurnTimer({ endsAt, total = 30 }: { endsAt: number; total?: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const urgent = secs <= 8;
  const pct = secs / total;
  const r = 20;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1e1b3a" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none"
          stroke={urgent ? '#f87171' : '#34d399'} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-black text-xs ${urgent ? 'text-red-400' : 'text-white'}`}>
        {secs}
      </div>
    </div>
  );
}

// ─── AvatarTimerRing — SVG ring overlaid on opponent avatar ──────────────────

function AvatarTimerRing({ endsAt, total = 30 }: { endsAt: number; total?: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const urgent = secs <= 8;
  const r = 25;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, secs / total);

  return (
    <>
      <svg
        viewBox="0 0 60 60" width="60" height="60"
        className="absolute pointer-events-none"
        style={{ top: -5, left: -5, transform: 'rotate(-90deg)', zIndex: 5 }}
      >
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
        <circle cx="30" cy="30" r={r} fill="none"
          stroke={urgent ? '#f87171' : '#34d399'}
          strokeWidth="3.5"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <div
        className="absolute pointer-events-none font-black"
        style={{
          bottom: -1, right: -1, zIndex: 6,
          background: urgent ? '#dc2626' : '#0f172a',
          border: `1.5px solid ${urgent ? '#f87171' : '#334155'}`,
          borderRadius: '50%',
          fontSize: 8, color: urgent ? '#fff' : '#94a3b8',
          width: 14, height: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {secs}
      </div>
    </>
  );
}

// ─── PlayerSlot ──────────────────────────────────────────────────────────────

function PlayerSlot({
  player, isActive, isRankPicker, isMe, showTimer, timerEndsAt, hasBluffAlert, charIdx = 0,
}: {
  player: BluffPlayer | null;
  isActive: boolean;
  isRankPicker?: boolean;
  isMe?: boolean;
  showTimer?: boolean;
  timerEndsAt?: number | null;
  hasBluffAlert?: boolean;
  charIdx?: number;
}) {
  const [avatarError, setAvatarError] = useState(false);

  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-30">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
          <span className="text-slate-600 text-xl">+</span>
        </div>
        <span className="text-slate-600 text-[10px]">Empty</span>
      </div>
    );
  }

  const ringClr = isActive ? '#fbbf24' : isRankPicker ? '#fb923c' : isMe ? '#34d399' : '#8b5cf6';
  const glowClr = isActive ? 'rgba(251,191,36,0.65)' : isMe ? 'rgba(52,211,153,0.35)' : 'transparent';
  const avatarUrl = PLAYER_AVATARS[charIdx % PLAYER_AVATARS.length];

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        {/* Timer ring wraps around avatar — no layout shift */}
        {showTimer && timerEndsAt && <AvatarTimerRing endsAt={timerEndsAt} />}

        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 50, height: 50,
            background: `linear-gradient(135deg, ${ringClr}40, ${ringClr}18)`,
            border: `3px solid ${ringClr}`,
            boxShadow: isActive
              ? `0 0 0 3px rgba(0,0,0,0.5), 0 0 20px ${glowClr}`
              : isMe
              ? `0 0 0 3px rgba(0,0,0,0.5), 0 0 12px ${glowClr}`
              : '0 0 0 2px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
          animate={isActive
            ? { boxShadow: [
                `0 0 0 3px rgba(0,0,0,0.5), 0 0 10px ${glowClr}`,
                `0 0 0 3px rgba(0,0,0,0.5), 0 0 28px rgba(251,191,36,0.8)`,
                `0 0 0 3px rgba(0,0,0,0.5), 0 0 10px ${glowClr}`,
              ] }
            : { boxShadow: '0 0 0 2px rgba(0,0,0,0.4)' }
          }
          transition={isActive
            ? { boxShadow: { repeat: Infinity, duration: 1.4 } }
            : { boxShadow: { duration: 0.3 } }
          }
        >
          {avatarError ? (
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>
              {player.name.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              draggable={false}
              onError={() => setAvatarError(true)}
            />
          )}
        </motion.div>

        {isActive && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#120e2a]" />
        )}

        {/* Pulsing ! badge when player can call bluff */}
        <AnimatePresence>
          {hasBluffAlert && (
            <motion.div
              className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center font-black text-black text-xs select-none"
              style={{
                background: 'linear-gradient(135deg, #fde047, #f59e0b)',
                boxShadow: '0 0 10px rgba(251,191,36,0.8), 0 2px 4px rgba(0,0,0,0.5)',
                fontSize: 13,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.25, 1] }}
              exit={{ scale: 0 }}
              transition={{ scale: { repeat: Infinity, duration: 0.55 } }}
            >
              !
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center leading-none">
        <div className={`font-black text-[10px] ${isActive ? 'text-yellow-300' : isMe ? 'text-emerald-300' : 'text-white/80'}`}>
          {player.name.length > 9 ? player.name.slice(0, 8) + '…' : player.name}
        </div>
        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{player.handSize}🃏</div>
      </div>

      {!isMe && player.handSize > 0 && <FaceDownStack count={player.handSize} />}
    </div>
  );
}

// ─── CenterPile ──────────────────────────────────────────────────────────────

function CenterPile({
  pileSize, lastPlay, bluffWindowOpen, canCallBluff, onCallBluff,
  currentSeriesRank, waitingForRankPick, isDraggingCard,
}: {
  pileSize: number;
  lastPlay: { playerName: string; playedById: string | null; claimedRank: CardValue; claimedCount: number } | null;
  bluffWindowOpen: boolean;
  canCallBluff: boolean;
  onCallBluff: () => void;
  currentSeriesRank: CardValue | null;
  waitingForRankPick: boolean;
  isDraggingCard: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {currentSeriesRank && !waitingForRankPick && (
        <div className="px-3 py-1 rounded-full text-[10px] font-black text-emerald-300 border border-emerald-600/50"
          style={{ background: 'rgba(16,185,129,0.12)' }}>
          Rank: {rnkLabel(currentSeriesRank)}
        </div>
      )}
      {waitingForRankPick && (
        <div className="px-3 py-1 rounded-full text-[10px] font-black text-amber-300 border border-amber-600/50 animate-pulse"
          style={{ background: 'rgba(245,158,11,0.12)' }}>
          Picking rank…
        </div>
      )}

      <div className="relative" style={{ width: 60, height: 80 }}>
        {isDraggingCard && (
          <motion.div
            className="absolute rounded-xl border-2 border-yellow-400"
            style={{ inset: -10, zIndex: 0, boxShadow: '0 0 24px rgba(251,191,36,0.5)' }}
            animate={{ boxShadow: ['0 0 12px rgba(251,191,36,0.4)', '0 0 34px rgba(251,191,36,0.9)', '0 0 12px rgba(251,191,36,0.4)'] }}
            transition={{ repeat: Infinity, duration: 0.55 }}
          />
        )}
        {pileSize > 0 ? (
          <div className="absolute inset-0 z-10">
            {[...Array(Math.min(5, pileSize))].map((_, i) => (
              <div key={i} className="absolute overflow-hidden" style={{
                width: 56, height: 76,
                borderRadius: 8,
                left: (i - 2) * 2,
                top: -(i * 1.5),
                background: 'linear-gradient(145deg, #1e3a8a, #152a6a)',
                border: '1.5px solid rgba(255,255,255,0.75)',
                transform: `rotate(${(i - 2) * 2.5}deg)`,
                zIndex: i,
                backgroundImage:
                  'linear-gradient(145deg, #1e3a8a, #152a6a),' +
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 0, transparent 6px)',
              }} />
            ))}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)', borderRadius: 8 }}>
              <span className="text-white font-black text-base leading-none">{pileSize}</span>
              <span className="text-white/50 text-[8px] font-bold">cards</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-slate-700/50"
            style={{ borderRadius: 8 }}>
            <span className="text-slate-700 text-[9px] font-bold">pile</span>
          </div>
        )}
      </div>

      {isDraggingCard ? (
        <motion.div className="font-black text-[10px] text-yellow-300 tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 0.55 }}>
          ↑ DROP HERE
        </motion.div>
      ) : lastPlay ? (
        <div className="text-center leading-none">
          <div className="text-white/50 text-[9px] font-semibold">{lastPlay.playerName} played</div>
          <div className="text-white font-black text-xs">{lastPlay.claimedCount}× {rnkLabel(lastPlay.claimedRank)}</div>
        </div>
      ) : null}

      <AnimatePresence>
        {bluffWindowOpen && canCallBluff && (
          <motion.button
            onClick={onCallBluff}
            className="relative font-black text-white flex items-center justify-center"
            style={{
              width: 'clamp(190px, 62%, 278px)',
              height: 82,
              background: 'linear-gradient(180deg, #4a4a62 0%, #2e2e48 35%, #1e1e32 70%, #141428 100%)',
              border: '3px solid #c49a25',
              borderRadius: 14,
              boxShadow:
                '0 0 32px rgba(196,154,37,0.7), 0 0 65px rgba(196,154,37,0.28), ' +
                'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.4)',
              fontSize: 'clamp(20px, 5.5vw, 28px)',
              letterSpacing: 3,
              gap: 14,
              cursor: 'pointer',
            }}
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{
              scale: 1, opacity: 1, y: 0,
              boxShadow: [
                '0 0 20px rgba(196,154,37,0.6), 0 0 40px rgba(196,154,37,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                '0 0 40px rgba(196,154,37,0.9), 0 0 80px rgba(196,154,37,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                '0 0 20px rgba(196,154,37,0.6), 0 0 40px rgba(196,154,37,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              ],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              scale: { type: 'spring', stiffness: 340, damping: 14 },
              boxShadow: { repeat: Infinity, duration: 1.3 },
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.93 }}
          >
            <span style={{ color: '#d4a820', fontSize: '0.75em', letterSpacing: 0 }}>◀◀</span>
            <span>BLUFF?</span>
            <span style={{ color: '#d4a820', fontSize: '0.75em', letterSpacing: 0 }}>▶▶</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── InlineRankPicker ─────────────────────────────────────────────────────────

function InlineRankPicker({ onPick, starterName }: { onPick: (r: CardValue) => void; starterName: string }) {
  const isMe = starterName === 'You';
  return (
    <motion.div
      className="rounded-2xl p-4 border"
      style={{ background: 'rgba(30,27,58,0.97)', borderColor: 'rgba(251,146,60,0.5)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-center font-black text-sm mb-3" style={{ color: isMe ? '#fb923c' : '#94a3b8' }}>
        {isMe ? '🃏 Choose the series rank!' : `Waiting for ${starterName} to pick…`}
      </p>
      {isMe && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {ALL_RANKS.map(r => (
            <motion.button
              key={r}
              onClick={() => onPick(r)}
              className="w-10 h-10 rounded-xl font-black text-white text-sm"
              style={{ background: 'linear-gradient(145deg, #4c1d95, #5b21b6)', border: '1px solid rgba(124,58,237,0.5)' }}
              whileHover={{ scale: 1.14, background: 'linear-gradient(145deg,#6d28d9,#7c3aed)' }}
              whileTap={{ scale: 0.9 }}
            >
              {rnkLabel(r)}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── CHALLENGE! overlay ───────────────────────────────────────────────────────

function ChallengeOverlay({ show }: { show: boolean }) {
  useEffect(() => {
    if (!show) return;
    import('canvas-confetti').then(m => {
      const confetti = m.default;
      const colors = ['#ff0000', '#ff6600', '#ffcc00', '#ff00ff', '#00ccff'];
      confetti({ particleCount: 40, spread: 100, origin: { y: 0.5 }, colors, startVelocity: 35, gravity: 0.6 });
    });
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(251,191,36,0.32) 0%, rgba(255,80,0,0.1) 55%, transparent 75%)' }}
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          />
          {[...Array(16)].map((_, i) => (
            <motion.div key={`w${i}`} className="absolute" style={{
              width: i % 2 === 0 ? 3 : 2,
              height: `${42 + (i % 4) * 8}vh`,
              background: `linear-gradient(to top, transparent 0%, rgba(255,255,255,${0.55 + (i % 3) * 0.15}) 100%)`,
              transformOrigin: 'bottom center',
              rotate: i * 22.5,
              left: '50%', top: '50%',
              marginLeft: i % 2 === 0 ? -1.5 : -1,
              marginTop: `${-(42 + (i % 4) * 8)}vh`,
            }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ delay: i * 0.018, duration: 0.18 }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <motion.div key={`g${i}`} className="absolute" style={{
              width: 6, height: '50vh',
              background: 'linear-gradient(to top, transparent 0%, rgba(251,140,0,0.45) 100%)',
              transformOrigin: 'bottom center',
              rotate: i * 45 + 11,
              left: '50%', top: '50%', marginLeft: -3, marginTop: '-50vh',
            }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ delay: 0.05 + i * 0.025, duration: 0.2 }}
            />
          ))}
          <motion.div
            className="relative font-black text-center leading-none select-none"
            style={{
              fontSize: 'clamp(52px, 14vw, 96px)',
              color: '#dc2626',
              textShadow:
                '-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff,' +
                '-6px 0 0 #fff, 6px 0 0 #fff, 0 -6px 0 #fff, 0 6px 0 #fff,' +
                '8px 8px 0 rgba(0,0,0,0.6), 0 0 60px rgba(255,50,50,0.7)',
              letterSpacing: '-2px', lineHeight: 1,
            }}
            initial={{ scale: 0.15, rotate: -14 }}
            animate={{ scale: 1, rotate: -3 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          >
            CHALLENGE!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CardHand — dual layout: mobile flat horizontal + desktop fan ─────────────

function CardHand({
  cards, selectedIndices, onToggle, disabled, onDragPlay, onDragActiveChange, compact,
}: {
  cards: Card[];
  selectedIndices: number[];
  onToggle: (i: number) => void;
  disabled: boolean;
  onDragPlay?: (cardIndex: number) => void;
  onDragActiveChange?: (active: boolean) => void;
  compact?: boolean;
}) {
  const dragRef = useRef<{
    index: number;
    startY: number;
    currentDY: number;
    wasDrag: boolean;
  } | null>(null);
  const [dragState, setDragState] = useState<{ index: number; dy: number } | null>(null);

  if (cards.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center">
        <span className="text-slate-600 text-sm font-bold">No cards in hand</span>
      </div>
    );
  }

  const n = cards.length;
  const cardW = compact ? 52 : 68;
  // Desktop fan params
  const fanOverlap = Math.min(36, 360 / Math.max(1, n - 1));
  const maxRot = Math.min(5, 48 / n);
  // Mobile/compact flat row params
  const mobileSpread = compact ? 160 : 240;
  const mobileOverlap = Math.min(compact ? 18 : 24, mobileSpread / Math.max(1, n - 1));

  // Drag progress 0→1 as card approaches play threshold
  const dragProgress = dragState ? Math.min(1, Math.abs(Math.min(0, dragState.dy)) / 80) : 0;

  function handlePDown(e: React.PointerEvent, i: number) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { index: i, startY: e.clientY, currentDY: 0, wasDrag: false };
    setDragState({ index: i, dy: 0 });
  }

  function handlePMove(e: React.PointerEvent, i: number) {
    if (!dragRef.current || dragRef.current.index !== i) return;
    // Cap at -120 on mobile (tighter viewport), -280 desktop
    const isMobileWidth = typeof window !== 'undefined' && window.innerWidth < 768;
    const cap = isMobileWidth ? -100 : -280;
    const dy = Math.max(cap, Math.min(24, e.clientY - dragRef.current.startY));
    dragRef.current.currentDY = dy;
    if (!dragRef.current.wasDrag && Math.abs(dy) > 8) {
      dragRef.current.wasDrag = true;
      onDragActiveChange?.(true);
    }
    setDragState({ index: i, dy });
  }

  function handlePUp(e: React.PointerEvent, i: number) {
    if (!dragRef.current || dragRef.current.index !== i) return;
    const { currentDY, wasDrag } = dragRef.current;
    dragRef.current = null;
    setDragState(null);
    onDragActiveChange?.(false);
    if (wasDrag) {
      if (currentDY < -80 && onDragPlay) onDragPlay(i);
    } else {
      onToggle(i);
    }
  }

  function handlePCancel() {
    dragRef.current = null;
    setDragState(null);
    onDragActiveChange?.(false);
  }

  // Shared card renderer with full drag animation
  function renderCard(card: Card, i: number, style: React.CSSProperties, withRotation = false) {
    const isSelected = selectedIndices.includes(i);
    const isDraggingThis = dragState?.index === i;
    const extraDy = isDraggingThis ? dragState!.dy : 0;
    const localProgress = isDraggingThis ? Math.min(1, Math.abs(Math.min(0, extraDy)) / 80) : 0;
    // Card straightens as it's dragged up (rotation interpolates toward 0)
    const origRot = withRotation ? (i - (n - 1) / 2) * maxRot : 0;
    const tiltAngle = isDraggingThis ? origRot * (1 - localProgress) : origRot;

    return (
      <div
        key={i}
        style={{
          ...style,
          transform: `${style.transform ?? ''} rotate(${tiltAngle}deg) translateY(${isDraggingThis ? extraDy : 0}px) scale(${isDraggingThis ? 1.15 + localProgress * 0.1 : 1})`,
          transition: isDraggingThis ? 'none' : 'transform 0.22s ease-out, filter 0.15s',
          filter: isDraggingThis
            ? `drop-shadow(0 0 ${10 + localProgress * 22}px rgba(251,191,36,${0.45 + localProgress * 0.5})) drop-shadow(0 ${12 + localProgress * 10}px 12px rgba(0,0,0,0.8))`
            : isSelected
            ? 'drop-shadow(0 4px 8px rgba(251,191,36,0.35))'
            : 'none',
          zIndex: isDraggingThis ? 500 : (isSelected ? 200 + i : i),
          touchAction: 'none',
          cursor: disabled ? 'default' : isDraggingThis ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as React.CSSProperties}
        onPointerDown={e => handlePDown(e, i)}
        onPointerMove={e => handlePMove(e, i)}
        onPointerUp={e => handlePUp(e, i)}
        onPointerCancel={handlePCancel}
      >
        <div style={{ pointerEvents: 'none' }}>
          <PlayingCard card={card} selected={isSelected} compact={compact} />
        </div>
        {/* Golden ring that grows as you drag toward threshold */}
        {isDraggingThis && localProgress > 0.15 && (
          <div style={{
            position: 'absolute', inset: -6, borderRadius: 14, pointerEvents: 'none',
            border: `2.5px solid rgba(251,191,36,${localProgress * 0.95})`,
            boxShadow: `0 0 ${22 * localProgress}px rgba(251,191,36,${0.7 * localProgress}), inset 0 0 ${8 * localProgress}px rgba(251,191,36,${0.25 * localProgress})`,
          }} />
        )}
        {/* Spark trail when near threshold */}
        {isDraggingThis && localProgress > 0.55 && [0, 1, 2, 3].map(p => (
          <motion.div key={p}
            className="absolute rounded-full bg-yellow-300 pointer-events-none"
            style={{ width: 5, height: 5, left: `${18 + p * 22}%`, top: -10 }}
            animate={{ y: [-4, -18, -4], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ repeat: Infinity, duration: 0.45, delay: p * 0.1 }}
          />
        ))}
        {/* Play zone label */}
        {isDraggingThis && localProgress > 0.75 && (
          <motion.div
            className="absolute left-1/2 font-black text-yellow-300 text-[8px] tracking-widest pointer-events-none whitespace-nowrap"
            style={{ top: -20, transform: 'translateX(-50%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            RELEASE!
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile / Compact: flat horizontal row (no fan rotation) ── */}
      <div className={`${compact ? 'block' : 'block md:hidden'} relative overflow-visible`}
        style={{ height: compact ? 130 : 170 }}>
        {!disabled && (
          <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <span className="text-slate-600 text-[9px] font-semibold tracking-wider uppercase">
              tap · drag ↑ to play
            </span>
          </div>
        )}
        {cards.map((card, i) => {
          const offset = i - (n - 1) / 2;
          return renderCard(card, i, {
            position: 'absolute',
            left: `calc(50% + ${offset * mobileOverlap}px - ${cardW / 2}px)`,
            bottom: 8,
            transformOrigin: 'bottom center',
          });
        })}
      </div>

      {/* ── Desktop: fan layout ── */}
      {!compact && (
        <div className="hidden md:block relative overflow-visible" style={{ height: 148 }}>
          {!disabled && (
            <div className="absolute -top-5 left-0 right-0 flex justify-center pointer-events-none">
              <span className="text-slate-600 text-[9px] font-semibold tracking-wider uppercase">
                tap to select · drag up to play
              </span>
            </div>
          )}
          {cards.map((card, i) => {
            const offset = i - (n - 1) / 2;
            const ty = Math.abs(offset) * 1.2;
            const isSelected = selectedIndices.includes(i);
            const isDraggingThis = dragState?.index === i;
            const extraDy = isDraggingThis ? dragState!.dy : 0;
            const localProgress = isDraggingThis ? Math.min(1, Math.abs(Math.min(0, extraDy)) / 80) : 0;
            // Straighten rotation as card is dragged up
            const origRot = offset * maxRot;
            const rot = isDraggingThis ? origRot * (1 - localProgress) : origRot;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${offset * fanOverlap}px - 34px)`,
                  bottom: 0,
                  transform: `rotate(${rot}deg) translateY(${ty + extraDy}px) scale(${isDraggingThis ? 1.15 + localProgress * 0.1 : 1})`,
                  transformOrigin: 'bottom center',
                  zIndex: isDraggingThis ? 500 : (isSelected ? 200 + i : i),
                  transition: isDraggingThis ? 'none' : 'transform 0.22s ease-out, filter 0.15s',
                  filter: isDraggingThis
                    ? `drop-shadow(0 0 ${10 + localProgress * 22}px rgba(251,191,36,${0.45 + localProgress * 0.5})) drop-shadow(0 ${12 + localProgress * 10}px 12px rgba(0,0,0,0.8))`
                    : isSelected ? 'drop-shadow(0 4px 8px rgba(251,191,36,0.35))' : 'none',
                  touchAction: 'none',
                  cursor: disabled ? 'default' : isDraggingThis ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                } as React.CSSProperties}
                onPointerDown={e => handlePDown(e, i)}
                onPointerMove={e => handlePMove(e, i)}
                onPointerUp={e => handlePUp(e, i)}
                onPointerCancel={handlePCancel}
              >
                <div style={{ pointerEvents: 'none' }}>
                  <PlayingCard card={card} selected={isSelected} />
                </div>
                {isDraggingThis && localProgress > 0.15 && (
                  <div style={{
                    position: 'absolute', inset: -6, borderRadius: 14, pointerEvents: 'none',
                    border: `2.5px solid rgba(251,191,36,${localProgress * 0.95})`,
                    boxShadow: `0 0 ${22 * localProgress}px rgba(251,191,36,${0.7 * localProgress})`,
                  }} />
                )}
                {isDraggingThis && localProgress > 0.55 && [0, 1, 2, 3].map(p => (
                  <motion.div key={p}
                    className="absolute rounded-full bg-yellow-300 pointer-events-none"
                    style={{ width: 5, height: 5, left: `${18 + p * 22}%`, top: -10 }}
                    animate={{ y: [-4, -18, -4], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 0.45, delay: p * 0.1 }}
                  />
                ))}
                {isDraggingThis && localProgress > 0.75 && (
                  <motion.div
                    className="absolute left-1/2 font-black text-yellow-300 text-[8px] tracking-widest pointer-events-none whitespace-nowrap"
                    style={{ top: -20, transform: 'translateX(-50%)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    RELEASE!
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── RevealedCardsRow ─────────────────────────────────────────────────────────

function RevealedCardsRow({ cards }: { cards: Card[] }) {
  return (
    <div className="flex gap-1.5 justify-center flex-wrap">
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} disabled />
      ))}
    </div>
  );
}

// ─── BustedOverlay ───────────────────────────────────────────────────────────

function BustedOverlay({ show, callerWins, loserName }: {
  show: boolean; callerWins: boolean; loserName: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{ borderRadius: 80 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <motion.div
            className="absolute"
            style={{
              width: 320, height: 320,
              background: callerWins
                ? 'conic-gradient(from 0deg, transparent, rgba(251,191,36,0.22) 10deg, transparent 20deg)'
                : 'conic-gradient(from 0deg, transparent, rgba(52,211,153,0.22) 10deg, transparent 20deg)',
              borderRadius: '50%',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          />
          <motion.div
            className="relative text-center px-4"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: callerWins ? -2 : 2 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 12 }}
          >
            <div className="font-black leading-none" style={{
              fontSize: 'clamp(42px, 11vw, 68px)',
              color: callerWins ? '#dc2626' : '#16a34a',
              textShadow:
                '-3px -3px 0 rgba(0,0,0,0.7), 3px -3px 0 rgba(0,0,0,0.7), -3px 3px 0 rgba(0,0,0,0.7), 3px 3px 0 rgba(0,0,0,0.7),' +
                `0 0 40px ${callerWins ? 'rgba(220,38,38,0.9)' : 'rgba(22,163,74,0.9)'}`,
            }}>
              {callerWins ? 'BUSTED!' : 'LEGIT!'}
            </div>
            <div className="mt-2 text-white font-bold text-xs px-3 py-1 rounded-full inline-block"
              style={{ background: 'rgba(0,0,0,0.65)' }}>
              {loserName} takes the pile
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BluffTableViewProps {
  myHand: Card[];
  myId: string | null;
  players: BluffPlayer[];
  pileSize: number;
  bluffWindowOpen: boolean;
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  lastPlay: { playerName: string; playedById: string | null; claimedRank: CardValue; claimedCount: number } | null;
  revealedCards: { cards: Card[]; claimedRank: CardValue; callerWins: boolean; loserName: string } | null;
  currentSeriesRank: CardValue | null;
  waitingForRankPick: boolean;
  rankPickStarterId: string | null;
  rankPickStarterName: string | null;
  pileTransfer: { loserName: string; cards: number; callerWins: boolean } | null;
  turnEndsAt?: number | null;
  onPlayCards: (indices: number[], rank: CardValue, count: number) => void;
  onSkipTurn: () => void;
  onCallBluff: () => void;
  onSetSeriesRank: (rank: CardValue) => void;
  onSendReaction?: (emoji: string) => void;
}

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😱', '🤡', '💀', '🎭', '👀'];
const MAX_SELECTION = 4;

// ─── BluffTableView ───────────────────────────────────────────────────────────

export default function BluffTableView({
  myHand, myId, players, pileSize, bluffWindowOpen,
  currentPlayerId, currentPlayerName, lastPlay, revealedCards,
  currentSeriesRank, waitingForRankPick, rankPickStarterId, rankPickStarterName,
  pileTransfer, turnEndsAt, onPlayCards, onSkipTurn, onCallBluff, onSetSeriesRank, onSendReaction,
}: BluffTableViewProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [playAnim, setPlayAnim] = useState(false);
  const [isSorted, setIsSorted] = useState(false);
  const [handOrder, setHandOrder] = useState<number[]>([]);
  const [showBusted, setShowBusted] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [floatingPlay, setFloatingPlay] = useState<string | null>(null);
  const [selectionToast, setSelectionToast] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const lastPlayKeyRef = useRef<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMyTurn = !!myId && myId === currentPlayerId;
  const isMyRankPick = waitingForRankPick && !!myId && myId === rankPickStarterId;
  const canCallBluff = bluffWindowOpen && !!myId && lastPlay?.playedById !== myId;
  const canSkip = isMyTurn && !bluffWindowOpen && !waitingForRankPick;

  useEffect(() => {
    setHandOrder(myHand.map((_, i) => i));
    setSelectedIndices([]);
    setIsSorted(false);
  }, [myHand]);

  useEffect(() => {
    if (!isMyTurn) setSelectedIndices([]);
  }, [isMyTurn]);

  useEffect(() => {
    if (!revealedCards) return;
    setShowChallenge(true);
    const t1 = setTimeout(() => setShowChallenge(false), 1400);
    const t2 = setTimeout(() => setShowBusted(true), 1100);
    const t3 = setTimeout(() => setShowBusted(false), 1100 + 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [revealedCards]);

  useEffect(() => {
    if (!lastPlay) return;
    const key = `${lastPlay.playerName}-${lastPlay.claimedRank}-${lastPlay.claimedCount}`;
    if (key === lastPlayKeyRef.current) return;
    lastPlayKeyRef.current = key;
    const text = `${lastPlay.playerName} placed ${lastPlay.claimedCount}× ${rnkLabel(lastPlay.claimedRank)}`;
    setFloatingPlay(text);
    const t = setTimeout(() => setFloatingPlay(null), 2200);
    return () => clearTimeout(t);
  }, [lastPlay]);

  useEffect(() => {
    const check = () => setIsLandscape(
      typeof window !== 'undefined' &&
      window.innerWidth > window.innerHeight &&
      window.innerWidth < 1024
    );
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  // Clear pending timers on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (dragPlayTimerRef.current) clearTimeout(dragPlayTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const displayedCards = handOrder.length === myHand.length
    ? handOrder.map(i => myHand[i])
    : myHand;

  const showSelectionToast = useCallback((msg: string) => {
    setSelectionToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSelectionToast(null), 2000);
  }, []);

  const handleToggle = useCallback((i: number) => {
    if (!isMyTurn || waitingForRankPick) return;
    setSelectedIndices(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      if (prev.length >= MAX_SELECTION) {
        showSelectionToast(`Max ${MAX_SELECTION} cards can be selected!`);
        return prev;
      }
      return [...prev, i];
    });
  }, [isMyTurn, waitingForRankPick, showSelectionToast]);

  const handleDragPlay = useCallback((displayIndex: number) => {
    if (!isMyTurn || waitingForRankPick || !currentSeriesRank) return;
    const indicesToPlay = selectedIndices.includes(displayIndex) && selectedIndices.length > 0
      ? selectedIndices
      : [displayIndex];
    setPlayAnim(true);
    const origIdx = indicesToPlay.map(dp => handOrder[dp] ?? dp);
    const rank = currentSeriesRank;
    if (dragPlayTimerRef.current) clearTimeout(dragPlayTimerRef.current);
    dragPlayTimerRef.current = setTimeout(() => {
      dragPlayTimerRef.current = null;
      onPlayCards(origIdx, rank, origIdx.length);
      setSelectedIndices([]);
      setPlayAnim(false);
    }, 320);
  }, [isMyTurn, waitingForRankPick, currentSeriesRank, selectedIndices, handOrder, onPlayCards]);

  const handleSort = () => {
    setSelectedIndices([]);
    if (isSorted) {
      setHandOrder(myHand.map((_, i) => i));
      setIsSorted(false);
    } else {
      const sorted = [...Array(myHand.length).keys()].sort((a, b) => myHand[a].value - myHand[b].value);
      setHandOrder(sorted);
      setIsSorted(true);
    }
  };

  const opponents = players.filter(p => p.id !== myId);
  const me = players.find(p => p.id === myId) ?? null;
  const visibleOpps = opponents.slice(0, 5);
  const oppPositions = getOpponentPositions(visibleOpps.length);

  // Assign character index: me = 0, opponents = 1..N
  const myCharIdx = 0;
  const oppCharIdxMap = Object.fromEntries(visibleOpps.map((opp, idx) => [opp.id, idx + 1]));

  // Controls panel (below table in portrait, right column in landscape)
  const controls = (
    <>
      {/* ── Rank picker ── */}
      {isMyRankPick && <InlineRankPicker onPick={onSetSeriesRank} starterName="You" />}
      {waitingForRankPick && !isMyRankPick && (
        <div className="text-center py-3 rounded-2xl border border-amber-700/30"
          style={{ background: 'rgba(245,158,11,0.07)' }}>
          <span className="text-amber-300 font-semibold text-sm">
            Waiting for <span className="font-black text-white">{rankPickStarterName}</span> to pick rank…
          </span>
        </div>
      )}

      {/* ── Revealed cards ── */}
      <AnimatePresence>
        {revealedCards && (
          <motion.div
            key="revealed-cards"
            className="rounded-2xl p-3 border text-center"
            style={{ background: 'rgba(30,27,58,0.8)', borderColor: 'rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-slate-400 text-xs font-semibold mb-2">
              Cards revealed — claimed {rnkLabel(revealedCards.claimedRank)}
            </p>
            <RevealedCardsRow cards={revealedCards.cards} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Turn status bar ── */}
      {!waitingForRankPick && (
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 min-w-0">
            {isMyTurn ? (
              <>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-emerald-400 font-black text-xs">Your turn</span>
                {currentSeriesRank && !isLandscape && (
                  <span className="text-slate-400 text-xs truncate">
                    — drag as <span className="font-black text-white">{rnkLabel(currentSeriesRank)}</span>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-slate-600 rounded-full flex-shrink-0" />
                <span className="text-slate-400 text-xs truncate">
                  <span className="font-black text-white">{currentPlayerName}</span>&apos;s turn
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SKIP button — bright orange so it's easy to find ── */}
      {canSkip && (
        <motion.button
          onClick={onSkipTurn}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm tracking-widest"
          style={{
            background: 'linear-gradient(180deg, #fb923c 0%, #ea580c 55%, #c2410c 100%)',
            border: '2px solid rgba(251,146,60,0.55)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -4px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(234,88,12,0.55)',
            letterSpacing: 3,
          }}
          whileHover={{ scale: 1.03, filter: 'brightness(1.08)' }}
          whileTap={{ scale: 0.96, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ⏭ SKIP TURN
        </motion.button>
      )}

      {/* SHOW! button */}
      <AnimatePresence>
        {canCallBluff && bluffWindowOpen && (
          <motion.button
            key="show-bluff-btn"
            onClick={() => { sfx.bluffCaught(); onCallBluff(); }}
            className="w-full py-3.5 rounded-2xl font-black text-white text-base"
            style={{
              background: 'linear-gradient(145deg, #991b1b, #dc2626)',
              border: '1px solid rgba(248,113,113,0.4)',
              boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1, opacity: 1,
              boxShadow: ['0 4px 20px rgba(220,38,38,0.35)', '0 4px 32px rgba(220,38,38,0.7)', '0 4px 20px rgba(220,38,38,0.35)'],
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ boxShadow: { repeat: Infinity, duration: 1.1 } }}
            whileTap={{ scale: 0.95 }}
          >
            🫵 SHOW! — Call Bluff
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── My hand ── */}
      <div className="rounded-2xl p-3 pt-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'visible' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Hand ({myHand.length})
            {selectedIndices.length > 0 && (
              <span className="text-emerald-400 ml-1.5">· {selectedIndices.length}/{MAX_SELECTION}</span>
            )}
          </span>
          <button onClick={handleSort} className="text-[10px] text-slate-600 hover:text-slate-300 font-bold transition-colors">
            {isSorted ? '↩ Unsort' : '↕ Sort'}
          </button>
        </div>

        <AnimatePresence>
          {selectionToast && (
            <motion.div
              key="selection-toast"
              className="mb-2 px-3 py-1.5 rounded-xl text-center text-xs font-black text-amber-300"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              ⚠️ {selectionToast}
            </motion.div>
          )}
        </AnimatePresence>

        <CardHand
          cards={displayedCards}
          selectedIndices={selectedIndices}
          onToggle={handleToggle}
          disabled={!isMyTurn || waitingForRankPick || playAnim}
          onDragPlay={isMyTurn && !waitingForRankPick && !!currentSeriesRank && !playAnim
            ? handleDragPlay : undefined}
          onDragActiveChange={setIsDraggingCard}
          compact={isLandscape}
        />
      </div>

      {/* ── Reactions ── */}
      {onSendReaction && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {REACTION_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => onSendReaction(e)}
              className="text-lg w-9 h-9 rounded-xl transition-all active:scale-90 hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <ChallengeOverlay show={showChallenge} />

      <div
        className={isLandscape ? 'flex flex-row gap-2' : 'flex flex-col gap-3'}
        style={isLandscape ? { minHeight: 'clamp(280px, 88svh, 580px)', alignItems: 'stretch' } : undefined}
      >

        {/* ── Rounded-Rect Table ── */}
        <div
          className="relative overflow-visible"
          style={{
            flex: isLandscape ? '1 1 auto' : undefined,
            width: isLandscape ? undefined : '100%',
            minWidth: isLandscape ? 0 : undefined,
            height: isLandscape ? '100%' : 'clamp(260px, 48svh, 440px)',
            minHeight: isLandscape ? 'clamp(280px, 88svh, 580px)' : undefined,
          }}
        >
          {/* Table surface */}
          <div className="absolute inset-0" style={{
            borderRadius: 80,
            background: 'radial-gradient(ellipse at 50% 40%, #24214e 0%, #181530 55%, #100d24 100%)',
            border: '5px solid #9040e8',
            boxShadow:
              '0 0 0 2px rgba(140,60,240,0.3), ' +
              '0 0 50px rgba(155,68,250,0.85), ' +
              '0 0 100px rgba(130,50,225,0.45), ' +
              'inset 0 0 90px rgba(0,0,0,0.62)',
          }} />
          <div className="absolute inset-0 overflow-hidden" style={{
            borderRadius: 80,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: 0.1,
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            borderRadius: 80,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }} />

          {/* ── Opponents ── */}
          {visibleOpps.map((opp, idx) => (
            <div key={opp.id} style={oppPositions[idx]}>
              <PlayerSlot
                player={opp}
                isActive={opp.id === currentPlayerId && !waitingForRankPick}
                isRankPicker={opp.id === rankPickStarterId && waitingForRankPick}
                showTimer={!!(opp.id === currentPlayerId && !isMyTurn && turnEndsAt)}
                timerEndsAt={turnEndsAt}
                charIdx={oppCharIdxMap[opp.id] ?? idx + 1}
              />
            </div>
          ))}

          {/* ── Center pile ── */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <CenterPile
              pileSize={pileSize}
              lastPlay={lastPlay}
              bluffWindowOpen={bluffWindowOpen}
              canCallBluff={canCallBluff}
              onCallBluff={onCallBluff}
              currentSeriesRank={currentSeriesRank}
              waitingForRankPick={waitingForRankPick}
              isDraggingCard={isDraggingCard && isMyTurn && !!currentSeriesRank}
            />
          </div>

          {/* ── Floating play text ── */}
          <AnimatePresence>
            {floatingPlay && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                style={{ bottom: '38%' }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -12 }}
                exit={{ opacity: 0, y: -28 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-3 py-1.5 rounded-full font-black text-xs text-white whitespace-nowrap"
                  style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {floatingPlay}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── +100 badge ── */}
          <AnimatePresence>
            {pileTransfer && pileTransfer.callerWins && (
              <motion.div
                className="absolute top-[20%] left-1/2 -translate-x-1/2 z-20 pointer-events-none font-black"
                style={{ fontSize: 'clamp(28px, 7vw, 42px)', color: '#fbbf24', textShadow: '-2px -2px 0 rgba(0,0,0,0.5), 2px 2px 0 rgba(0,0,0,0.5)' }}
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1, y: -36 }}
                transition={{ duration: 1.6 }}
              >
                +100
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Me (bottom) ── */}
          <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2">
              {isMyTurn && turnEndsAt && <TurnTimer endsAt={turnEndsAt} />}
              <PlayerSlot
                player={me}
                isActive={isMyTurn}
                isRankPicker={isMyRankPick}
                isMe
                hasBluffAlert={canCallBluff}
                charIdx={myCharIdx}
              />
            </div>
          </div>

          {/* ── BUSTED / LEGIT overlay ── */}
          <BustedOverlay
            show={showBusted && !!revealedCards}
            callerWins={revealedCards?.callerWins ?? false}
            loserName={revealedCards?.loserName ?? ''}
          />

          {/* ── Pile transfer toast ── */}
          <AnimatePresence>
            {pileTransfer && (
              <motion.div
                className="absolute top-[30%] left-1/2 -translate-x-1/2 z-20"
                initial={{ opacity: 0, scale: 0.75, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <div className={`px-4 py-2 rounded-2xl font-black text-xs whitespace-nowrap border backdrop-blur-sm ${
                  pileTransfer.callerWins
                    ? 'bg-rose-900/85 border-rose-500/55 text-rose-200'
                    : 'bg-emerald-900/85 border-emerald-500/55 text-emerald-200'
                }`}>
                  {pileTransfer.loserName} takes {pileTransfer.cards} cards
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls: side panel in landscape, stacked in portrait */}
        {isLandscape ? (
          <div
            className="flex flex-col gap-2 overflow-y-auto"
            style={{ width: 195, flexShrink: 0, paddingBottom: 8, paddingRight: 2 }}
          >
            {controls}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {controls}
          </div>
        )}
      </div>
    </>
  );
}
