import { clsx } from 'clsx';
import type { Attack } from '../hooks/useSocket';

interface StatusBannerProps {
  defaultText: string;
  lastAttack: Attack | null;
  showAttackMessage: boolean;
}

export function StatusBanner({ defaultText, lastAttack, showAttackMessage }: StatusBannerProps) {
  const isAttackMode = showAttackMessage && lastAttack;

  return (
    <div
      className={clsx(
        'text-center p-4 rounded-lg border transition-all duration-300',
        isAttackMode
          ? lastAttack.hit
            ? 'bg-(--color-danger)/15 border-(--color-danger)'
            : 'bg-(--color-surface) border-(--color-gold)/50'
          : 'bg-(--color-surface) border-(--color-border)'
      )}
    >
      <p
        className={clsx(
          'transition-all duration-300',
          isAttackMode
            ? lastAttack.hit
              ? 'text-(--color-danger) font-medium'
              : 'text-(--color-ink-muted)'
            : 'text-(--color-ink-secondary)'
        )}
      >
        {isAttackMode
          ? lastAttack.hit
            ? `${lastAttack.victimName} was struck down!`
            : 'The strike missed...'
          : defaultText}
      </p>
    </div>
  );
}
