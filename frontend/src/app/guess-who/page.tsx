'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGuessWhoSocket } from '@/hooks/useGuessWhoSocket';
import CharacterCard from '@/components/guess-who/CharacterCard';
import { GW_CHARACTERS as CHARS, GW_QUESTIONS, GW_QUESTION_CATEGORIES } from '@/data/guessWhoData';
import WakeUpLoader from '@/components/WakeUpLoader';

// ── Turn timer ─────────────────────────────────────────────────────────────────

function TurnTimer({ endsAt, totalMs = 30_000 }: { endsAt: number; totalMs?: number }) {
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0, Math.min(100, (secs / (totalMs / 1000)) * 100));
  const urgent = secs <= 8;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-rose-400' : 'bg-violet-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-black tabular-nums min-w-[2ch] ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>{secs}s</span>
    </div>
  );
}

// ── Attribute badge ────────────────────────────────────────────────────────────

function AttrBadge({ label, value }: { label: string; value: string | boolean }) {
  if (value === false) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700/60 text-slate-300 border border-slate-600/30">
      {value === true ? label : `${label}: ${value}`}
    </span>
  );
}

const inputClass =
  'w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition font-semibold';

// ── Main page ──────────────────────────────────────────────────────────────────

export default function GuessWhoPage() {
  const router = useRouter();
  const gw = useGuessWhoSocket();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [guessMode, setGuessMode] = useState(false);
  const [pendingGuessId, setPendingGuessId] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [activeCategory, setActiveCategory] = useState(GW_QUESTION_CATEGORIES[0]);

  useEffect(() => {
    if (gw.connected) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2500);
    return () => clearTimeout(t);
  }, [gw.connected]);

  const handleCopyCode = useCallback(() => {
    if (!gw.roomCode) return;
    navigator.clipboard.writeText(gw.roomCode).then(() => {
      setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [gw.roomCode]);

  const handleShareLink = useCallback(() => {
    if (!gw.roomCode) return;
    const url = `${window.location.origin}/guess-who?code=${gw.roomCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my Guess Who game!', text: `Room code: ${gw.roomCode}`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  }, [gw.roomCode]);

  // Auto-fill code from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) { setJoinCode(code); setShowJoinInput(true); }
  }, []);

  const isMyTurn = !!gw.myId && gw.myId === gw.currentTurnPlayerId;

  const handleCardClick = (charId: number) => {
    if (guessMode) {
      setPendingGuessId(charId === pendingGuessId ? null : charId);
      return;
    }
    if (gw.phase === 'SELECTING' && !gw.mySecretCharacterId) {
      gw.selectCharacter(charId);
      return;
    }
    if (gw.phase === 'PLAYING') {
      gw.toggleEliminated(charId);
    }
  };

  const handleConfirmGuess = () => {
    if (pendingGuessId == null) return;
    gw.guessCharacter(pendingGuessId);
    setGuessMode(false);
    setPendingGuessId(null);
  };

  const mySecretChar = CHARS.find(c => c.id === gw.mySecretCharacterId);

  // ── LOBBY ──────────────────────────────────────────────────────────────────

  if (gw.phase === 'LOBBY') {
    if (!gw.roomCode) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>
          {showWakeUp && <WakeUpLoader />}
          <div className="w-full max-w-md">
            <button onClick={() => router.push('/')}
              className="mb-4 text-slate-400 hover:text-violet-400 text-sm font-bold flex items-center gap-1 transition-colors">
              ← Back to games
            </button>
            <div className="rounded-3xl border border-violet-900/40 shadow-2xl p-8"
              style={{ background: 'rgba(13,10,36,0.95)' }}>
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🕵️</div>
                <h1 className="text-3xl font-black text-white">Guess Who?</h1>
                <p className="text-violet-400/70 mt-1 font-semibold">Multiplayer deduction game</p>
              </div>

              {!gw.connected && (
                <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/40 rounded-2xl text-amber-400 text-sm text-center font-semibold">
                  Connecting to server…
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Your Name</label>
                  <input type="text" value={playerName}
                    onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name"
                    className={inputClass}
                    onKeyDown={e => { if (e.key === 'Enter' && !showJoinInput) gw.createRoom(playerName); }} />
                </div>

                {!showJoinInput && (
                  <>
                    <button onClick={() => gw.createRoom(playerName)}
                      disabled={!gw.connected || !playerName.trim()}
                      className={`w-full py-3.5 rounded-2xl font-black text-lg transition-all ${
                        gw.connected && playerName.trim()
                          ? 'bg-violet-600 hover:bg-violet-500 text-white active:scale-95 shadow-lg shadow-violet-900/40'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}>
                      ➕ Create Room
                    </button>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 text-slate-500 font-semibold" style={{ background: 'rgba(13,10,36,0.95)' }}>or</span>
                      </div>
                    </div>
                    <button onClick={() => setShowJoinInput(true)}
                      className="w-full py-3.5 rounded-2xl font-black text-white border-2 border-violet-700/50 hover:border-violet-400 hover:bg-violet-900/20 transition-all">
                      Join Existing Room
                    </button>
                  </>
                )}

                {showJoinInput && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Room Code</label>
                      <input type="text" value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE" maxLength={6}
                        className={`${inputClass} tracking-[0.4em] text-center text-xl`}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && joinCode.trim()) gw.joinRoom(playerName, joinCode); }} />
                    </div>
                    <button onClick={() => gw.joinRoom(playerName, joinCode)}
                      disabled={!gw.connected || !playerName.trim() || !joinCode.trim()}
                      className={`w-full py-3.5 rounded-2xl font-black text-lg transition-all ${
                        gw.connected && playerName.trim() && joinCode.trim()
                          ? 'bg-violet-600 hover:bg-violet-500 text-white active:scale-95 shadow-lg shadow-violet-900/40'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}>
                      ✓ Join Room
                    </button>
                    <button onClick={() => setShowJoinInput(false)}
                      className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm font-semibold">
                      ← Back to Create Room
                    </button>
                  </>
                )}
              </div>

              {gw.message && (
                <div className="mt-5 p-3 bg-rose-900/20 border border-rose-700/30 rounded-2xl text-rose-300 text-sm text-center font-semibold">
                  {gw.message}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Waiting lobby
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>
        <div className="w-full max-w-md rounded-3xl border border-violet-900/40 shadow-2xl p-8 text-center"
          style={{ background: 'rgba(13,10,36,0.95)' }}>
          <div className="text-5xl mb-3">🕵️</div>
          <h2 className="text-2xl font-black text-white mb-1">Waiting for opponent…</h2>
          <p className="text-slate-400 font-semibold text-sm mb-6">Share your room code to get started</p>

          <div className="bg-slate-800/60 rounded-2xl p-5 mb-6">
            <p className="text-slate-400 text-sm font-bold mb-2">Room Code</p>
            <p className="text-4xl font-mono font-black text-violet-300 tracking-[0.4em]">{gw.roomCode}</p>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={handleCopyCode}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95">
              {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
            </button>
            <button onClick={handleShareLink}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-violet-700/60 hover:bg-violet-600/70 text-white transition-all active:scale-95 border border-violet-600/40">
              🔗 Share Link
            </button>
          </div>

          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
            <span className="text-slate-400 text-sm font-semibold">Waiting for second player…</span>
          </div>

          <button onClick={gw.leaveRoom}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm font-semibold">
            ← Leave Room
          </button>
        </div>
      </div>
    );
  }

  // ── SELECTING ──────────────────────────────────────────────────────────────

  if (gw.phase === 'SELECTING') {
    return (
      <div className="min-h-screen p-4 pb-8" style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-black text-white">🕵️ Guess Who?</h1>
            {!gw.mySecretCharacterId ? (
              <p className="text-violet-400 font-semibold mt-1">Tap a character to secretly select them</p>
            ) : (
              <p className="text-emerald-400 font-semibold mt-1">
                You chose <span className="text-white font-black">{mySecretChar?.name}</span>
                {gw.opponentHasSelected ? ' — both players ready!' : ' — waiting for opponent…'}
              </p>
            )}
          </div>

          {gw.message && (
            <div className="mb-4 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-200 text-sm text-center font-semibold">
              {gw.message}
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {CHARS.map(char => (
              <CharacterCard
                key={char.id}
                character={char}
                state={gw.mySecretCharacterId === char.id ? 'secret' : 'active'}
                onClick={!gw.mySecretCharacterId ? () => handleCardClick(char.id) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────

  if (gw.phase === 'PLAYING') {
    const askedQIds = new Set(gw.questionLog.map(e => e.questionId).filter(Boolean));
    const categoryQuestions = GW_QUESTIONS.filter(q => q.category === activeCategory);

    return (
      <div className="min-h-screen pb-8" style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>

        {/* Confirm guess modal */}
        {pendingGuessId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs rounded-3xl p-6 text-center border border-violet-700/40 shadow-2xl animate-fade-in-up"
              style={{ background: '#0d0a24' }}>
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-white font-black text-lg mb-1">Your guess:</p>
              <p className="text-violet-300 font-black text-2xl mb-2">
                {CHARS.find(c => c.id === pendingGuessId)?.name}
              </p>
              <p className="text-slate-500 text-xs font-semibold mb-5">Wrong guess = instant loss!</p>
              <div className="flex gap-3">
                <button onClick={() => { setPendingGuessId(null); setGuessMode(false); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all">
                  Cancel
                </button>
                <button onClick={handleConfirmGuess}
                  className="flex-1 py-3 rounded-2xl font-black text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all">
                  Confirm!
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-3 pt-3 space-y-2">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white">🕵️ Guess Who?</h1>
              <p className="text-slate-500 text-xs font-semibold">Room {gw.roomCode}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLog(!showLog)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/40">
                📋 {gw.questionLog.length}
              </button>
              <button onClick={gw.leaveRoom}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-700/60 hover:bg-rose-600/70 text-white transition-all">
                Leave
              </button>
            </div>
          </div>

          {/* My character + Turn status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-2.5 border border-emerald-700/30 bg-emerald-900/10 flex items-center gap-2 min-w-0">
              {mySecretChar && <CharacterCard character={mySecretChar} state="secret" size="sm" />}
              <div className="min-w-0">
                <p className="text-emerald-400 text-[10px] font-bold">Your secret</p>
                <p className="text-white font-black text-sm truncate">{mySecretChar?.name}</p>
                <p className="text-slate-500 text-[10px]">{mySecretChar?.gender} · {mySecretChar?.hairColor}</p>
              </div>
            </div>
            <div className={`rounded-2xl p-2.5 border flex flex-col justify-center ${
              isMyTurn ? 'border-violet-500/50 bg-violet-900/20' : 'border-slate-700/30 bg-slate-800/30'
            }`}>
              <p className={`text-xs font-black ${isMyTurn ? 'text-violet-300' : 'text-slate-400'}`}>
                {isMyTurn ? '⚡ Your turn — ask or guess!' : `⏳ ${gw.currentTurnPlayerName}'s turn`}
              </p>
              {gw.turnEndsAt && <TurnTimer endsAt={gw.turnEndsAt} />}
            </div>
          </div>

          {/* Last answer banner — shown to BOTH players */}
          {gw.lastQuestionResult && (
            <div className={`rounded-2xl border flex items-center gap-3 px-4 py-3 ${
              gw.lastQuestionResult.answer
                ? 'border-emerald-600/50 bg-emerald-900/20'
                : 'border-rose-600/50 bg-rose-900/20'
            }`}>
              <span className="text-3xl flex-shrink-0">
                {gw.lastQuestionResult.answer ? '✅' : '❌'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                  {gw.lastQuestionResult.askerName} asked
                </p>
                <p className="text-white font-semibold text-sm leading-snug truncate">
                  {gw.lastQuestionResult.questionText}
                </p>
                <p className={`text-sm font-black ${gw.lastQuestionResult.answer ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {gw.lastQuestionResult.answer ? 'YES' : 'NO'}
                  <span className="text-slate-500 font-normal text-xs ml-2">
                    — tap the board to eliminate characters
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Question log (collapsible) */}
          {showLog && gw.questionLog.length > 0 && (
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 overflow-hidden">
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/60">
                {gw.questionLog.map((entry, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2">
                    <span className={`text-xs font-black flex-shrink-0 ${entry.answer ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {entry.answer ? '✅' : '❌'}
                    </span>
                    <span className="text-slate-400 text-xs flex-1 leading-tight">{entry.questionText}</span>
                    <span className="text-slate-600 text-[10px] flex-shrink-0">{entry.askerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Character board — ALWAYS tappable (both players can eliminate anytime) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-slate-500 text-[11px] font-bold">
                {guessMode ? '🎯 Tap a character to select your guess' : 'Tap any card to eliminate ✕ — tap again to restore'}
              </p>
              <span className="text-slate-500 text-[11px]">
                {CHARS.length - gw.eliminatedIds.size}/{CHARS.length}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {CHARS.map(char => {
                const isElim = gw.eliminatedIds.has(char.id);
                const isPending = pendingGuessId === char.id;
                let state: 'active' | 'eliminated' | 'selected' | 'secret' | 'guess-target' = 'active';
                if (isElim && !guessMode) state = 'eliminated';
                else if (char.id === gw.mySecretCharacterId) state = 'secret';
                else if (guessMode && isPending) state = 'guess-target';
                return (
                  <CharacterCard key={char.id} character={char} state={state} size="sm"
                    onClick={() => handleCardClick(char.id)} />
                );
              })}
            </div>
          </div>

          {/* Guess mode controls */}
          {guessMode && (
            <div className="flex gap-2">
              <button onClick={() => { setGuessMode(false); setPendingGuessId(null); }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-slate-300 bg-slate-700/80 hover:bg-slate-600 border border-slate-600/40 active:scale-95 transition-all">
                ← Cancel
              </button>
              {pendingGuessId ? (
                <button onClick={handleConfirmGuess}
                  className="flex-1 py-3.5 rounded-2xl font-black text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-900/40">
                  🎯 Guess {CHARS.find(c => c.id === pendingGuessId)?.name}!
                </button>
              ) : (
                <div className="flex-1 py-3.5 rounded-2xl text-center text-slate-500 text-sm font-semibold bg-slate-800/40 border border-slate-700/30">
                  Tap a character above
                </div>
              )}
            </div>
          )}

          {/* INLINE QUESTION PANEL — your turn, not in guess mode */}
          {isMyTurn && !guessMode && (
            <div className="rounded-2xl border border-violet-800/40 overflow-hidden"
              style={{ background: 'rgba(18,10,36,0.97)' }}>

              {/* Category tabs — scrollable */}
              <div className="flex overflow-x-auto scrollbar-none gap-1.5 px-3 pt-3 pb-2">
                {GW_QUESTION_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      activeCategory === cat
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Questions for selected category */}
              <div className="px-3 space-y-1.5 pb-2">
                {categoryQuestions.map(q => {
                  const asked = askedQIds.has(q.id);
                  const logEntry = gw.questionLog.find(e => e.questionId === q.id);
                  return (
                    <button key={q.id}
                      onClick={() => !asked && gw.askQuestion(q.id)}
                      disabled={asked}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center gap-3 ${
                        asked
                          ? 'bg-slate-800/20 text-slate-600 cursor-default'
                          : 'bg-slate-800/60 text-slate-200 hover:bg-violet-800/40 hover:text-white border border-transparent hover:border-violet-600/30 active:scale-[0.98]'
                      }`}>
                      <span className={`text-base flex-shrink-0 w-5 text-center ${asked ? 'text-slate-600' : 'text-violet-400'}`}>
                        {asked ? (logEntry?.answer ? '✅' : '❌') : '?'}
                      </span>
                      <span className="flex-1">{q.text}</span>
                      {asked && logEntry && (
                        <span className={`text-xs font-black flex-shrink-0 ${logEntry.answer ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {logEntry.answer ? 'YES' : 'NO'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Guess button at the bottom of question panel */}
              <div className="px-3 pb-3">
                <button onClick={() => setGuessMode(true)}
                  className="w-full py-3 rounded-2xl font-black text-white text-sm bg-slate-700/50 hover:bg-violet-900/50 border border-violet-700/30 hover:border-violet-500/50 active:scale-95 transition-all">
                  🎯 I know who it is — Make a Guess
                </button>
              </div>
            </div>
          )}

          {/* Waiting panel — opponent's turn */}
          {!isMyTurn && !guessMode && (
            <div className="rounded-2xl p-4 bg-slate-800/30 border border-slate-700/20 text-center">
              <p className="text-slate-300 text-sm font-semibold">
                <span className="text-white font-black">{gw.currentTurnPlayerName}</span> is choosing a question…
              </p>
              <p className="text-violet-400/60 text-xs mt-1 font-semibold">
                Tap characters above to eliminate them while you wait
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────────────────

  if (gw.phase === 'FINISHED') {
    if (gw.opponentLeft) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>
          <div className="w-full max-w-sm rounded-3xl p-8 text-center border border-slate-700/40 shadow-2xl"
            style={{ background: 'rgba(13,10,36,0.97)' }}>
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-black text-white mb-2">Opponent Left</h2>
            <p className="text-slate-400 font-semibold text-sm mb-6">The other player disconnected.</p>
            <button onClick={gw.resetForRematch}
              className="w-full py-3.5 rounded-2xl font-black text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all">
              Play Again
            </button>
          </div>
        </div>
      );
    }

    if (gw.gameResult) {
      const { won, opponentCharacterId } = gw.gameResult;
      const opponentChar = CHARS.find(c => c.id === opponentCharacterId);
      return (
        <div className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'linear-gradient(135deg, #0d0a24 0%, #0a1a2e 100%)' }}>
          <div className="w-full max-w-sm rounded-3xl p-8 text-center border shadow-2xl animate-fade-in-up"
            style={{
              background: won ? 'linear-gradient(145deg, #0d0a24, #1a1040)' : 'linear-gradient(145deg, #0d0a24, #240a0a)',
              borderColor: won ? 'rgba(139,92,246,0.5)' : 'rgba(220,38,38,0.4)',
            }}>
            <div className="text-7xl mb-3">{won ? '🏆' : '💀'}</div>
            <h2 className={`text-4xl font-black mb-1 ${won ? 'text-violet-300' : 'text-rose-400'}`}>
              {won ? 'You Win!' : 'You Lose!'}
            </h2>
            <p className="text-slate-400 font-semibold text-sm mb-5">
              {won ? 'Correct guess!' : 'Wrong guess or opponent got it first.'}
            </p>

            {opponentChar && (
              <div className="bg-slate-800/40 rounded-2xl p-4 mb-6 border border-slate-700/30">
                <p className="text-slate-400 text-xs font-bold mb-3">Opponent&apos;s character was:</p>
                <CharacterCard character={opponentChar} state="active" />
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  <AttrBadge label={opponentChar.gender} value={true} />
                  <AttrBadge label={opponentChar.hairColor} value={true} />
                  {opponentChar.glasses && <AttrBadge label="Glasses" value={true} />}
                  {opponentChar.hat && <AttrBadge label="Hat" value={true} />}
                  {opponentChar.beard && <AttrBadge label="Beard" value={true} />}
                  {opponentChar.bald && <AttrBadge label="Bald" value={true} />}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={gw.resetForRematch}
                className={`w-full py-3.5 rounded-2xl font-black text-white active:scale-95 transition-all shadow-lg ${
                  won ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40' : 'bg-slate-700 hover:bg-slate-600'
                }`}>
                🔁 Play Again
              </button>
              <button onClick={() => router.push('/')}
                className="w-full py-2.5 text-slate-400 hover:text-white font-semibold text-sm">
                ← Back to Games
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return null;
}
