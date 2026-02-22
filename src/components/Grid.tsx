import { clsx } from 'clsx';
import { Avatar } from './Avatar';
import { CellExplosion } from './CellExplosion';
import type { AvatarConfig } from './Avatar/types';

interface OtherMortal {
  id: string;
  name: string;
  position: number;
  avatar?: AvatarConfig;
}

interface DeadPlayer {
  cell: number;
  name: string;
  avatar?: AvatarConfig;
}

interface GridProps {
  onCellClick?: (cell: number) => void;
  selectedCell?: number | null;
  attackedCells?: number[];
  hitCells?: number[];
  deadPlayers?: DeadPlayer[];
  lastAttackedCell?: number | null;
  myPosition?: number | null;
  myAvatar?: AvatarConfig;
  otherMortals?: OtherMortal[];
  disabled?: boolean;        // Afecta estilos visuales (opacity, cursor)
  interactive?: boolean;     // Permite/bloquea clicks (default: true)
  showPositionSelect?: boolean;
  takenPositions?: number[];
  isGod?: boolean;
  highlightedRow?: number | null;
  highlightedColumn?: number | null;
}

// Convert cell number (1-9) to row,col coordinates (0,0 - 2,2)
function cellToCoords(cell: number): { row: number; col: number } {
  const row = Math.floor((cell - 1) / 3);
  const col = (cell - 1) % 3;
  return { row, col };
}

// Default avatar for fallback
const DEFAULT_AVATAR: AvatarConfig = { color: '#c9a227', eyebrows: 'neutral' };

export function Grid({
  onCellClick,
  selectedCell,
  attackedCells = [],
  hitCells = [],
  deadPlayers = [],
  lastAttackedCell,
  myPosition,
  myAvatar,
  otherMortals = [],
  disabled = false,
  interactive = true,
  showPositionSelect = false,
  takenPositions = [],
  isGod = false,
  highlightedRow,
  highlightedColumn,
}: GridProps) {
  const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      {/* Grid container with outer border */}
      <div
        className="grid grid-cols-3 gap-[2px] p-[2px] rounded-lg"
        style={{
          background: 'var(--color-grid-border)',
          boxShadow: '0 0 30px var(--color-gold-glow), inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      >
        {cells.map((cell) => {
          const { row, col } = cellToCoords(cell);
          const isAttacked = attackedCells.includes(cell);
          const isHit = hitCells.includes(cell);
          const deadPlayerHere = deadPlayers.find(d => d.cell === cell);
          const isLastAttacked = lastAttackedCell === cell;
          const isMyPosition = myPosition === cell;
          const otherMortalHere = otherMortals.find(m => m.position === cell);
          const isSelected = selectedCell === cell;
          const isTaken = takenPositions.includes(cell);
          const canInteract = interactive && !disabled && !isAttacked;

          // Check if this cell is in highlighted row/column
          const isInHighlightedRow = highlightedRow !== null && highlightedRow !== undefined && row === highlightedRow;
          const isInHighlightedColumn = highlightedColumn !== null && highlightedColumn !== undefined && col === highlightedColumn;
          const isHighlighted = isInHighlightedRow || isInHighlightedColumn;

          return (
            <button
              key={cell}
              onClick={() => canInteract && onCellClick?.(cell)}
              className={clsx(
                'relative aspect-square transition-all duration-200',
                'flex flex-col items-center justify-center',
                // No interactivo pero no disabled = sin cambios visuales, solo sin clicks
                !interactive && !disabled && 'pointer-events-none',
                {
                  // Default state
                  'bg-(--color-grid-cell)':
                    !disabled && !isMyPosition && !isSelected && !isHighlighted && !isAttacked && !otherMortalHere,
                  // Solo cursor pointer y hover si es interactivo
                  'cursor-pointer hover:bg-(--color-grid-cell-hover)':
                    canInteract && !isMyPosition && !isSelected && !isHighlighted,

                  // Highlighted row/column
                  'bg-(--color-gold)/10':
                    isHighlighted && !isSelected && !isMyPosition && !isHit,

                  // Selected by God for attack
                  'bg-(--color-danger)/20 ring-2 ring-inset ring-(--color-danger)':
                    isSelected && isGod,

                  // Selected by Mortal for position
                  'bg-(--color-gold)/20 ring-2 ring-inset ring-(--color-gold)':
                    isSelected && !isGod,

                  // My position (mortal only)
                  'bg-(--color-gold)/15':
                    isMyPosition && !isAttacked,

                  // Other mortal's position
                  'bg-(--color-gold)/8':
                    otherMortalHere && !isAttacked && !isMyPosition,

                  // Attacked and missed
                  'bg-(--color-bg) opacity-40 cursor-not-allowed':
                    isAttacked && !isHit,

                  // Attacked and hit - death cell
                  'bg-(--color-danger)/30':
                    isHit,

                  // Taken position during setup
                  'bg-(--color-surface-elevated) cursor-not-allowed opacity-50':
                    showPositionSelect && isTaken && !isMyPosition,

                  // Disabled state
                  'cursor-not-allowed opacity-50':
                    disabled && !isAttacked && !isHit && !isMyPosition,
                }
              )}
            >
              {/* Explosion effect on last attacked cell */}
              {isLastAttacked && (
                <CellExplosion isHit={isHit} />
              )}

              {/* Cell content */}
              <div className="flex flex-col items-center justify-center">
                {/* Hit - show dead avatar instead of skull */}
                {isHit && deadPlayerHere && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Avatar
                      config={deadPlayerHere.avatar || DEFAULT_AVATAR}
                      size="xs"
                      isDead
                    />
                    <span className="text-(--color-danger) text-[8px] font-medium truncate max-w-[50px]">
                      {deadPlayerHere.name.toUpperCase().slice(0, 5)}
                    </span>
                  </div>
                )}

                {/* Hit but no player info (fallback) */}
                {isHit && !deadPlayerHere && (
                  <span className="text-2xl">💀</span>
                )}

                {/* Attacked but missed */}
                {isAttacked && !isHit && (
                  <span className="text-(--color-ink-muted) text-lg">✕</span>
                )}

                {/* My position indicator */}
                {isMyPosition && !isAttacked && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Avatar config={myAvatar || DEFAULT_AVATAR} size="xs" />
                    <span className="text-(--color-gold) text-[8px] font-semibold">YOU</span>
                  </div>
                )}

                {/* Other mortal's position indicator */}
                {otherMortalHere && !isAttacked && !isMyPosition && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Avatar config={otherMortalHere.avatar || DEFAULT_AVATAR} size="xs" />
                    <span className="text-(--color-gold) text-[8px] font-medium truncate max-w-[50px]">
                      {otherMortalHere.name.toUpperCase().slice(0, 5)}
                    </span>
                  </div>
                )}

                {/* Taken position during setup */}
                {showPositionSelect && isTaken && !isMyPosition && (
                  <span className="text-(--color-ink-muted) text-sm">●</span>
                )}

                {/* Target reticle for empty interactive cells (God view) */}
                {isGod && !isHit && !isAttacked && !isMyPosition && !otherMortalHere && !(showPositionSelect && isTaken) && (
                  <span className="text-(--color-gold)/30 text-lg">◎</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
