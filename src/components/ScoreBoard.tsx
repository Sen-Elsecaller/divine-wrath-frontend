import { clsx } from 'clsx';
import type { PlayerScore } from '../hooks/useSocket';

interface ScoreBoardProps {
  scores: Record<string, PlayerScore>;
  compact?: boolean;
  currentPlayerId?: string;
}

export function ScoreBoard({ scores, compact = false, currentPlayerId }: ScoreBoardProps) {
  const sortedScores = Object.values(scores).sort((a, b) => b.total - a.total);

  if (compact) {
    return (
      <div className="flex gap-3 flex-wrap justify-center">
        {sortedScores.map((score, index) => (
          <span
            key={score.playerId}
            className={clsx(
              'text-xs px-2 py-1 rounded-full border',
              score.playerId === currentPlayerId
                ? 'border-(--color-gold)/50 text-(--color-gold)'
                : 'border-(--color-border) text-(--color-ink-secondary)'
            )}
          >
            {index === 0 && <span className="mr-1">1.</span>}
            {score.playerName}: <span className="font-mono font-semibold">{score.total}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      {sortedScores.map((score, index) => (
        <div
          key={score.playerId}
          className={clsx(
            'flex justify-between items-center p-3 rounded-lg',
            'border transition-all',
            index === 0
              ? 'bg-(--color-gold)/10 border-(--color-gold)/30'
              : 'bg-(--color-surface)/50 border-(--color-border)',
            score.playerId === currentPlayerId && 'ring-1 ring-(--color-gold)/50'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                index === 0
                  ? 'bg-(--color-gold) text-(--color-bg)'
                  : 'bg-(--color-surface) text-(--color-ink-muted)'
              )}
            >
              {index + 1}
            </span>
            <span className={clsx(
              'font-medium',
              index === 0 ? 'text-(--color-gold)' : 'text-(--color-ink)'
            )}>
              {score.playerName}
            </span>
          </div>
          <span className={clsx(
            'font-mono font-bold text-lg',
            index === 0 ? 'text-(--color-gold)' : 'text-(--color-ink-secondary)'
          )}>
            {score.total}
          </span>
        </div>
      ))}
    </div>
  );
}
