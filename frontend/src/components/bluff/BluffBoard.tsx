'use client';

import { useState, useEffect } from 'react';
import { Card, CardValue, BluffPlayer } from '@/types/game';
import HandDisplay from './HandDisplay';
import PileDisplay from './PileDisplay';
import RankPickerModal from './RankPickerModal';
import { sfx } from '@/utils/sounds';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😱', '🤡', '💀', '🎭', '👀'];

interface BluffBoardProps {
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

function rankLabel(v: CardValue): string {
  const m: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return m[v] ?? String(v);
}

function TurnTimer({ endsAt }: { endsAt: number }) {
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const pct = Math.max(0, Math.min(100, (secs / 30) * 100));
  const urgent = secs <= 8;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-rose-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-black tabular-nums min-w-[2ch] ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>
        {secs}s
      </span>
    </div>
  );
}

export default function BluffBoard({
  myHand, myId, players, pileSize, bluffWindowOpen,
  currentPlayerId, currentPlayerName, lastPlay, revealedCards,
  currentSeriesRank, waitingForRankPick, rankPickStarterId, rankPickStarterName,
  pileTransfer, turnEndsAt, onPlayCards, onSkipTurn, onCallBluff, onSetSeriesRank,
  onSendReaction,
}: BluffBoardProps) {
  // selectedIndices stores DISPLAY positions (0..displayedCards.length-1)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [playAnim, setPlayAnim] = useState(false);
  const [pileAnim, setPileAnim] = useState<'receive' | 'take' | null>(null);
  const [rankPickerVisible, setRankPickerVisible] = useState(false);

  // Sort state: handDisplayOrder[displayPos] = originalIndex into myHand
  const [handDisplayOrder, setHandDisplayOrder] = useState<number[]>([]);
  const [isSorted, setIsSorted] = useState(false);

  const isMyTurn = !!myId && myId === currentPlayerId;
  const isMyRankPick = waitingForRankPick && !!myId && myId === rankPickStarterId;
  const canShow = bluffWindowOpen && !!myId && myId !== (lastPlay?.playedById ?? null);
  const canSkip = isMyTurn && !bluffWindowOpen && !waitingForRankPick;
  const canPlay = isMyTurn && !waitingForRankPick && !!currentSeriesRank && selectedIndices.length > 0;

  // Reset display order + selection whenever a new hand arrives from the server
  useEffect(() => {
    const order = myHand.map((_, i) => i);
    setHandDisplayOrder(order);
    setSelectedIndices([]);
    setIsSorted(false);
  }, [myHand]);

  // Clear selection when it's no longer our turn
  useEffect(() => {
    if (!isMyTurn) setSelectedIndices([]);
  }, [isMyTurn]);

  useEffect(() => {
    if (!waitingForRankPick) { setRankPickerVisible(false); return; }
    // Show rank picker immediately (no delay) so user can look at hand while picking
    setRankPickerVisible(true);
  }, [waitingForRankPick]);

  useEffect(() => {
    if (pileSize > 0) {
      setPileAnim('receive');
      const t = setTimeout(() => setPileAnim(null), 500);
      return () => clearTimeout(t);
    }
  }, [pileSize]);

  useEffect(() => {
    if (pileTransfer) {
      setPileAnim('take');
      const t = setTimeout(() => setPileAnim(null), 500);
      return () => clearTimeout(t);
    }
  }, [pileTransfer]);

  // Cards to display (in sorted order if active)
  const displayedCards: Card[] = handDisplayOrder.length === myHand.length
    ? handDisplayOrder.map(i => myHand[i])
    : myHand;

  const handleToggle = (displayPos: number) => {
    if (!isMyTurn || waitingForRankPick) return;
    setSelectedIndices(prev =>
      prev.includes(displayPos) ? prev.filter(x => x !== displayPos) : [...prev, displayPos]
    );
  };

  const handleSortHand = () => {
    if (myHand.length === 0) return;
    setSelectedIndices([]); // clear selection on sort
    if (isSorted) {
      // restore original server order
      setHandDisplayOrder(myHand.map((_, i) => i));
      setIsSorted(false);
    } else {
      // sort by value ascending (2 → A)
      const sorted = [...Array(myHand.length).keys()].sort(
        (a, b) => myHand[a].value - myHand[b].value
      );
      setHandDisplayOrder(sorted);
      setIsSorted(true);
    }
  };

  const handlePlay = () => {
    if (!canPlay || !currentSeriesRank) return;
    sfx.cardPlay();
    setPlayAnim(true);
    const rank = currentSeriesRank;
    // Convert display positions → original server indices before sending
    const originalIndices = selectedIndices.map(dp => handDisplayOrder[dp] ?? dp);
    setTimeout(() => {
      onPlayCards(originalIndices, rank, originalIndices.length);
      setSelectedIndices([]);
      setPlayAnim(false);
    }, 500);
  };

  const actionRow = (
    <div className="flex gap-3 items-stretch">
      {canPlay && (
        <button
          onClick={handlePlay}
          disabled={playAnim}
          className="flex-1 py-4 rounded-2xl font-black text-white text-lg bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-70"
        >
          {playAnim
            ? '🃏 Playing…'
            : `Play ${selectedIndices.length} card${selectedIndices.length !== 1 ? 's' : ''} as ${rankLabel(currentSeriesRank!)}`}
        </button>
      )}

      {canSkip && selectedIndices.length === 0 && (
        <button
          onClick={onSkipTurn}
          className="flex-1 py-4 rounded-2xl font-bold text-slate-300 bg-slate-700/70 hover:bg-slate-600 border border-slate-600/40 active:scale-95 transition-all"
        >
          Skip
        </button>
      )}
      {canSkip && selectedIndices.length > 0 && (
        <button
          onClick={onSkipTurn}
          className="px-5 py-4 rounded-2xl font-bold text-slate-400 bg-slate-700/70 hover:bg-slate-600 border border-slate-600/40 active:scale-95 transition-all"
        >
          Skip
        </button>
      )}

      {canShow && (
        <button
          onClick={() => { sfx.bluffCaught(); onCallBluff(); }}
          className="px-6 py-4 rounded-2xl font-black text-white text-lg active:scale-95 transition-all border border-rose-500/40"
          style={{ background: 'linear-gradient(145deg, #c0392b, #e63946)', boxShadow: '0 0 20px rgba(230,57,70,0.3)' }}
        >
          🫵 SHOW!
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Player strips — always at top so you can see everyone without scrolling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {players.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl p-3 text-center transition-all ${
              !waitingForRankPick && p.id === currentPlayerId
                ? 'bg-emerald-700/40 ring-2 ring-emerald-400'
                : waitingForRankPick && p.id === rankPickStarterId
                ? 'bg-amber-700/25 ring-2 ring-amber-400'
                : 'bg-slate-800/50 ring-1 ring-white/10'
            }`}
          >
            <p className="text-white font-bold text-sm truncate">{p.name}</p>
            <p className="text-slate-400 text-xs mt-0.5 font-semibold">{p.handSize} cards</p>
            {!waitingForRankPick && p.id === currentPlayerId && (
              <span className="mt-1 inline-block text-emerald-300 text-xs font-bold">● turn</span>
            )}
            {waitingForRankPick && p.id === rankPickStarterId && (
              <span className="mt-1 inline-block text-amber-300 text-xs font-bold">picks rank</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Rank picker: inline (not fullscreen) so hand is visible below ── */}
      {isMyRankPick && rankPickerVisible && (
        <RankPickerModal
          starterName="You"
          pileTransfer={pileTransfer}
          onPick={onSetSeriesRank}
        />
      )}

      {/* Waiting for another player to pick rank */}
      {waitingForRankPick && !isMyRankPick && (
        <div className="rounded-2xl bg-amber-900/20 border border-amber-700/30 p-3 text-center">
          <p className="text-amber-300 font-semibold text-sm">
            Waiting for <span className="text-white font-black">{rankPickStarterName}</span> to set the next rank…
          </p>
        </div>
      )}

      {/* Series rank banner — prominent, no side text */}
      {currentSeriesRank && !waitingForRankPick && (
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-emerald-900/50 border-2 border-emerald-500/70 py-3 px-6 shadow-lg shadow-emerald-950/40">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Series Rank</span>
          <span className="text-5xl font-black text-emerald-300 drop-shadow-lg">{rankLabel(currentSeriesRank)}</span>
        </div>
      )}

      {/* Pile transfer notification */}
      {pileTransfer && (
        <div className={`rounded-2xl p-4 text-center font-bold border animate-fade-in-up ${
          pileTransfer.callerWins
            ? 'bg-rose-900/40 border-rose-500/50 text-rose-200'
            : 'bg-amber-900/40 border-amber-500/50 text-amber-200'
        }`}>
          <p className="text-lg font-black">
            {pileTransfer.callerWins ? '🎯 Bluff caught!' : '✅ Legit play!'}
          </p>
          <p className="text-sm mt-0.5 font-semibold opacity-90">
            {pileTransfer.loserName} takes <span className="text-white font-black">{pileTransfer.cards} cards</span> from the pile.
          </p>
        </div>
      )}

      {/* Turn indicator + timer */}
      {!waitingForRankPick && (
        <div className="text-center">
          {isMyTurn ? (
            <>
              <p className="text-emerald-400 font-black text-base">Your turn — select cards to play, or skip</p>
              {turnEndsAt && <TurnTimer endsAt={turnEndsAt} />}
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm font-semibold">
                Waiting for <span className="text-white font-black">{currentPlayerName}</span>…
              </p>
              {turnEndsAt && (
                <div className="flex justify-center mt-1.5">
                  <div className="w-32"><TurnTimer endsAt={turnEndsAt} /></div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action buttons — shown here on mobile so thumbs can reach easily */}
      {(canPlay || canSkip || canShow) && (
        <div className="lg:hidden">{actionRow}</div>
      )}

      {/* Main game area: pile + hand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PileDisplay
          pileSize={pileSize}
          lastPlay={lastPlay}
          bluffWindowOpen={bluffWindowOpen}
          revealedCards={revealedCards}
          pileAnim={pileAnim}
        />
        <HandDisplay
          cards={displayedCards}
          selectedIndices={selectedIndices}
          onToggle={handleToggle}
          onSort={handleSortHand}
          isSorted={isSorted}
          disabled={!isMyTurn || waitingForRankPick}
          playAnim={playAnim}
        />
      </div>

      {/* Action row — desktop only (mobile shows it above) */}
      <div className="hidden lg:block">{actionRow}</div>

      {/* Emoji reactions row */}
      {onSendReaction && (
        <div className="flex gap-1.5 justify-center flex-wrap pt-1">
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="text-xl w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 hover:border-slate-500 active:scale-90 transition-all"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
