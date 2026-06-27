'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/hooks/useGameSocket';
import { usePlayerProfile, AVATAR_EMOJIS } from '@/hooks/usePlayerProfile';
import GameBoard from '@/components/GameBoard';
import PlayerList from '@/components/PlayerList';
import CurrentCall from '@/components/CurrentCall';
import StackDisplay from '@/components/StackDisplay';
import ShuffleOverlay from '@/components/ShuffleOverlay';
import WakeUpLoader from '@/components/WakeUpLoader';
import ChatPanel from '@/components/ChatPanel';

export default function Home() {
  const router = useRouter();
  const game = useGameSocket();
  const { profile, loaded, createProfile, recordResult } = usePlayerProfile();
  const [selectedGame, setSelectedGame] = useState<'speed-match' | 'bluff' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  // Profile setup UI
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState(AVATAR_EMOJIS[0]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);

  useEffect(() => {
    if (game.connected) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2000);
    return () => clearTimeout(t);
  }, [game.connected]);

  useEffect(() => {
    if (!game.gameStarted) return;
    setShowShuffle(true);
    const t = setTimeout(() => setShowShuffle(false), 1600);
    return () => clearTimeout(t);
  }, [game.gameStarted]);

  // Pre-fill name from profile once loaded
  useEffect(() => {
    if (loaded && profile && !playerName) setPlayerName(profile.name);
  }, [loaded, profile]);

  // Record Speed Match result when game ends
  useEffect(() => {
    if (!game.winner || resultRecorded) return;
    setResultRecorded(true);
    recordResult('speedMatch', game.winner === playerName);
  }, [game.winner]);

  const isCurrentPlayer = !!game.myId && game.myId === game.currentPlayerId;

  const handleCreateRoom = () => {
    if (!playerName.trim()) { alert('Please enter your name'); return; }
    game.joinRoom(playerName);
    setIsHost(true);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) { alert('Please enter your name'); return; }
    if (!joinCode.trim()) { alert('Please enter room code'); return; }
    game.joinRoom(playerName, joinCode);
    setIsHost(false);
  };

  const handleCopyCode = useCallback(() => {
    if (!game.roomCode) return;
    navigator.clipboard.writeText(game.roomCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [game.roomCode]);

  const handleSendChat = useCallback((text: string) => {
    game.sendChat(text, playerName);
  }, [game, playerName]);

  const inputClass =
    'w-full px-4 py-3 rounded-2xl border-2 border-[#1e3a25] bg-[#0d2018] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition font-semibold';

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    createProfile(profileName.trim(), profileAvatar);
    setPlayerName(profileName.trim());
    setEditingProfile(false);
  };

  // ── Game selector ────────────────────────────────────────────────────────
  if (!selectedGame) {
    return (
      <div className="min-h-screen felt-bg flex flex-col items-center justify-center p-6 gap-8">
        {showWakeUp && <WakeUpLoader />}

        <div className="text-center">
          <div className="text-6xl mb-3">🃏</div>
          <h1 className="text-5xl font-black text-white tracking-tight">Card Games</h1>
          <p className="text-emerald-400/70 mt-2 font-semibold text-lg">Choose your game</p>
        </div>

        {/* ── Player profile card ── */}
        {loaded && (
          <div className="w-full max-w-4xl">
            {!profile || editingProfile ? (
              <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: '#0f1721' }}>
                <p className="text-slate-300 font-bold text-sm mb-3">{editingProfile ? 'Edit profile' : 'Set up your player profile'}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Your name"
                    maxLength={20}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-violet-500 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_EMOJIS.slice(0, 10).map(e => (
                      <button
                        key={e}
                        onClick={() => setProfileAvatar(e)}
                        className={`text-xl w-9 h-9 rounded-xl transition-all ${profileAvatar === e ? 'bg-violet-600 ring-2 ring-violet-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim()}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm disabled:opacity-40 transition-all"
                    >
                      Save
                    </button>
                    {editingProfile && (
                      <button onClick={() => setEditingProfile(false)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700/40 p-4 flex items-center justify-between" style={{ background: '#0f1721' }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{profile.avatar}</span>
                  <div>
                    <p className="text-white font-black text-base">{profile.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      {[
                        { label: '⚡', s: profile.stats.speedMatch },
                        { label: '🎭', s: profile.stats.bluff },
                        { label: '🕵️', s: profile.stats.guessWho },
                      ].map(({ label, s }) => (
                        <span key={label} className="text-xs text-slate-400 font-semibold">
                          {label} <span className="text-emerald-400">{s.wins}W</span>{' '}
                          <span className="text-rose-400">{s.losses}L</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setProfileName(profile.name); setProfileAvatar(profile.avatar); setEditingProfile(true); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-all"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          {/* Speed Match card */}
          <button
            onClick={() => setSelectedGame('speed-match')}
            className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all active:scale-95 border-2 border-yellow-500/30 hover:border-yellow-400/60"
            style={{ background: 'linear-gradient(145deg, #1a2e0f, #0f1f09)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: 'radial-gradient(circle, #ffd60a, transparent)', transform: 'translate(30%, -30%)' }} />
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-black text-white mb-2">Speed Match</h2>
            <p className="text-slate-400 text-sm font-semibold leading-relaxed">
              Race to match cards and slam the stack before anyone else does.
            </p>
            <div className="mt-5 flex items-center gap-2 text-yellow-400 text-sm font-bold">
              <span>2–4 players</span>
              <span className="text-slate-600">·</span>
              <span>Fast-paced</span>
            </div>
          </button>

          {/* Bluff card */}
          <button
            onClick={() => router.push('/bluff')}
            className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all active:scale-95 border-2 border-rose-500/30 hover:border-rose-400/60"
            style={{ background: 'linear-gradient(145deg, #2a0f1a, #1a0810)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: 'radial-gradient(circle, #e63946, transparent)', transform: 'translate(30%, -30%)' }} />
            <div className="text-5xl mb-4">🎭</div>
            <h2 className="text-2xl font-black text-white mb-2">Bluff</h2>
            <p className="text-slate-400 text-sm font-semibold leading-relaxed">
              Play cards face-down and lie about their rank. Call "Show" to catch liars.
            </p>
            <div className="mt-5 flex items-center gap-2 text-rose-400 text-sm font-bold">
              <span>2–6 players</span>
              <span className="text-slate-600">·</span>
              <span>Strategic</span>
            </div>
          </button>

          {/* Guess Who card */}
          <button
            onClick={() => router.push('/guess-who')}
            className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all active:scale-95 border-2 border-violet-500/30 hover:border-violet-400/60"
            style={{ background: 'linear-gradient(145deg, #1a0f2e, #100a1f)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', transform: 'translate(30%, -30%)' }} />
            <div className="text-5xl mb-4">🕵️</div>
            <h2 className="text-2xl font-black text-white mb-2">Guess Who?</h2>
            <p className="text-slate-400 text-sm font-semibold leading-relaxed">
              Pick a secret character. Ask yes/no questions to deduce your opponent's.
            </p>
            <div className="mt-5 flex items-center gap-2 text-violet-400 text-sm font-bold">
              <span>2 players</span>
              <span className="text-slate-600">·</span>
              <span>Deduction</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Speed Match lobby ────────────────────────────────────────────────────
  if (!game.roomCode) {
    return (
      <div className="min-h-screen felt-bg flex items-center justify-center p-4">
        {showWakeUp && <WakeUpLoader />}
        <div className="w-full max-w-md">
          <button
            onClick={() => setSelectedGame(null)}
            className="mb-4 text-slate-400 hover:text-emerald-400 text-sm font-bold flex items-center gap-1 transition-colors"
          >
            ← Back to games
          </button>
          <div className="rounded-3xl border border-[#1e3a25] shadow-2xl p-8" style={{ background: '#0d2018' }}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚡</div>
              <h1 className="text-3xl font-black text-white">Speed Match</h1>
              <p className="text-emerald-400/70 mt-1 font-semibold">Real-time multiplayer</p>
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
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 active:scale-95 shadow-lg shadow-yellow-900/30'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    ➕ Create Room
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#1e3a25]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 text-slate-500 font-semibold" style={{ background: '#0d2018' }}>or</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowJoinInput(true)}
                    className="w-full py-3.5 rounded-2xl font-black text-white border-2 border-emerald-600/50 hover:border-emerald-400 hover:bg-emerald-900/30 transition-all"
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
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 shadow-lg shadow-emerald-900/40'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    ✓ Join Room
                  </button>
                  <button
                    onClick={() => setShowJoinInput(false)}
                    className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm font-semibold"
                  >
                    ← Back to Create Room
                  </button>
                </>
              )}
            </div>

            {game.message && (
              <div className="mt-5 p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-2xl text-emerald-300 text-sm text-center font-semibold">
                {game.message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Speed Match game screen ──────────────────────────────────────────────
  return (
    <div className="min-h-screen felt-bg p-4 md:p-6">
      {showShuffle && <ShuffleOverlay />}

      {/* ── Reconnecting overlay ── */}
      {game.reconnecting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center animate-fade-in-up">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-wake-spin" />
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
            <span><span className="font-black text-yellow-300">{game.playerLeft}</span> left the game</span>
          </div>
        </div>
      )}

      {/* ── Reaction time badge ── */}
      {game.reactionTimeMs !== null && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 shadow-xl">
            <span className="text-xl">⚡</span>
            <span className="text-yellow-300 font-black text-sm">
              You claimed in {(game.reactionTimeMs / 1000).toFixed(2)}s!
            </span>
          </div>
        </div>
      )}

      {/* ── Claim streak badge ── */}
      {game.claimStreak >= 3 && (
        <div className="fixed top-16 right-5 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/20 border border-rose-400/40 shadow-xl">
            <span className="text-xl">🔥</span>
            <span className="text-rose-300 font-black text-sm">{game.claimStreak}x Streak!</span>
          </div>
        </div>
      )}

      {/* ── Game abandoned popup ── */}
      {game.gameAbandoned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-yellow-700/30 animate-fade-in-up"
            style={{ background: '#0d2018' }}>
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-black text-white mb-2">Game Ended</h2>
            <p className="text-slate-400 font-semibold text-sm mb-6">{game.gameAbandoned}</p>
            <button
              onClick={game.leaveRoom}
              className="w-full py-3.5 rounded-2xl font-black text-slate-900 bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all"
            >
              Exit Game
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">⚡ Speed Match</h1>
            <p className="text-slate-400 mt-1 font-semibold flex items-center flex-wrap gap-x-1">
              Room
              <button
                onClick={handleCopyCode}
                className="font-mono font-black text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                title="Click to copy room code"
              >
                {game.roomCode}
              </button>
              {copiedCode && <span className="text-emerald-400 text-xs font-bold">✓ Copied!</span>}
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-white">{playerName}</span>
              <span className={`inline-block w-2 h-2 rounded-full ml-2 ${game.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse-fast'}`} />
              {!game.connected && <span className="text-amber-400 text-xs font-bold">Reconnecting</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={game.toggleMute}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95"
            >
              {game.muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={game.leaveRoom}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-black rounded-2xl transition-all active:scale-95"
            >
              Leave
            </button>
          </div>
        </div>

        {game.message && (
          <div className="mb-5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/50 text-slate-100 font-semibold text-center">
            {game.message}
          </div>
        )}

        {game.winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-yellow-500/40"
              style={{ background: 'linear-gradient(145deg, #1a1a00, #2a2a00)' }}>
              <div className="text-7xl mb-3">🏆</div>
              <p className="text-4xl font-black text-yellow-400">{game.winner}</p>
              <p className="text-white font-bold text-xl mt-1">WINS!</p>
              <p className="text-slate-400 mt-2 font-semibold">{game.message}</p>
              <div className="mt-6 flex flex-col gap-3">
                {isHost ? (
                  <button onClick={game.restartGame} className="w-full py-3.5 rounded-2xl font-black text-slate-900 bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all">
                    🔁 Play Again
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm font-semibold">Waiting for host to start a new game…</p>
                )}
                <button onClick={game.leaveRoom} className="w-full py-2.5 text-slate-400 hover:text-white font-semibold text-sm">
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}

        {!game.gameStarted ? (
          <div className="rounded-3xl border border-[#1e3a25] shadow-xl p-8" style={{ background: '#0d2018' }}>
            <h2 className="text-2xl font-black mb-6 text-white">Game Lobby</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <PlayerList players={game.players} currentPlayerName={game.currentPlayerName} />
              <div className="rounded-2xl border border-[#1e3a25] p-6 flex flex-col justify-center" style={{ background: '#091510' }}>
                <p className="text-slate-300 mb-3 font-semibold">
                  Players: <span className="font-black text-white">{game.players.length}/4</span>
                </p>
                <div className="mb-5">
                  <p className="text-slate-400 mb-1 font-semibold">Share this code:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-mono font-black text-yellow-400 tracking-[0.3em]">
                      {game.roomCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
                    >
                      {copiedCode ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                {isHost && game.players.length >= 2 && (
                  <button
                    onClick={game.startGame}
                    className="px-6 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg shadow-yellow-900/30"
                  >
                    🎮 Start Game
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CurrentCall currentCall={game.gameState?.currentCall || 2} stackSize={game.stackSize} />
              <StackDisplay stackSize={game.stackSize} recentCard={game.recentCard} claimActive={game.canClaim} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <PlayerList players={game.players} currentPlayerName={game.currentPlayerName} />
              <GameBoard
                currentPlayerName={game.currentPlayerName}
                gameStarted={game.gameStarted}
                roomCode={game.roomCode}
                onDrawCard={game.drawCard}
                onClaimStack={game.claimStack}
                canDraw={isCurrentPlayer}
                canClaim={game.canClaim}
                claimEndsAt={game.claimEndsAt}
                isCurrentPlayer={isCurrentPlayer}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <ChatPanel
        messages={game.chatMessages}
        onSend={handleSendChat}
        myName={playerName}
        accentColor="emerald"
      />
    </div>
  );
}
