'use client';

import { useState, useEffect, useCallback } from 'react';

export const AVATAR_EMOJIS = ['🎭', '🃏', '🕵️', '🦊', '🐻', '🦁', '🐯', '🦄', '🐧', '🦅', '🐲', '💎', '⚡', '🌙', '🔥', '👑', '🎮', '🎯', '🌊', '🎪'];

export interface GameStats {
  wins: number;
  losses: number;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  stats: {
    speedMatch: GameStats;
    bluff: GameStats;
    guessWho: GameStats;
  };
}

const STORAGE_KEY = 'card_games_profile';

function defaultStats(): PlayerProfile['stats'] {
  return {
    speedMatch: { wins: 0, losses: 0 },
    bluff: { wins: 0, losses: 0 },
    guessWho: { wins: 0, losses: 0 },
  };
}

function loadProfile(): PlayerProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PlayerProfile;
    if (!p.name || !p.avatar) return null;
    if (!p.stats) p.stats = defaultStats();
    return p;
  } catch {
    return null;
  }
}

function saveProfile(p: PlayerProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function usePlayerProfile() {
  const [profile, setProfileState] = useState<PlayerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfileState(loadProfile());
    setLoaded(true);
  }, []);

  const setProfile = useCallback((p: PlayerProfile) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  const createProfile = useCallback((name: string, avatar: string) => {
    const p: PlayerProfile = { name: name.trim(), avatar, stats: defaultStats() };
    setProfileState(p);
    saveProfile(p);
  }, []);

  const recordResult = useCallback((game: keyof PlayerProfile['stats'], won: boolean) => {
    setProfileState(prev => {
      if (!prev) return prev;
      const next: PlayerProfile = {
        ...prev,
        stats: {
          ...prev.stats,
          [game]: {
            wins: prev.stats[game].wins + (won ? 1 : 0),
            losses: prev.stats[game].losses + (won ? 0 : 1),
          },
        },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { profile, loaded, setProfile, createProfile, recordResult, clearProfile };
}
