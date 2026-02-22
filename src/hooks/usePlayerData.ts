import { useState, useEffect, useCallback } from 'react';
import type { PlayerData, AvatarConfig } from '../components/Avatar';
import { DEFAULT_PLAYER_DATA } from '../components/Avatar';

const STORAGE_KEY = 'divine-wrath-player';

/**
 * Hook to manage player data (name + avatar) with localStorage persistence
 */
export function usePlayerData() {
  const [playerData, setPlayerData] = useState<PlayerData>(DEFAULT_PLAYER_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlayerData;
        setPlayerData(parsed);
      }
    } catch (e) {
      console.warn('Failed to load player data from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever data changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
      } catch (e) {
        console.warn('Failed to save player data to localStorage:', e);
      }
    }
  }, [playerData, isLoaded]);

  // Update player name
  const setName = useCallback((name: string) => {
    setPlayerData(prev => ({ ...prev, name }));
  }, []);

  // Update avatar config
  const setAvatar = useCallback((avatar: AvatarConfig) => {
    setPlayerData(prev => ({ ...prev, avatar }));
  }, []);

  // Update a single avatar property
  const updateAvatar = useCallback(<K extends keyof AvatarConfig>(
    key: K,
    value: AvatarConfig[K]
  ) => {
    setPlayerData(prev => ({
      ...prev,
      avatar: { ...prev.avatar, [key]: value },
    }));
  }, []);

  return {
    playerData,
    isLoaded,
    setName,
    setAvatar,
    updateAvatar,
  };
}
