import { clsx } from 'clsx';
import type { ClaimTypeId } from '../hooks/useSocket';

interface Player {
  id: string;
  name: string;
  position: number | null;
}

interface ClaimPanelProps {
  selectedClaimType: ClaimTypeId | null;
  selectedClaimValue: number | null;
  selectedTargetId: string | null;
  players: Player[];
  currentPlayerId: string;
  onSelectClaimType: (type: ClaimTypeId) => void;
  onSelectValue: (value: number) => void;
  onSelectTarget: (playerId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isClaimTaken: boolean;
}

// Icons for claim types
const ClaimTypeIcon = ({ type, selected }: { type: ClaimTypeId; selected: boolean }) => {
  const color = selected ? 'var(--color-gold)' : 'var(--color-ink-muted)';

  switch (type) {
    case 'row':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="8" x2="20" y2="8" opacity="0.3" />
          <line x1="4" y1="16" x2="20" y2="16" opacity="0.3" />
        </svg>
      );
    case 'column':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="8" y1="4" x2="8" y2="20" opacity="0.3" />
          <line x1="16" y1="4" x2="16" y2="20" opacity="0.3" />
        </svg>
      );
    case 'adjacent':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect x="8" y="8" width="8" height="8" />
          <rect x="4" y="4" width="4" height="4" opacity="0.3" />
          <rect x="16" y="4" width="4" height="4" opacity="0.3" />
          <rect x="4" y="16" width="4" height="4" opacity="0.3" />
          <rect x="16" y="16" width="4" height="4" opacity="0.3" />
        </svg>
      );
  }
};

export function ClaimPanel({
  selectedClaimType,
  selectedClaimValue,
  selectedTargetId,
  players,
  currentPlayerId,
  onSelectClaimType,
  onSelectValue,
  onSelectTarget,
  onSubmit,
  isSubmitting,
  isClaimTaken,
}: ClaimPanelProps) {
  // Get alive mortals
  const aliveMortals = players.filter(p => p.position !== null);

  // Determine which values to show based on claim type
  const getValuesForType = (type: ClaimTypeId | null): number[] => {
    if (!type) return [];
    if (type === 'row' || type === 'column') return [1, 2, 3];
    // Adjacent doesn't need manual value selection - uses claimer's position
    return [];
  };

  const values = getValuesForType(selectedClaimType);
  const needsValue = selectedClaimType === 'row' || selectedClaimType === 'column';

  const canSubmit = selectedClaimType && (!needsValue || selectedClaimValue) && selectedTargetId && !isClaimTaken && !isSubmitting;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Main panel container */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface)/50 p-5 flex flex-col gap-5">
        {/* Player selection - at top */}
        <div className="flex gap-2 justify-center flex-wrap">
          {aliveMortals.map((player) => {
            const isSelected = selectedTargetId === player.id;
            const isSelf = player.id === currentPlayerId;
            // Cannot claim adjacent to yourself
            const isDisabled = isSelf && selectedClaimType === 'adjacent';
            return (
              <button
                key={player.id}
                onClick={() => !isDisabled && onSelectTarget(player.id)}
                disabled={isDisabled}
                className={clsx(
                  'px-4 py-2 rounded-full transition-all text-sm font-medium',
                  'border',
                  isDisabled
                    ? 'bg-(--color-surface)/50 border-(--color-border)/50 text-(--color-ink-muted) cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold)'
                      : 'bg-(--color-surface) border-(--color-border) text-(--color-ink-secondary) hover:border-(--color-gold)/50'
                )}
              >
                {player.name.toUpperCase()}
                {isSelf && <span className="ml-1 opacity-60">(YOU)</span>}
              </button>
            );
          })}
        </div>

        {/* Claim type buttons */}
        <div className="flex gap-3 justify-center">
          {(['row', 'column', 'adjacent'] as ClaimTypeId[]).map((type) => {
            const isSelected = selectedClaimType === type;
            return (
              <button
                key={type}
                onClick={() => onSelectClaimType(type)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1',
                  'w-20 h-16 rounded-xl transition-all',
                  'border',
                  isSelected
                    ? 'bg-(--color-gold)/20 border-(--color-gold)'
                    : 'bg-(--color-bg) border-(--color-border) hover:border-(--color-gold)/50'
                )}
              >
                <ClaimTypeIcon type={type} selected={isSelected} />
                <span className={clsx(
                  'text-[10px] font-medium uppercase tracking-wide',
                  isSelected ? 'text-(--color-gold)' : 'text-(--color-ink-muted)'
                )}>
                  {type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Value selection (if needed) */}
        {selectedClaimType && needsValue && (
          <div className="flex gap-2 justify-center">
            {values.map((value) => {
              const isSelected = selectedClaimValue === value;
              return (
                <button
                  key={value}
                  onClick={() => onSelectValue(value)}
                  className={clsx(
                    'w-10 h-10 rounded-lg transition-all text-sm font-mono font-medium',
                    'border',
                    isSelected
                      ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold)'
                      : 'bg-(--color-bg) border-(--color-border) text-(--color-ink-muted) hover:border-(--color-gold)/50'
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}

        {/* Error message */}
        {isClaimTaken && (
          <div className="text-center">
            <span className="text-(--color-danger) text-xs">
              This claim was already made
            </span>
          </div>
        )}
      </div>

      {/* Submit button - outside the panel */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={clsx(
          'w-full py-3 rounded-lg font-semibold uppercase tracking-wide transition-all',
          'border-2',
          canSubmit
            ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold) hover:bg-(--color-gold)/30'
            : 'bg-(--color-surface) border-(--color-border) text-(--color-ink-muted) cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⚡</span>
            GENERATING PROOF...
          </span>
        ) : (
          'EXECUTE CLAIM'
        )}
      </button>
    </div>
  );
}
