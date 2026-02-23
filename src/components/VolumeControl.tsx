import { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
}

const HOVER_DELAY = 200; // ms before hiding

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
}: VolumeControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside (for mobile)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    setIsOpen(true);
  }, [clearHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    clearHideTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, HOVER_DELAY);
  }, [clearHideTimeout]);

  // For mobile: tap opens, tap outside closes
  const handleClick = useCallback(() => {
    // Only toggle if not already being managed by hover
    setIsOpen(true);
  }, []);

  const VolumeIcon = isMuted || volume === 0
    ? VolumeX
    : volume < 0.5
      ? Volume1
      : Volume2;

  return (
    <div className="relative z-50 flex items-center" ref={containerRef}>
      {/* Speaker button */}
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="p-1 bg-transparent border-none outline-none text-(--color-gold) hover:text-(--color-gold-bright) transition-colors cursor-pointer"
        aria-label="Volume control"
      >
        <VolumeIcon size={20} />
      </button>

      {/* Slider popup - vertical, below the button */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={clsx(
          'absolute top-full right-0 pt-2 z-50',
          'transition-all duration-200 origin-top',
          isOpen
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Inner container with actual styling */}
        <div className="flex flex-col items-center gap-2 px-3 py-3 bg-(--color-surface) border border-(--color-border) rounded-lg shadow-lg">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="volume-slider h-20 cursor-pointer"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            aria-label="Volume"
          />
          <style>{`
            .volume-slider {
              -webkit-appearance: none;
              appearance: none;
              background: transparent;
              width: 8px;
              touch-action: none;
            }
            .volume-slider:focus {
              outline: none;
            }
            /* Track */
            .volume-slider::-webkit-slider-runnable-track {
              background: var(--color-border);
              border-radius: 4px;
              height: 100%;
              width: 4px;
            }
            .volume-slider::-moz-range-track {
              background: var(--color-border);
              border-radius: 4px;
              height: 100%;
              width: 4px;
            }
            /* Thumb */
            .volume-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              background: var(--color-gold);
              border-radius: 50%;
              width: 14px;
              height: 14px;
              margin-left: -5px;
            }
            .volume-slider::-moz-range-thumb {
              background: var(--color-gold);
              border-radius: 50%;
              border: none;
              width: 14px;
              height: 14px;
            }
          `}</style>
          <span className="text-xs text-(--color-ink-muted) font-mono">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
