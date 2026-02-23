import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import type { PlayerScore } from '../hooks/useSocket';

interface ScoreBoardProps {
  scores: Record<string, PlayerScore>;
  compact?: boolean;
  currentPlayerId?: string;
  currentRound?: number;
  totalRounds?: number;
  currentTurn?: number;
}

interface DeltaAnimation {
  playerId: string;
  delta: number;
  phase: 'entering' | 'visible' | 'exiting';
  displayScore: number; // Score to show during animation (the old value)
}

export function ScoreBoard({
  scores,
  compact = false,
  currentPlayerId,
  currentRound,
  totalRounds,
  currentTurn,
}: ScoreBoardProps) {
  const showRoundInfo = currentRound !== undefined && totalRounds !== undefined && currentTurn !== undefined;
  const sortedScores = Object.values(scores).sort((a, b) => b.total - a.total);
  const prevScoresRef = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<DeltaAnimation[]>([]);

  // Detect score changes and trigger animations
  useEffect(() => {
    const newDeltas: DeltaAnimation[] = [];

    for (const score of Object.values(scores)) {
      const prevScore = prevScoresRef.current[score.playerId];
      if (prevScore !== undefined && prevScore !== score.total) {
        const delta = score.total - prevScore;
        newDeltas.push({
          playerId: score.playerId,
          delta,
          phase: 'entering',
          displayScore: prevScore,
        });
      }
    }

    if (newDeltas.length > 0) {
      setDeltas(prev => [...prev, ...newDeltas]);

      // Phase transitions with timers
      // entering -> visible (after 250ms)
      setTimeout(() => {
        setDeltas(prev =>
          prev.map(d =>
            newDeltas.some(nd => nd.playerId === d.playerId && nd.delta === d.delta && d.phase === 'entering')
              ? { ...d, phase: 'visible' }
              : d
          )
        );
      }, 250);

      // visible -> exiting (after 1250ms total = 250 + 1000)
      setTimeout(() => {
        setDeltas(prev =>
          prev.map(d =>
            newDeltas.some(nd => nd.playerId === d.playerId && nd.delta === d.delta && d.phase === 'visible')
              ? { ...d, phase: 'exiting' }
              : d
          )
        );
      }, 1250);

      // Remove from state (after 1500ms total = 250 + 1000 + 250)
      setTimeout(() => {
        setDeltas(prev =>
          prev.filter(d =>
            !newDeltas.some(nd => nd.playerId === d.playerId && nd.delta === d.delta)
          )
        );
      }, 1500);
    }

    // Update prev scores ref
    const newPrevScores: Record<string, number> = {};
    for (const score of Object.values(scores)) {
      newPrevScores[score.playerId] = score.total;
    }
    prevScoresRef.current = newPrevScores;
  }, [scores]);

  // Helper to get active delta for a player
  const getDelta = (playerId: string) => deltas.find(d => d.playerId === playerId);

  if (compact) {
    return (
      <div className="rounded-lg bg-(--color-surface)/50 border border-(--color-border)">
        {/* Round/Turn info */}
        {showRoundInfo && (
          <>
            <div className="flex justify-center gap-4 py-1.5 text-xs">
              <span className="text-(--color-ink-secondary)">
                Round <span className="text-(--color-gold) font-semibold">{currentRound}</span>/{totalRounds}
              </span>
              <span className="text-(--color-ink-muted)">
                Turn <span className="text-(--color-ink-secondary)">{currentTurn}</span>/3
              </span>
            </div>
            <div className="border-t border-(--color-border)" />
          </>
        )}

        {/* Scores grid */}
        <div className="grid grid-cols-4 gap-1 p-2">
          {sortedScores.map((score) => {
            const delta = getDelta(score.playerId);
            const displayScore = delta ? delta.displayScore : score.total;

            return (
              <div
                key={score.playerId}
                className={clsx(
                  'flex flex-col items-center py-1 px-1 rounded transition-all',
                  score.playerId === currentPlayerId && 'ring-1 ring-(--color-gold)/50'
                )}
              >
                <span className={clsx(
                  'text-sm font-medium truncate max-w-full',
                  score.playerId === currentPlayerId
                    ? 'text-(--color-gold)'
                    : 'text-(--color-ink-secondary)'
                )}>
                  {score.playerName}
                </span>
                <div className="relative flex items-center justify-center">
                  <span className="font-mono font-bold text-lg text-(--color-ink)">
                    {displayScore}
                  </span>
                  {delta && (
                    <span
                      className={clsx(
                        'absolute left-full ml-1 font-mono font-bold text-sm whitespace-nowrap',
                        delta.delta > 0 ? 'text-(--color-cyan)' : 'text-(--color-danger)',
                        delta.phase === 'entering' && 'animate-score-delta-enter',
                        delta.phase === 'exiting' && 'animate-score-delta-exit'
                      )}
                    >
                      {delta.delta > 0 ? '+' : ''}{delta.delta}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
