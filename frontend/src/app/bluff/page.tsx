'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBluffSocket } from '@/hooks/useBluffSocket';
import BluffBoard from '@/components/bluff/BluffBoard';
import WakeUpLoader from '@/components/WakeUpLoader';
import ChatPanel from '@/components/ChatPanel';

export default function BluffPage() {
  const router = useRouter();
  const game = useBluffSocket();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);

  useEffect(() => {
    if (game.connected) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2000);
    return () => clearTimeout(t);
  }, [game.connected]);

  // Auto-fill join code from ?code= URL param
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

  const inputClass =
    'w-full px-4 py-3 rounded-2xl border-2 border-[#2a1020] bg-[#1a0810] text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 transition font-semibold';

  // ── Entry screen ─────────────────────────────────────────────────────────
  if (!game.roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'radial-gradient(ellipse at 40% 30%, #2a0f1a 0%, #0d0a0f 70%)' }}>
        {showWakeUp && <WakeUpLoader />}
        <div className="w-full max-w-md">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-slate-500 hover:text-rose-400 text-sm font-bold flex items-center gap-1 transition-colors"
          >
            ← Back to games
          </button>

          <div className="rounded-3xl border border-rose-900/40 shadow-2xl p-8"
            style={{ background: '#1a0810' }}>
            <div className="text-center mb-7">
              <div className="text-5xl mb-3">🎭</div>
              <h1 className="text-4xl font-black text-white tracking-tight">Bluff</h1>
              <p className="text-rose-400/70 mt-1 font-semibold text-lg">Lie. Bluff. Win.</p>
            </div>

            {!game.connected && (
              <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/40 rounded-2xl text-amber-400 text-sm text-center font-semibold">
                Connecting to server…
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                  onKeyPress={(e) => { if (e.key === 'Enter' && !showJoinInput) handleCreateRoom(); }}
                />
              </div>

              {!showJoinInput && (
                <>
                  <button
                    onClick={handleCreateRoom}
                    disabled={!game.connected || !playerName.trim()}
                    className={`w-full py-3.5 rounded-2xl font-black text-lg transition-all ${
                      game.connected && playerName.trim()
                        ? 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-lg shadow-rose-900/40'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    ➕ Create Room
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-rose-900/40"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 text-slate-600 font-semibold" style={{ background: '#1a0810' }}>or</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowJoinInput(true)}
                    className="w-full py-3.5 rounded-2xl font-black text-white border-2 border-rose-800/50 hover:border-rose-500 hover:bg-rose-900/20 transition-all"
                  >
                    Join Existing Room
                  </button>
                </>
              )}

              {showJoinInput && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Room Code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className={`${inputClass} tracking-[0.4em] text-center text-xl`}
                      autoFocus
                      onKeyPress={(e) => { if (e.key === 'Enter' && joinCode.trim()) handleJoinRoom(); }}
                    />
                  </div>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!game.connected || !playerName.trim() || !joinCode.trim()}
                    className={`w-full py-3.5 rounded-2xl font-black text-lg transition-all ${
                      game.connected && playerName.trim() && joinCode.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-900/40'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    ✓ Join Room
                  </button>
                  <button
                    onClick={() => setShowJoinInput(false)}
                    className="w-full py-2 text-slate-600 hover:text-slate-300 text-sm font-semibold"
                  >
                    ← Back to Create Room
                  </button>
                </>
              )}
            </div>

            {game.message && (
              <div className="mt-5 p-3 bg-rose-900/20 border border-rose-700/30 rounded-2xl text-rose-300 text-sm text-center font-semibold">
                {game.message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6"
      style={{ background: 'radial-gradient(ellipse at 40% 20%, #1a0d12 0%, #0a0d0f 70%)' }}>

      {/* ── Reconnecting overlay ── */}
      {game.reconnecting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center animate-fade-in-up">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-rose-500/30 border-t-rose-400 animate-wake-spin" />
            <p className="text-white font-black text-xl">Reconnecting…</p>
            <p className="text-slate-400 text-sm mt-1 font-semibold">Please wait, restoring connection</p>
          </div>
        </div>
      )}

      {/* ── Player left toast ── */}
      {game.playerLeft && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800 border border-slate-600/50 shadow-2xl text-white font-semibold text-sm">
            <span className="text-2xl">👋</span>
            <span><span className="font-black text-rose-300">{game.playerLeft}</span> left the game</span>
          </div>
        </div>
      )}

      {/* ── Floating reactions overlay ── */}
      {game.reactions.length > 0 && (
        <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
          {game.reactions.map((r, i) => (
            <div
              key={r.id}
              className="absolute bottom-20 animate-reaction-float flex flex-col items-center"
              style={{ left: `${15 + (i % 6) * 13}%` }}
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-white text-xs font-bold bg-slate-800/70 px-1.5 py-0.5 rounded-lg mt-0.5 max-w-[60px] truncate">
                {r.playerName}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Game abandoned popup ── */}
      {game.gameAbandoned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-rose-800/40 animate-fade-in-up"
            style={{ background: '#1a0810' }}>
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-black text-white mb-2">Game Ended</h2>
            <p className="text-slate-400 font-semibold text-sm mb-6">{game.gameAbandoned}</p>
            <button
              onClick={game.leaveRoom}
              className="w-full py-3.5 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all"
            >
              Exit Game
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">🎭 Bluff</h1>
            <p className="text-slate-400 mt-0.5 font-semibold text-sm flex items-center flex-wrap gap-x-1">
              Room
              <button
                onClick={handleCopyCode}
                className="font-mono font-black text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Click to copy room code"
              >
                {game.roomCode}
              </button>
              {copiedCode && <span className="text-emerald-400 text-xs font-bold">✓ Copied!</span>}
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-white">{playerName}</span>
              {game.kittySize > 0 && (
                <span className="text-slate-500 text-xs">· {game.kittySize} kitty card{game.kittySize !== 1 ? 's' : ''}</span>
              )}
              <span className={`inline-block w-2 h-2 rounded-full ml-2 ${game.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse-fast'}`} />
              {!game.connected && <span className="text-amber-400 text-xs font-bold">Reconnecting</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLink}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95 text-sm"
              title="Share game link"
            >
              {sharedLink ? '✓' : '🔗'}
            </button>
            <button
              onClick={game.toggleMute}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95"
            >
              {game.muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={game.leaveRoom}
              className="px-5 py-2.5 bg-rose-800 hover:bg-rose-700 text-white font-black rounded-2xl transition-all active:scale-95"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Message bar */}
        {game.message && (
          <div className="mb-4 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-200 font-semibold text-center text-sm">
            {game.message}
          </div>
        )}

        {/* Winner overlay */}
        {game.winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-rose-500/30 animate-fade-in-up"
              style={{ background: 'linear-gradient(145deg, #1a0010, #0d000a)' }}>
              <div className="text-7xl mb-3">🏆</div>
              <p className="text-4xl font-black text-rose-400">{game.winner}</p>
              <p className="text-white font-bold text-xl mt-1">WINS!</p>
              <p className="text-slate-400 mt-2 font-semibold text-sm">{game.message}</p>

              {/* End-game stats */}
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-800/60 p-3 border border-slate-700/30">
                  <p className="text-2xl font-black text-emerald-400">{game.myStats.bluffsCaught}</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Bluffs<br/>Caught</p>
                </div>
                <div className="rounded-2xl bg-slate-800/60 p-3 border border-slate-700/30">
                  <p className="text-2xl font-black text-rose-400">{game.myStats.timesBluffCaught}</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Times<br/>Caught</p>
                </div>
                <div className="rounded-2xl bg-slate-800/60 p-3 border border-slate-700/30">
                  <p className="text-2xl font-black text-amber-400">{game.myStats.cardsTaken}</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Cards<br/>Taken</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {isHost ? (
                  <button
                    onClick={game.restartGame}
                    className="w-full py-3.5 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all"
                  >
                    🔁 Play Again
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm font-semibold">Waiting for host to start a new game…</p>
                )}
                <button onClick={game.leaveRoom} className="w-full py-2.5 text-slate-500 hover:text-white font-semibold text-sm">
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lobby */}
        {!game.gameStarted ? (
          <div className="rounded-3xl border border-rose-900/30 shadow-xl p-8" style={{ background: '#1a0810' }}>
            <h2 className="text-2xl font-black mb-6 text-white">Game Lobby</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Players</p>
                {game.players.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-rose-900/30"
                    style={{ background: '#240d18' }}>
                    <div className="w-8 h-8 rounded-full bg-rose-800/60 flex items-center justify-center text-sm font-black text-white">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="text-white font-bold">{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-rose-900/30 p-6 flex flex-col justify-center" style={{ background: '#240d18' }}>
                <p className="text-slate-400 mb-3 font-semibold">
                  Players: <span className="font-black text-white">{game.players.length}/6</span>
                </p>
                <div className="mb-4">
                  <p className="text-slate-500 text-sm font-semibold mb-2">Share this code:</p>
                  <p className="text-3xl font-mono font-black text-rose-400 tracking-[0.3em] mb-3">
                    {game.roomCode}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
                    >
                      {copiedCode ? '✓ Code Copied' : '📋 Copy Code'}
                    </button>
                    <button
                      onClick={handleShareLink}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-700 hover:bg-rose-600 text-white transition-all active:scale-95"
                    >
                      {sharedLink ? '✓ Link Copied' : '🔗 Share Link'}
                    </button>
                  </div>
                </div>
                {isHost && game.players.length >= 2 && (
                  <button
                    onClick={game.startGame}
                    className="px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg shadow-rose-900/40"
                  >
                    🎭 Start Bluff
                  </button>
                )}
                {isHost && game.players.length < 2 && (
                  <p className="text-slate-500 text-sm font-semibold">Need at least 2 players to start…</p>
                )}
                {!isHost && <p className="text-slate-500 text-sm font-semibold">Waiting for host to start…</p>}
              </div>
            </div>
          </div>
        ) : (
          <>
            <BluffBoard
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

            {/* Game log (collapsible) */}
            {game.gameLog.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-700/30 overflow-hidden" style={{ background: '#0d1510' }}>
                <button
                  onClick={() => setLogOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white font-semibold text-sm transition-colors"
                >
                  <span>📋 Game Log ({game.gameLog.length} entries)</span>
                  <span>{logOpen ? '▲' : '▼'}</span>
                </button>
                {logOpen && (
                  <div className="max-h-48 overflow-y-auto px-4 pb-4 space-y-1">
                    {[...game.gameLog].reverse().map(entry => (
                      <div key={entry.id} className="flex items-start gap-2 text-xs py-0.5">
                        <span className={`font-black shrink-0 ${
                          entry.type === 'bluff' ? 'text-rose-400' :
                          entry.type === 'skip' ? 'text-slate-500' :
                          entry.type === 'series' ? 'text-amber-400' :
                          entry.type === 'win' ? 'text-yellow-400' :
                          'text-emerald-400'
                        }`}>
                          {entry.type === 'bluff' ? '🎯' :
                           entry.type === 'skip' ? '⏭' :
                           entry.type === 'series' ? '🃏' :
                           entry.type === 'win' ? '🏆' : '▶'}
                        </span>
                        <span className="text-slate-300 font-semibold">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat panel (only during active game in a room) */}
      <ChatPanel
        messages={game.chatMessages}
        onSend={handleSendChat}
        myName={playerName}
        accentColor="rose"
      />
    </div>
  );
}
