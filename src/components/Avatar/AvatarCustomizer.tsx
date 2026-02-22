import { clsx } from 'clsx';
import { Avatar } from './Avatar';
import type { AvatarConfig, EyebrowStyle } from './types';
import { AVATAR_COLORS, EYEBROW_STYLES } from './types';

interface AvatarCustomizerProps {
  name: string;
  avatar: AvatarConfig;
  onNameChange: (name: string) => void;
  onAvatarChange: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void;
}

// Mini avatar previews for eyebrow selection
function EyebrowPreview({ style, color }: { style: EyebrowStyle; color: string }) {
  return (
    <Avatar
      config={{ color, eyebrows: style }}
      size="sm"
    />
  );
}

export function AvatarCustomizer({
  name,
  avatar,
  onNameChange,
  onAvatarChange,
}: AvatarCustomizerProps) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface)/50 p-5 flex flex-col gap-5">
      {/* Name input */}
      <div className="flex flex-col gap-2">
        <label className="text-(--color-ink-muted) text-xs uppercase tracking-widest">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter name"
          maxLength={20}
          className="w-full px-4 py-3 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-ink) placeholder:text-(--color-ink-muted) focus:border-(--color-gold) focus:outline-none transition-colors text-center"
        />
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center py-2">
        <Avatar config={avatar} size="lg" />
      </div>

      {/* Color selection */}
      <div className="flex flex-col gap-2">
        <label className="text-(--color-ink-muted) text-xs uppercase tracking-widest text-center">
          Color
        </label>
        <div className="flex gap-3 justify-center">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onAvatarChange('color', color)}
              className={clsx(
                'w-10 h-10 rounded-full transition-all border-2',
                avatar.color === color
                  ? 'border-white scale-110'
                  : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Eyebrow selection */}
      <div className="flex flex-col gap-2">
        <label className="text-(--color-ink-muted) text-xs uppercase tracking-widest text-center">
          Expression
        </label>
        <div className="flex gap-2 justify-center">
          {EYEBROW_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => onAvatarChange('eyebrows', style)}
              className={clsx(
                'p-1 rounded-lg transition-all border',
                avatar.eyebrows === style
                  ? 'border-(--color-gold) bg-(--color-gold)/20'
                  : 'border-(--color-border) hover:border-(--color-gold)/50'
              )}
              aria-label={`Select ${style} expression`}
            >
              <EyebrowPreview style={style} color={avatar.color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AvatarCustomizer;
