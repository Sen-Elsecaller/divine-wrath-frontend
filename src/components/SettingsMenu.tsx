import { X, Github, Heart, Music, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';

// Volume levels: low, medium, high
const VOLUME_LEVELS = [0.2, 0.5, 0.85] as const;

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  musicVolume: number;
  musicMuted: boolean;
  onMusicVolumeChange: (volume: number) => void;
  onMusicMuteToggle: () => void;
  // Effects (placeholder for future)
  effectsVolume: number;
  effectsMuted: boolean;
  onEffectsVolumeChange: (volume: number) => void;
  onEffectsMuteToggle: () => void;
}

function getVolumeLevel(volume: number): number {
  // Find closest level (0, 1, or 2)
  let closest = 0;
  let minDiff = Math.abs(volume - VOLUME_LEVELS[0]);

  for (let i = 1; i < VOLUME_LEVELS.length; i++) {
    const diff = Math.abs(volume - VOLUME_LEVELS[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

interface VolumeSelectorProps {
  icon: 'music' | 'effects';
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

function VolumeSelector({ icon, volume, isMuted, onVolumeChange, onMuteToggle }: VolumeSelectorProps) {
  const currentLevel = getVolumeLevel(volume);
  const Icon = icon === 'music' ? Music : Volume2;
  const MutedIcon = VolumeX;

  return (
    <div className="flex items-center gap-2">
      {/* Mute toggle icon */}
      <button
        onClick={onMuteToggle}
        className={clsx(
          'p-1 bg-transparent border-none cursor-pointer transition-colors',
          isMuted
            ? 'text-(--color-ink-muted) hover:text-(--color-ink)'
            : 'text-(--color-gold) hover:text-(--color-gold-bright)'
        )}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MutedIcon size={16} /> : <Icon size={16} />}
      </button>

      {/* Level buttons */}
      <div className="flex items-center gap-1">
        {VOLUME_LEVELS.map((level, index) => (
          <button
            key={index}
            onClick={() => onVolumeChange(level)}
            className={clsx(
              'w-3 h-3 rounded-full border transition-all bg-transparent cursor-pointer',
              'flex items-center justify-center',
              isMuted
                ? 'border-(--color-border) opacity-40'
                : currentLevel === index
                  ? 'border-(--color-gold) bg-(--color-gold)'
                  : 'border-(--color-border) hover:border-(--color-gold)/50'
            )}
            aria-label={`Volume ${index === 0 ? 'low' : index === 1 ? 'medium' : 'high'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SettingsMenu({
  isOpen,
  onClose,
  musicVolume,
  musicMuted,
  onMusicVolumeChange,
  onMusicMuteToggle,
  effectsVolume,
  effectsMuted,
  onEffectsVolumeChange,
  onEffectsMuteToggle,
}: SettingsMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close menu on click outside */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Menu content */}
      <div className="fixed inset-x-0 top-0 z-50 animate-fade-in">
        <div className="bg-(--color-bg) border-b border-(--color-border)">
          {/* Row 1: Close + Links */}
          <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between border-b border-(--color-border)/50">
            <button
              onClick={onClose}
              className="p-1 bg-transparent border-none cursor-pointer text-(--color-ink-muted) hover:text-(--color-ink) transition-colors"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Sen-Elsecaller/divine-wrath-frontend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-ink-secondary) hover:border-(--color-gold)/50 hover:text-(--color-gold) transition-colors"
              >
                <Github size={14} />
              </a>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-ink-secondary) hover:border-(--color-danger)/50 hover:text-(--color-danger) transition-colors cursor-pointer"
                onClick={() => {/* TODO: donation link */}}
              >
                <Heart size={14} />
              </button>
            </div>
          </div>

          {/* Row 2: Volume controls */}
          <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-center gap-6">
            <VolumeSelector
              icon="music"
              volume={musicVolume}
              isMuted={musicMuted}
              onVolumeChange={onMusicVolumeChange}
              onMuteToggle={onMusicMuteToggle}
            />
            <VolumeSelector
              icon="effects"
              volume={effectsVolume}
              isMuted={effectsMuted}
              onVolumeChange={onEffectsVolumeChange}
              onMuteToggle={onEffectsMuteToggle}
            />
          </div>
        </div>
      </div>
    </>
  );
}
