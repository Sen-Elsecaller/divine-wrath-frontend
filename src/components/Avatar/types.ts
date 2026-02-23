export type EyebrowStyle = 'neutral' | 'angry' | 'happy' | 'worried';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarConfig {
  color: string;
  eyebrows: EyebrowStyle;
}

export interface AvatarProps {
  config: AvatarConfig;
  size?: AvatarSize;
  className?: string;
  isDead?: boolean;
}

// Player data stored in localStorage
export interface PlayerData {
  name: string;
  avatar: AvatarConfig;
}

// Size mappings in pixels
export const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 64,
  sm: 64,
  md: 96,
  lg: 160,
};

// Available colors for customization
export const AVATAR_COLORS = [
  '#c9a227', // Gold (primary)
  '#00d4ff', // Cyan
  '#e879a5', // Rosa dusty
  '#4ade80', // Verde esmeralda
  '#f0ead6', // Marfil cálido
] as const;

// Eyebrow styles available
export const EYEBROW_STYLES: EyebrowStyle[] = ['neutral', 'angry', 'happy', 'worried'];

// Default avatar config
export const DEFAULT_AVATAR: AvatarConfig = {
  color: AVATAR_COLORS[0],
  eyebrows: 'neutral',
};

// Default player data
export const DEFAULT_PLAYER_DATA: PlayerData = {
  name: '',
  avatar: DEFAULT_AVATAR,
};
