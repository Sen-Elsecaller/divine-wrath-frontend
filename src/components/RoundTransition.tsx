import { clsx } from 'clsx';
import type { Room, Player, RoundResult } from '../hooks/useSocket';
import { ScoreBoard } from './ScoreBoard';

interface RoundTransitionProps {
  room: Room;
  currentPlayer: Player;
  roundResult: RoundResult;
  onGodChoice: (choice: 'stay' | 'cede') => void;
}

export function RoundTransition({
  room,
  currentPlayer,
  roundResult,
  onGodChoice,
}: RoundTransitionProps) {
  const isGod = currentPlayer.role === 'god';
  const isMyChoice = isGod && roundResult.needsGodChoice;

  return (
    <div className="flex flex-col items-center gap-6 p-6 animate-fade-in">
      {/* Round header */}
      <div className="text-center">
        <p className="text-sm text-(--color-ink-muted) uppercase tracking-widest mb-1">
          Round {room.currentRound} Complete
        </p>
        <h2 className={clsx(
          'text-2xl font-bold',
          roundResult.winner === 'god' ? 'text-(--color-gold)' : 'text-(--color-cyan)'
        )}>
          {roundResult.winner === 'god'
            ? 'The God Eliminated All Mortals!'
            : 'Mortals Survived!'}
        </h2>
      </div>

      {/* Current scores */}
      <div className="w-full max-w-md">
        <p className="text-xs text-(--color-ink-muted) uppercase tracking-widest mb-3 text-center">
          Current Standings
        </p>
        <ScoreBoard scores={room.scores} currentPlayerId={currentPlayer.id} />
      </div>

      {/* God's choice (if applicable) */}
      {isMyChoice && (
        <div className="flex flex-col items-center gap-4 p-4 rounded-xl border border-(--color-gold)/30 bg-(--color-gold)/5">
          <p className="text-sm text-(--color-gold)">
            As the victorious God, you may choose:
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => onGodChoice('stay')}
              disabled={!roundResult.canStay}
              className={clsx(
                'px-6 py-3 rounded-lg font-semibold transition-all',
                'border-2',
                roundResult.canStay
                  ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold) hover:bg-(--color-gold)/30'
                  : 'bg-(--color-surface) border-(--color-border) text-(--color-ink-muted) cursor-not-allowed opacity-50'
              )}
            >
              Stay as God
              <span className="block text-xs font-normal opacity-70">
                (with penalty)
              </span>
            </button>

            <button
              onClick={() => onGodChoice('cede')}
              className={clsx(
                'px-6 py-3 rounded-lg font-semibold transition-all',
                'border-2',
                'bg-(--color-cyan)/20 border-(--color-cyan) text-(--color-cyan) hover:bg-(--color-cyan)/30'
              )}
            >
              Cede Role
              <span className="block text-xs font-normal opacity-70">
                (become mortal)
              </span>
            </button>
          </div>

          {!roundResult.canStay && (
            <p className="text-xs text-(--color-danger) text-center max-w-xs">
              Cannot stay: missed attacks in consecutive rounds (limit: 3 consecutive)
            </p>
          )}
        </div>
      )}

      {/* Waiting for God's choice */}
      {!isGod && roundResult.needsGodChoice && (
        <div className="flex items-center gap-2 text-(--color-ink-muted)">
          <span className="animate-spin">&#9696;</span>
          <span>Waiting for God's decision...</span>
        </div>
      )}

      {/* Auto-transition message (mortals won) */}
      {!roundResult.needsGodChoice && (
        <div className="flex items-center gap-2 text-(--color-cyan)">
          <span className="animate-pulse">&#9679;</span>
          <span>Next round starting...</span>
        </div>
      )}

      {/* Next round info */}
      <p className="text-xs text-(--color-ink-muted)">
        Round {room.currentRound + 1} of {room.totalRounds}
      </p>
    </div>
  );
}
