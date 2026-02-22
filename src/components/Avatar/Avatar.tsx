import { clsx } from 'clsx';
import type { AvatarProps, EyebrowStyle } from './types';
import { AVATAR_SIZES } from './types';

/**
 * Renders eyebrows based on style
 * Returns path data for left and right eyebrow
 */
function getEyebrowPaths(style: EyebrowStyle): { left: string; right: string } {
  // Eyebrow positions relative to 100x100 viewBox
  // Left eyebrow: around x=30, Right eyebrow: around x=70
  // Y position: around y=42

  switch (style) {
    case 'angry':
      // Angled down towards center (╭╮)
      return {
        left: 'M24,45 L36,40',
        right: 'M64,40 L76,45',
      };
    case 'happy':
      // Arched up (╰╯)
      return {
        left: 'M24,40 Q30,36 36,40',
        right: 'M64,40 Q70,36 76,40',
      };
    case 'worried':
      // Angled up towards center (／＼)
      return {
        left: 'M24,40 L36,45',
        right: 'M64,45 L76,40',
      };
    case 'neutral':
    default:
      // Straight lines
      return {
        left: 'M24,42 L36,42',
        right: 'M64,42 L76,42',
      };
  }
}

export function Avatar({ config, size = 'md', className, isDead = false }: AvatarProps) {
  const pixelSize = AVATAR_SIZES[size];
  const { color, eyebrows } = config;
  const eyebrowPaths = getEyebrowPaths(eyebrows);

  // Stroke width scales with size
  const strokeWidth = size === 'xs' || size === 'sm' ? 3 : 2;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      className={clsx('avatar', className)}
      aria-label="Player avatar"
    >
      {/* Body - Triangle */}
      <path
        d="M50,60 L25,95 L75,95 Z"
        fill={color}
        opacity={isDead ? 0.4 : 0.8}
      />

      {/* Head - Circle */}
      <circle
        cx="50"
        cy="38"
        r="28"
        fill={color}
        opacity={isDead ? 0.6 : 1}
      />

      {/* Eyes - Normal dots or X when dead */}
      {isDead ? (
        <>
          {/* Left eye X */}
          <path
            d="M34,48 L42,56 M42,48 L34,56"
            stroke="var(--color-bg)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Right eye X */}
          <path
            d="M58,48 L66,56 M66,48 L58,56"
            stroke="var(--color-bg)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="38" cy="52" r="3" fill="var(--color-bg)" />
          <circle cx="62" cy="52" r="3" fill="var(--color-bg)" />
        </>
      )}

      {/* Eyebrows - only show when alive */}
      {!isDead && (
        <>
          <path
            d={eyebrowPaths.left}
            stroke="var(--color-bg)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={eyebrowPaths.right}
            stroke="var(--color-bg)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}

export default Avatar;
