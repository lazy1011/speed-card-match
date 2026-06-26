'use client';

import { useEffect, useState } from 'react';
import { useGameSocket } from '@/hooks/useGameSocket';
import GameBoard from '@/components/GameBoard';
import PlayerList from '@/components/PlayerList';
import CurrentCall from '@/components/CurrentCall';
import StackDisplay from '@/components/StackDisplay';
import ShuffleOverlay from '@/components/ShuffleOverlay';

export default function Home() {
  const game = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);

  // Whose turn it is — compare by socket ID (robust to duplicate names).
  const isCurrentPlayer = !!game.myId && game.myId === game.currentPlayerId;

  // Show a brief shuffle animation when the game starts.
  useEffect(() => {
    if (!game.gameStarted) return;
    setShowShuffle(true);
    const t = setTimeout(() => setShowShuffle(false), 1600);
    return () => clearTimeout(t);
  }, [game.gameStarted]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    game.joinRoom(playerName);
    setIsHost(true);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      alert('Please enter room code');
      return;
    }
    game.joinRoom(playerName, joinCode);
    setIsHost(false);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition';

  // Home screen
  if (!game.roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-extrabold text-center mb-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              ⚡ Speed Card Match
            </h1>
            <p className="text-center text-slate-500 mb-8">Real-time Multiplayer Card Game</p>

            {!game.connected && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-sm text-center">
                Connecting to server…
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showJoinInput) handleCreateRoom();
                  }}
                />
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!game.connected || !playerName.trim()}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  game.connected && playerName.trim()
                    ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-95 cursor-pointer shadow-lg shadow-indigo-300'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                ➕ Create New Room
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-400">Or</span>
                </div>
              </div>

              {!showJoinInput ? (
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="w-full py-3 rounded-xl font-bold text-indigo-600 border-2 border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  Join Existing Room
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className={`${inputClass} tracking-[0.4em] text-center font-mono font-bold`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && joinCode.trim()) handleJoinRoom();
                      }}
                    />
                  </div>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!game.connected || !playerName.trim() || !joinCode.trim()}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                      game.connected && playerName.trim() && joinCode.trim()
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 cursor-pointer shadow-lg shadow-emerald-300'
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    ✓ Join Room
                  </button>
                  <button
                    onClick={() => setShowJoinInput(false)}
                    className="w-full py-2 text-slate-400 hover:text-slate-600"
                  >
                    Back
                  </button>
                </>
              )}
            </div>

            {game.message && (
              <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm text-center">
                {game.message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-4 md:p-6">
      {showShuffle && <ShuffleOverlay />}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              ⚡ Speed Card Match
            </h1>
            <p className="text-slate-400 mt-1">
              Room <span className="font-mono font-semibold text-emerald-400">{game.roomCode}</span>
              <span className="mx-2 text-slate-600">•</span>
              You: <span className="font-semibold text-white">{playerName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={game.toggleMute}
              title={game.muted ? 'Unmute' : 'Mute'}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              {game.muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={game.leaveRoom}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Messages */}
        {game.message && (
          <div className="mb-5 p-3 rounded-xl bg-slate-800/80 ring-1 ring-white/10 text-slate-100 font-medium text-center">
            {game.message}
          </div>
        )}

        {game.winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-400 to-yellow-300 p-8 text-center shadow-2xl">
              <div className="text-6xl mb-3">🏆</div>
              <p className="text-3xl font-extrabold text-slate-900">{game.winner} WINS!</p>
              <p className="text-slate-800 mt-2">{game.message}</p>
              <div className="mt-6 flex flex-col gap-3">
                {isHost ? (
                  <button
                    onClick={game.restartGame}
                    className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg"
                  >
                    🔁 Play Again
                  </button>
                ) : (
                  <p className="text-slate-700 text-sm">Waiting for host to start a new game…</p>
                )}
                <button
                  onClick={game.leaveRoom}
                  className="w-full py-2.5 rounded-xl font-semibold text-slate-700 hover:text-slate-900"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}

        {!game.gameStarted ? (
          // Lobby
          <div className="rounded-2xl bg-slate-800/80 ring-1 ring-white/10 shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Game Lobby</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <PlayerList players={game.players} currentPlayerName={game.currentPlayerName} />
              <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-6 flex flex-col justify-center">
                <p className="text-slate-300 mb-3">
                  Players in room: <span className="font-bold text-white">{game.players.length}/4</span>
                </p>
                <p className="text-slate-400 mb-6">
                  Share this code so friends can join:
                  <br />
                  <span className="text-3xl font-mono font-extrabold text-emerald-400 tracking-[0.3em]">
                    {game.roomCode}
                  </span>
                </p>
                {isHost && game.players.length >= 2 && (
                  <button
                    onClick={game.startGame}
                    className="px-6 py-4 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/40"
                  >
                    🎮 Start Game
                  </button>
                )}
                {isHost && game.players.length < 2 && (
                  <p className="text-slate-400 text-sm">Need at least 2 players to start…</p>
                )}
                {!isHost && <p className="text-slate-400 text-sm">Waiting for host to start…</p>}
              </div>
            </div>
          </div>
        ) : (
          // Active Game
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CurrentCall
                currentCall={game.gameState?.currentCall || 2}
                stackSize={game.stackSize}
              />
              <StackDisplay
                stackSize={game.stackSize}
                recentCard={game.recentCard}
                claimActive={game.canClaim}
              />
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
    </div>
  );
}
