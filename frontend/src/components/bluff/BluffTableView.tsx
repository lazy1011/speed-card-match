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

// ─── Opponent position layout ─────────────────────────────────────────────────
// Returns absolute-position styles for N opponents arranged naturally around the table.

function getOpponentPositions(n: number): React.CSSProperties[] {
  switch (n) {
    case 1:
      return [
        { position: 'absolute', top: '4%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
      ];
    case 2:
      return [
        { position: 'absolute', top: '5%', left: '27%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '5%', left: '73%', transform: 'translateX(-50%)', zIndex: 10 },
      ];
    case 3:
      return [
        { position: 'absolute', top: '4%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '3%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '3%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
    case 4:
      return [
        { position: 'absolute', top: '5%', left: '27%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '5%', left: '73%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '3%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '3%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
    default: // 5
      return [
        { position: 'absolute', top: '4%', left: '18%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '4%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '4%', left: '82%', transform: 'translateX(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', left: '3%', transform: 'translateY(-50%)', zIndex: 10 },
        { position: 'absolute', top: '50%', right: '3%', transform: 'translateY(-50%)', zIndex: 10 },
      ];
  }
}

// ─── FaceDownStack ────────────────────────────────────────────────────────────

function FaceDownStack({ count }: { count: number }) {
  const layers = Math.min(4, count);
  return (
    <div className="relative" style={{ width: 34 + layers * 2, height: 48 + layers * 2 }}>
      {[...Array(layers)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-md"
          style={{
            width: 34, height: 48,
            left: i * 2, top: i * 2,
            background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
            backgroundImage:
              'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.04) 4px,rgba(255,255,255,0.04) 8px)',
            zIndex: i,
          }}
        />
      ))}
    </div>
  );
}

// ─── PlayingCard ─────────────────────────────────────────────────────────────

function PlayingCard({
  card, selected, onClick, disabled,
}: {
  card: Card; selected?: boolean; onClick?: () => void; disabled?: boolean;
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const rank = rnkLabel(card.value);
  const suit = SUITS[card.suit];
  const clr = isRed ? '#dc2626' : '#111827';

  return (
    <motion.div
      onClick={!disabled ? onClick : undefined}
      className="relative bg-white rounded-lg select-none"
      style={{
        width: 54, height: 76, flexShrink: 0,
        border: selected ? '2px solid #fbbf24' : '1.5px solid #d1d5db',
        cursor: 'inherit',
        boxShadow: selected
          ? '0 0 16px rgba(251,191,36,0.75), 0 6px 18px rgba(0,0,0,0.55)'
          : '0 4px 10px rgba(0,0,0,0.5)',
      }}
      animate={{ y: selected ? -16 : 0, scale: selected ? 1.06 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
    >
      <div className="absolute top-0.5 left-1.5 leading-none" style={{ color: clr, fontSize: 10, fontWeight: 900 }}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ color: clr, fontSize: 22, fontWeight: 900 }}>
        {suit}
      </div>
      <div className="absolute bottom-0.5 right-1.5 rotate-180 leading-none" style={{ color: clr, fontSize: 10, fontWeight: 900 }}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
    </motion.div>
  );
}

// ─── TurnTimer ────────────────────────────────────────────────────────────────

function TurnTimer({ endsAt, total = 30 }: { endsAt: number; total?: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const pct = secs / total;
  const urgent = secs <= 8;
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

// ─── PlayerSlot ──────────────────────────────────────────────────────────────

function PlayerSlot({
  player, isActive, isRankPicker, isMe, showTimer, timerEndsAt,
}: {
  player: BluffPlayer | null;
  isActive: boolean;
  isRankPicker?: boolean;
  isMe?: boolean;
  showTimer?: boolean;
  timerEndsAt?: number | null;
}) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-25">
        <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
          <span className="text-slate-600 text-lg">+</span>
        </div>
        <span className="text-slate-600 text-[10px]">Empty</span>
      </div>
    );
  }

  const initials = player.name.slice(0, 2).toUpperCase();
  const ringClr = isActive ? '#fbbf24' : isRankPicker ? '#fb923c' : isMe ? '#34d399' : '#6d28d9';
  const glowClr = isActive
    ? 'rgba(251,191,36,0.55)'
    : isMe
    ? 'rgba(52,211,153,0.3)'
    : 'transparent';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <motion.div
          className="flex items-center justify-center rounded-full font-black text-white text-sm"
          style={{
            width: 46, height: 46,
            background: `linear-gradient(135deg, ${ringClr}35, ${ringClr}15)`,
            border: `3px solid ${ringClr}`,
            boxShadow: isActive ? `0 0 18px ${glowClr}` : isMe ? `0 0 10px ${glowClr}` : 'none',
          }}
          animate={isActive
            ? { boxShadow: [`0 0 8px ${glowClr}`, `0 0 24px rgba(251,191,36,0.75)`, `0 0 8px ${glowClr}`] }
            : {}
          }
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          {initials}
        </motion.div>
        {isActive && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#120e2a]" />
        )}
        {showTimer && timerEndsAt && (
          <div className="absolute -top-1 -right-1">
            <TurnTimer endsAt={timerEndsAt} />
          </div>
        )}
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
      {/* Series rank badge */}
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

      {/* Pile of cards — glows when a card is being dragged toward it */}
      <div className="relative" style={{ width: 56, height: 76 }}>
        {isDraggingCard && (
          <motion.div
            className="absolute rounded-xl border-2 border-yellow-400"
            style={{
              inset: -10, zIndex: 0,
              boxShadow: '0 0 24px rgba(251,191,36,0.5)',
            }}
            animate={{ boxShadow: ['0 0 12px rgba(251,191,36,0.4)', '0 0 28px rgba(251,191,36,0.75)', '0 0 12px rgba(251,191,36,0.4)'] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
          />
        )}
        {pileSize > 0 ? (
          <div className="absolute inset-0 z-10">
            {[...Array(Math.min(5, pileSize))].map((_, i) => (
              <div key={i} className="absolute rounded-lg" style={{
                width: 52, height: 72,
                left: (i - 2) * 2,
                top: -(i * 1.5),
                background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                transform: `rotate(${(i - 2) * 2.5}deg)`,
                zIndex: i,
              }} />
            ))}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg z-20"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
              <span className="text-white font-black text-base leading-none">{pileSize}</span>
              <span className="text-white/50 text-[8px] font-bold">cards</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-slate-700/60 flex items-center justify-center">
            <span className="text-slate-700 text-[9px] font-bold">pile</span>
          </div>
        )}
      </div>

      {/* Drop hint while dragging */}
      {isDraggingCard ? (
        <motion.div
          className="font-black text-[10px] text-yellow-300 tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.65 }}
        >
          ↑ DROP
        </motion.div>
      ) : lastPlay ? (
        <div className="text-center leading-none">
          <div className="text-white/50 text-[9px] font-semibold">{lastPlay.playerName}</div>
          <div className="text-white font-black text-xs">
            {lastPlay.claimedCount}× {rnkLabel(lastPlay.claimedRank)}
          </div>
        </div>
      ) : null}

      {/* BLUFF? button */}
      <AnimatePresence>
        {bluffWindowOpen && canCallBluff && (
          <motion.button
            onClick={onCallBluff}
            className="relative font-black text-white text-lg px-6 py-2.5 rounded-2xl"
            style={{
              background: 'linear-gradient(145deg, #18163a, #2a2550)',
              border: '2px solid rgba(255,200,0,0.55)',
              boxShadow: '0 0 20px rgba(255,150,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              letterSpacing: '0.5px',
            }}
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{
              scale: 1, opacity: 1, y: 0,
              boxShadow: ['0 0 14px rgba(255,150,0,0.3)', '0 0 32px rgba(255,150,0,0.6)', '0 0 14px rgba(255,150,0,0.3)'],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="text-white/40 mr-1.5">‹</span>
            BLUFF?
            <span className="text-white/40 ml-1.5">›</span>
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
      style={{
        background: 'rgba(30,27,58,0.97)',
        borderColor: 'rgba(251,146,60,0.5)',
        backdropFilter: 'blur(10px)',
      }}
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
              style={{
                background: 'linear-gradient(145deg, #4c1d95, #5b21b6)',
                border: '1px solid rgba(124,58,237,0.5)',
              }}
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

// ─── CardHand (fan layout + drag-to-play) ────────────────────────────────────
// Drag any card upward > 80 px to play it. Tap to select. Drag a selected card
// to play all selected cards at once; drag an unselected card to play just it.

function CardHand({
  cards, selectedIndices, onToggle, disabled, onDragPlay, onDragActiveChange,
}: {
  cards: Card[];
  selectedIndices: number[];
  onToggle: (i: number) => void;
  disabled: boolean;
  onDragPlay?: (cardIndex: number) => void;
  onDragActiveChange?: (active: boolean) => void;
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
      <div className="h-24 flex items-center justify-center">
        <span className="text-slate-600 text-sm font-bold">No cards in hand</span>
      </div>
    );
  }

  const n = cards.length;
  const overlap = Math.min(32, 340 / Math.max(1, n - 1));
  const maxRot = Math.min(5, 48 / n);

  function handlePDown(e: React.PointerEvent, i: number) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { index: i, startY: e.clientY, currentDY: 0, wasDrag: false };
    setDragState({ index: i, dy: 0 });
  }

  function handlePMove(e: React.PointerEvent, i: number) {
    if (!dragRef.current || dragRef.current.index !== i) return;
    const dy = Math.max(-200, Math.min(24, e.clientY - dragRef.current.startY));
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

  return (
    <div className="relative flex justify-center items-end overflow-visible" style={{ height: 112 }}>
      {/* Subtle swipe hint when it's the player's turn */}
      {!disabled && (
        <div className="absolute -top-5 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-slate-600 text-[9px] font-semibold tracking-wider uppercase">
            tap to select · drag up to play
          </span>
        </div>
      )}

      {cards.map((card, i) => {
        const offset = i - (n - 1) / 2;
        const rot = offset * maxRot;
        const ty = Math.abs(offset) * 1.2;
        const isSelected = selectedIndices.includes(i);
        const isDraggingThis = dragState?.index === i;
        const extraDy = isDraggingThis ? dragState!.dy : 0;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `calc(50% + ${offset * overlap}px - 27px)`,
              bottom: 0,
              transform: `rotate(${rot}deg) translateY(${ty + extraDy}px)`,
              transformOrigin: 'bottom center',
              zIndex: isDraggingThis ? 500 : (isSelected ? 200 + i : i),
              transition: isDraggingThis ? 'none' : 'transform 0.2s ease-out',
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
            {/* pointer-events:none prevents PlayingCard from intercepting drag events */}
            <div style={{ pointerEvents: 'none' }}>
              <PlayingCard card={card} selected={isSelected} />
            </div>
          </div>
        );
      })}
    </div>
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

function BustedOverlay({
  show, callerWins, loserName,
}: {
  show: boolean;
  callerWins: boolean;
  loserName: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-[40%] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {/* Spinning sunburst */}
          <motion.div
            className="absolute"
            style={{
              width: 300, height: 300,
              background: callerWins
                ? 'conic-gradient(from 0deg, transparent, rgba(251,191,36,0.18) 10deg, transparent 20deg)'
                : 'conic-gradient(from 0deg, transparent, rgba(52,211,153,0.18) 10deg, transparent 20deg)',
              borderRadius: '50%',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          />

          {/* Explosion text */}
          <motion.div
            className="relative text-center px-4"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: callerWins ? -2 : 2 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 12 }}
          >
            <div
              className="font-black leading-none"
              style={{
                fontSize: 'clamp(38px, 10vw, 64px)',
                color: callerWins ? '#dc2626' : '#16a34a',
                WebkitTextStroke: '2.5px rgba(0,0,0,0.85)',
                textShadow: `3px 3px 0 rgba(0,0,0,0.6), 0 0 36px ${callerWins ? 'rgba(220,38,38,0.85)' : 'rgba(22,163,74,0.85)'}`,
              }}
            >
              {callerWins ? 'BUSTED!' : 'LEGIT!'}
            </div>
            <div
              className="mt-2 text-white font-bold text-xs px-3 py-1 rounded-full inline-block"
              style={{ background: 'rgba(0,0,0,0.65)' }}
            >
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
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const isMyTurn = !!myId && myId === currentPlayerId;
  const isMyRankPick = waitingForRankPick && !!myId && myId === rankPickStarterId;
  const canCallBluff = bluffWindowOpen && !!myId && lastPlay?.playedById !== myId;
  const canSkip = isMyTurn && !bluffWindowOpen && !waitingForRankPick;
  const canPlay = isMyTurn && !waitingForRankPick && !!currentSeriesRank && selectedIndices.length > 0;

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
    setShowBusted(true);
    const t = setTimeout(() => setShowBusted(false), 3200);
    return () => clearTimeout(t);
  }, [revealedCards]);

  const displayedCards = handOrder.length === myHand.length
    ? handOrder.map(i => myHand[i])
    : myHand;

  const handleToggle = useCallback((i: number) => {
    if (!isMyTurn || waitingForRankPick) return;
    setSelectedIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }, [isMyTurn, waitingForRankPick]);

  const handlePlay = () => {
    if (!canPlay || !currentSeriesRank) return;
    setPlayAnim(true);
    const origIdx = selectedIndices.map(dp => handOrder[dp] ?? dp);
    const rank = currentSeriesRank;
    setTimeout(() => {
      onPlayCards(origIdx, rank, origIdx.length);
      setSelectedIndices([]);
      setPlayAnim(false);
    }, 380);
  };

  // Drag-to-play handler: dragging a selected card plays ALL selected;
  // dragging an unselected card plays just that one.
  const handleDragPlay = useCallback((displayIndex: number) => {
    if (!isMyTurn || waitingForRankPick || !currentSeriesRank) return;
    const indicesToPlay = selectedIndices.includes(displayIndex) && selectedIndices.length > 0
      ? selectedIndices
      : [displayIndex];
    setPlayAnim(true);
    const origIdx = indicesToPlay.map(dp => handOrder[dp] ?? dp);
    const rank = currentSeriesRank;
    setTimeout(() => {
      onPlayCards(origIdx, rank, origIdx.length);
      setSelectedIndices([]);
      setPlayAnim(false);
    }, 380);
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

  // Smart positioning: sort opponents by player order, then assign positions by count.
  const opponents = players.filter(p => p.id !== myId);
  const me = players.find(p => p.id === myId) ?? null;
  const visibleOpps = opponents.slice(0, 5);
  const oppPositions = getOpponentPositions(visibleOpps.length);

  return (
    <div className="flex flex-col gap-3">

      {/* ── Oval Table ────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-visible"
        style={{ aspectRatio: '16/9', minHeight: 260, maxHeight: 460 }}
      >
        {/* Table surface */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '40%',
            background: 'radial-gradient(ellipse at 50% 40%, #1e1b3a 0%, #120e2a 80%)',
            border: '5px solid #7c3aed',
            boxShadow:
              '0 0 50px rgba(124,58,237,0.7), 0 0 100px rgba(124,58,237,0.3), inset 0 0 80px rgba(0,0,0,0.55)',
          }}
        />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 overflow-hidden opacity-15"
          style={{
            borderRadius: '40%',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* ── Opponents — auto-positioned by count ── */}
        {visibleOpps.map((opp, idx) => (
          <div key={opp.id} style={oppPositions[idx]}>
            <PlayerSlot
              player={opp}
              isActive={opp.id === currentPlayerId && !waitingForRankPick}
              isRankPicker={opp.id === rankPickStarterId && waitingForRankPick}
              showTimer={!!(opp.id === currentPlayerId && !isMyTurn && turnEndsAt)}
              timerEndsAt={turnEndsAt}
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

        {/* ── Me (bottom) ── */}
        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2">
            {isMyTurn && turnEndsAt && (
              <TurnTimer endsAt={turnEndsAt} />
            )}
            <PlayerSlot
              player={me}
              isActive={isMyTurn}
              isRankPicker={isMyRankPick}
              isMe
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
              <div
                className={`px-4 py-2 rounded-2xl font-black text-xs whitespace-nowrap border backdrop-blur-sm ${
                  pileTransfer.callerWins
                    ? 'bg-rose-900/85 border-rose-500/55 text-rose-200'
                    : 'bg-emerald-900/85 border-emerald-500/55 text-emerald-200'
                }`}
              >
                {pileTransfer.loserName} takes {pileTransfer.cards} cards
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Rank picker ────────────────────────────────────────────────────── */}
      {isMyRankPick && <InlineRankPicker onPick={onSetSeriesRank} starterName="You" />}
      {waitingForRankPick && !isMyRankPick && (
        <div
          className="text-center py-3 rounded-2xl border border-amber-700/30"
          style={{ background: 'rgba(245,158,11,0.07)' }}
        >
          <span className="text-amber-300 font-semibold text-sm">
            Waiting for <span className="font-black text-white">{rankPickStarterName}</span> to pick rank…
          </span>
        </div>
      )}

      {/* ── Revealed cards (after Show) ────────────────────────────────────── */}
      <AnimatePresence>
        {revealedCards && (
          <motion.div
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

      {/* ── Turn status bar ─────────────────────────────────────────────────── */}
      {!waitingForRankPick && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            {isMyTurn ? (
              <>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-black text-sm">Your turn</span>
                {currentSeriesRank && (
                  <span className="text-slate-400 text-sm">
                    — play as <span className="font-black text-white">{rnkLabel(currentSeriesRank)}</span>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-slate-600 rounded-full" />
                <span className="text-slate-400 text-sm">
                  <span className="font-black text-white">{currentPlayerName}</span>'s turn
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────────────── */}
      {(canPlay || canSkip || (canCallBluff && !bluffWindowOpen)) && (
        <div className="flex gap-2.5">
          {canPlay && (
            <motion.button
              onClick={handlePlay}
              disabled={playAnim}
              className="flex-1 py-4 rounded-2xl font-black text-white text-sm md:text-base"
              style={{
                background: 'linear-gradient(145deg, #059669, #10b981)',
                boxShadow: '0 4px 18px rgba(16,185,129,0.32)',
                border: '1px solid rgba(52,211,153,0.3)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              {playAnim ? '🃏 Playing…' : `Play ${selectedIndices.length} as ${rnkLabel(currentSeriesRank!)}`}
            </motion.button>
          )}

          {canSkip && (
            <motion.button
              onClick={onSkipTurn}
              className={`${canPlay ? 'px-5' : 'flex-1'} py-4 rounded-2xl font-black text-slate-300 text-sm md:text-base`}
              style={{
                background: 'linear-gradient(145deg, #1e1b3a, #2d2a50)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              Skip
            </motion.button>
          )}
        </div>
      )}

      {/* SHOW! button — separate row so it's always prominent */}
      <AnimatePresence>
        {canCallBluff && bluffWindowOpen && (
          <motion.button
            onClick={() => { sfx.bluffCaught(); onCallBluff(); }}
            className="w-full py-4 rounded-2xl font-black text-white text-base"
            style={{
              background: 'linear-gradient(145deg, #991b1b, #dc2626)',
              border: '1px solid rgba(248,113,113,0.4)',
              boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1, opacity: 1,
              boxShadow: ['0 4px 20px rgba(220,38,38,0.35)', '0 4px 32px rgba(220,38,38,0.65)', '0 4px 20px rgba(220,38,38,0.35)'],
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ boxShadow: { repeat: Infinity, duration: 1.1 } }}
            whileTap={{ scale: 0.95 }}
          >
            🫵 SHOW! — Call Bluff
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── My hand ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-3 pt-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Hand ({myHand.length})
            {selectedIndices.length > 0 && (
              <span className="text-emerald-400 ml-1.5">· {selectedIndices.length} selected</span>
            )}
          </span>
          <button onClick={handleSort} className="text-[10px] text-slate-600 hover:text-slate-300 font-bold transition-colors">
            {isSorted ? '↩ Unsort' : '↕ Sort'}
          </button>
        </div>

        <CardHand
          cards={displayedCards}
          selectedIndices={selectedIndices}
          onToggle={handleToggle}
          disabled={!isMyTurn || waitingForRankPick || playAnim}
          onDragPlay={isMyTurn && !waitingForRankPick && !!currentSeriesRank && !playAnim
            ? handleDragPlay
            : undefined}
          onDragActiveChange={setIsDraggingCard}
        />
      </div>

      {/* ── Reactions ───────────────────────────────────────────────────────── */}
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
    </div>
  );
}
