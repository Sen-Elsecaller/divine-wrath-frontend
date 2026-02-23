import { useEffect, useRef, useState, useCallback } from 'react';

type TrackName = 'main-menu' | 'earlygame' | 'endgame';

const TRACKS: Record<TrackName, string> = {
  'main-menu': '/audio/main-menu.mp3',
  'earlygame': '/audio/earlygame.mp3',
  'endgame': '/audio/endgame1.mp3', // Could randomize between endgame1 and endgame2
};

const STORAGE_KEY = 'divine-wrath-volume';
const DEFAULT_VOLUME = 0.3;
const FADE_DURATION = 1000;
const FADE_STEPS = 20;

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackName | null>(null);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_VOLUME;
  });
  const [isMuted, setIsMuted] = useState(false);
  const targetVolumeRef = useRef(volume);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current && !fadeIntervalRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    targetVolumeRef.current = volume;
    localStorage.setItem(STORAGE_KEY, volume.toString());
  }, [volume, isMuted]);

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeOut = useCallback((audio: HTMLAudioElement): Promise<void> => {
    return new Promise((resolve) => {
      clearFadeInterval();

      if (audio.volume === 0 || audio.paused) {
        resolve();
        return;
      }

      const stepTime = FADE_DURATION / FADE_STEPS;
      const volumeStep = audio.volume / FADE_STEPS;

      fadeIntervalRef.current = window.setInterval(() => {
        if (audio.volume > volumeStep) {
          audio.volume = Math.max(0, audio.volume - volumeStep);
        } else {
          audio.volume = 0;
          audio.pause();
          clearFadeInterval();
          resolve();
        }
      }, stepTime);
    });
  }, [clearFadeInterval]);

  const fadeIn = useCallback((audio: HTMLAudioElement, targetVolume: number): Promise<void> => {
    return new Promise((resolve) => {
      clearFadeInterval();

      audio.volume = 0;
      audio.play().catch(() => {
        // Autoplay blocked - user needs to interact first
        resolve();
        return;
      });

      const stepTime = FADE_DURATION / FADE_STEPS;
      const volumeStep = targetVolume / FADE_STEPS;

      fadeIntervalRef.current = window.setInterval(() => {
        if (audio.volume < targetVolume - volumeStep) {
          audio.volume = Math.min(targetVolume, audio.volume + volumeStep);
        } else {
          audio.volume = targetVolume;
          clearFadeInterval();
          resolve();
        }
      }, stepTime);
    });
  }, [clearFadeInterval]);

  const playTrack = useCallback(async (track: TrackName) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Same track, already playing
    if (currentTrack === track && !audio.paused) return;

    // Fade out current track if playing
    if (!audio.paused) {
      await fadeOut(audio);
    }

    // Switch to new track
    audio.src = TRACKS[track];
    audio.load();
    setCurrentTrack(track);

    // Fade in new track
    const targetVolume = isMuted ? 0 : targetVolumeRef.current;
    if (!isMuted) {
      await fadeIn(audio, targetVolume);
    }
  }, [currentTrack, isMuted, fadeOut, fadeIn]);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : targetVolumeRef.current;
      }
      return newMuted;
    });
  }, []);

  // Try to resume audio on user interaction (for autoplay policy)
  const tryResume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.paused && currentTrack) {
      audio.play().catch(() => {});
    }
  }, [currentTrack]);

  return {
    playTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    tryResume,
    currentTrack,
  };
}
