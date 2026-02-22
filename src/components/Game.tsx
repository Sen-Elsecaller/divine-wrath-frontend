import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { Grid } from './Grid';
import { ClaimPanel } from './ClaimPanel';
import { ScoreBoard } from './ScoreBoard';
import { StatusBanner } from './StatusBanner';
import type { Room, Player, Claim, Attack, ClaimTypeId, GameResult } from '../hooks/useSocket';
import { isClaimTaken, formatClaimText } from '../constants';
import { generateClaimProof, type ClaimType } from '../utils/zkProof';

interface GameProps {
  room: Room;
  currentPlayer: Player;
  lastAttack: Attack | null;
  gameResult: GameResult | null;
  blockchainResult: {
    success: boolean;
    claimId: string;
    error?: string;
    transactionHash?: string;
  } | null;
  onSelectPosition: (position: number) => void;
  onSubmitClaim: (claimType: ClaimTypeId, claimValue: number | boolean, targetPlayerId: string, zkProof?: { proof: object; publicSignals: string[]; isTrue: boolean }) => void;
  onAttackCell: (cell: number) => void;
  onVerifyClaim: (claimId: string) => void;
  onSubmitClaimBlockchain: (claimId: string, proof: object, publicSignals: string[]) => void;
  onClearBlockchainResult: () => void;
}

export function Game({
  room,
  currentPlayer,
  lastAttack,
  gameResult,
  blockchainResult,
  onSelectPosition,
  onSubmitClaim,
  onAttackCell,
  onVerifyClaim,
  onClearBlockchainResult,
}: GameProps) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedClaimType, setSelectedClaimType] = useState<ClaimTypeId | null>(null);
  const [selectedClaimValue, setSelectedClaimValue] = useState<number | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // ZK Proof state
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Attack message visibility (auto-hide after 3 seconds)
  const [showAttackMessage, setShowAttackMessage] = useState(false);

  // Show attack message briefly when new attack occurs
  useEffect(() => {
    if (lastAttack) {
      setShowAttackMessage(true);
      const timeout = setTimeout(() => {
        setShowAttackMessage(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [lastAttack]);

  // Clear blockchain result after 5 seconds
  useEffect(() => {
    if (blockchainResult) {
      const timeout = setTimeout(() => {
        onClearBlockchainResult();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [blockchainResult, onClearBlockchainResult]);

  // Reset claim selection when type changes
  useEffect(() => {
    setSelectedClaimValue(null);
    // Clear self-target when switching to adjacent (can't be adjacent to yourself)
    if (selectedClaimType === 'adjacent' && selectedTargetId === currentPlayer.id) {
      setSelectedTargetId(null);
    }
  }, [selectedClaimType, selectedTargetId, currentPlayer.id]);

  const isGod = currentPlayer.role === 'god';
  const isMortal = currentPlayer.role === 'mortal';
  const myPosition = currentPlayer.position;

  // Check if current selection is already claimed
  const isCurrentClaimTaken = useMemo(() => {
    if (!selectedTargetId || !selectedClaimType) return false;
    // For adjacent claims, use claimer's position as the value
    const valueToCheck = selectedClaimType === 'adjacent'
      ? (myPosition ?? true)
      : (selectedClaimValue ?? true);
    return isClaimTaken(room.claims, selectedTargetId, selectedClaimType, valueToCheck);
  }, [room.claims, selectedTargetId, selectedClaimType, selectedClaimValue, myPosition]);

  // Get other alive mortals (for grid display)
  const otherAliveMortals = room.players.filter(
    p => p.role === 'mortal' && p.id !== currentPlayer.id && p.position !== null
  );

  // All alive mortals including self (for target selection)
  const allAliveMortals = room.players.filter(
    p => p.role === 'mortal' && p.position !== null
  );

  // Other mortals data for Grid
  const otherMortalsForGrid = otherAliveMortals.map(p => ({
    id: p.id,
    name: p.name,
    position: p.position as number,
    avatar: p.avatar
  }));

  // Get attacked cells and hits
  const attackedCells = room.attacks.map(a => a.cell);
  const hitCells = room.attacks.filter(a => a.hit).map(a => a.cell);

  // Build dead players info for grid (with avatars)
  const deadPlayersForGrid = room.attacks
    .filter(a => a.hit && a.victimName)
    .map(a => {
      const player = room.players.find(p => p.name === a.victimName);
      return {
        cell: a.cell,
        name: a.victimName!,
        avatar: player?.avatar,
      };
    });

  // Last attacked cell for explosion effect
  const lastAttackedCell = lastAttack?.cell ?? null;

  // Get dead player IDs (position === null means dead)
  const deadPlayerIds = room.players
    .filter(p => p.role === 'mortal' && p.position === null)
    .map(p => p.id);

  // Filter claims: remove row/column claims about dead players, keep adjacent
  const filteredClaims = room.claims.filter(claim => {
    // Keep claims about alive players
    if (!deadPlayerIds.includes(claim.targetPlayerId)) return true;
    // For dead players, only keep adjacent claims
    return claim.claimType === 'adjacent';
  });

  // Get taken positions during setup
  const takenPositions = room.players
    .filter(p => p.position !== null)
    .map(p => p.position as number);

  // Calculate highlighted row/column based on claim selection
  const highlightedRow = selectedClaimType === 'row' && selectedClaimValue !== null
    ? selectedClaimValue - 1  // Convert 1-3 to 0-2
    : null;
  const highlightedColumn = selectedClaimType === 'column' && selectedClaimValue !== null
    ? selectedClaimValue - 1  // Convert 1-3 to 0-2
    : null;

  // Handle cell click based on phase
  const handleCellClick = (cell: number) => {
    if (room.phase === 'setup' && isMortal && !myPosition) {
      onSelectPosition(cell);
    } else if (room.phase === 'deduction' && isGod) {
      setSelectedCell(cell);
    }
  };

  // Handle attack confirmation
  const handleAttack = () => {
    if (selectedCell !== null) {
      onAttackCell(selectedCell);
      setSelectedCell(null);
    }
  };

  // Handle claim submission with ZK proof generation
  const handleClaim = async () => {
    if (!selectedTargetId || !selectedClaimType || isCurrentClaimTaken || isGeneratingProof) return;

    // For adjacent claims, use claimer's position as the value
    const valueToSubmit = selectedClaimType === 'adjacent'
      ? (myPosition as number)
      : (selectedClaimValue ?? true);

    // Find target player to get their position
    const targetPlayer = room.players.find(p => p.id === selectedTargetId);
    if (!targetPlayer || targetPlayer.position === null) {
      setProofError('Target player not found or has no position');
      return;
    }

    // Always generate ZK proof
    setIsGeneratingProof(true);
    setProofError(null);

    try {
      console.log(`[Game] Generating ZK proof for claim about ${targetPlayer.name}...`);

      // Map claim type and get the right value for the circuit
      let claimTypeForCircuit: ClaimType;
      let claimValueForCircuit: number;

      if (selectedClaimType === 'row') {
        claimTypeForCircuit = 'row';
        claimValueForCircuit = (selectedClaimValue ?? 1) - 1; // Convert 1-3 to 0-2
      } else if (selectedClaimType === 'column') {
        claimTypeForCircuit = 'column';
        claimValueForCircuit = (selectedClaimValue ?? 1) - 1; // Convert 1-3 to 0-2
      } else if (selectedClaimType === 'adjacent') {
        claimTypeForCircuit = 'adjacent';
        // For adjacent: use the CLAIMER's position (not a selected value)
        // This proves "target is adjacent to ME (the claimer)"
        claimValueForCircuit = myPosition as number; // Claimer's cell position (1-9)
      } else {
        throw new Error(`Unsupported claim type: ${selectedClaimType}`);
      }

      // Use TARGET's position for the proof
      const proofResult = await generateClaimProof(
        targetPlayer.position,
        claimTypeForCircuit,
        claimValueForCircuit
      );

      console.log('[Game] Proof generated!', {
        target: targetPlayer.name,
        isTrue: proofResult.isTrue,
      });

      // Submit claim WITH the proof attached
      onSubmitClaim(selectedClaimType, valueToSubmit, selectedTargetId, {
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
        isTrue: proofResult.isTrue,
      });

      // Reset selection after successful claim
      setSelectedClaimType(null);
      setSelectedClaimValue(null);
      setSelectedTargetId(null);

    } catch (err) {
      console.error('[Game] Failed to generate proof:', err);
      setProofError(err instanceof Error ? err.message : 'Failed to generate proof');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Game ended screen
  if (gameResult) {
    // Final round with ranking
    if (gameResult.isFinalRound && gameResult.ranking) {
      const myRank = gameResult.ranking.findIndex(s => s.playerId === currentPlayer.id) + 1;
      const isWinner = myRank === 1;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in gap-6">
          <div className={clsx(
            'text-6xl',
            isWinner ? 'animate-pulse' : ''
          )}>
            {isWinner ? '👑' : myRank <= 2 ? '🥈' : '💀'}
          </div>
          <h2 className={clsx(
            'text-3xl font-bold uppercase tracking-wider',
            isWinner ? 'text-(--color-gold)' : 'text-(--color-ink)'
          )}>
            {isWinner ? 'Champion!' : `#${myRank}`}
          </h2>

          <div className="w-full">
            <p className="text-xs text-(--color-ink-muted) uppercase tracking-widest mb-3 text-center">
              Final Standings
            </p>
            <ScoreBoard scores={room.scores} currentPlayerId={currentPlayer.id} />
          </div>

          <div className="text-(--color-ink-muted) text-xs">
            {room.totalRounds} rounds completed
          </div>
        </div>
      );
    }

    // Legacy single-round end (should not happen with new system)
    const won =
      (gameResult.winner === 'god' && isGod) ||
      (gameResult.winner === 'mortals' && isMortal);

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className={clsx(
          'text-7xl mb-6',
          won ? 'animate-pulse' : ''
        )}>
          {won ? '👑' : '💀'}
        </div>
        <h2 className={clsx(
          'text-4xl font-bold mb-4 uppercase tracking-wider',
          won ? 'text-(--color-gold)' : 'text-(--color-danger)'
        )}>
          {won ? 'Victory' : 'Defeat'}
        </h2>
        <p className="text-lg text-(--color-ink-secondary) mb-8">
          {gameResult.winner === 'god' ? 'The God has smitten all mortals' : 'The Mortals have survived'}
        </p>
        <div className="text-(--color-ink-muted) text-sm flex flex-col gap-1">
          <p>Final Turn: {room.turn}/3</p>
          <p>Mortals Eliminated: {hitCells.length}/3</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto animate-fade-in">
      {/* Grid */}
      <Grid
        onCellClick={handleCellClick}
        selectedCell={selectedCell}
        attackedCells={attackedCells}
        hitCells={hitCells}
        deadPlayers={deadPlayersForGrid}
        lastAttackedCell={lastAttackedCell}
        myPosition={isMortal ? myPosition : undefined}
        myAvatar={currentPlayer.avatar}
        otherMortals={isMortal && room.phase !== 'setup' ? otherMortalsForGrid : []}
        disabled={
          (room.phase === 'setup' && isGod)
        }
        interactive={
          (room.phase === 'setup' && isMortal && !myPosition) ||
          (room.phase === 'deduction' && isGod)
        }
        showPositionSelect={room.phase === 'setup' && isMortal}
        takenPositions={room.phase === 'setup' ? takenPositions : []}
        isGod={isGod}
        highlightedRow={highlightedRow}
        highlightedColumn={highlightedColumn}
        selectedTargetId={room.phase === 'claiming' && isMortal ? selectedTargetId : null}
      />

      {/* Phase-specific content */}
      <div className="flex flex-col gap-4">
        {/* Setup Phase */}
        {room.phase === 'setup' && (
          <div className="text-center p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            {isGod ? (
              <>
                <p className="text-[var(--color-ink-secondary)]">Mortals are choosing positions...</p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">{takenPositions.length}/3 ready</p>
              </>
            ) : myPosition ? (
              <>
                <p className="text-[var(--color-cyan)]">✓ Position selected</p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">Waiting for others...</p>
              </>
            ) : (
              <p className="text-[var(--color-ink-secondary)]">Select your hiding spot on the grid</p>
            )}
          </div>
        )}

        {/* Claiming Phase - Mortal */}
        {room.phase === 'claiming' && isMortal && myPosition !== null && (
          <>
            {proofError && (
              <div className="text-center p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]">
                <span className="text-[var(--color-danger)] text-sm">{proofError}</span>
              </div>
            )}
            <ClaimPanel
              selectedClaimType={selectedClaimType}
              selectedClaimValue={selectedClaimValue}
              selectedTargetId={selectedTargetId}
              players={allAliveMortals}
              currentPlayerId={currentPlayer.id}
              onSelectClaimType={setSelectedClaimType}
              onSelectValue={setSelectedClaimValue}
              onSelectTarget={setSelectedTargetId}
              onSubmit={handleClaim}
              isSubmitting={isGeneratingProof}
              isClaimTaken={isCurrentClaimTaken}
            />
          </>
        )}

        {/* Claiming Phase - Dead Mortal */}
        {room.phase === 'claiming' && isMortal && myPosition === null && (
          <StatusBanner
            defaultText="Watching survivors make claims..."
            lastAttack={lastAttack}
            showAttackMessage={showAttackMessage}
          />
        )}

        {/* Claiming Phase - God */}
        {room.phase === 'claiming' && isGod && (
          <StatusBanner
            defaultText="Mortals are making claims..."
            lastAttack={lastAttack}
            showAttackMessage={showAttackMessage}
          />
        )}

        {/* Deduction Phase - God */}
        {room.phase === 'deduction' && isGod && (
          <div className="flex flex-col gap-4">
            {/* Claims container */}
            <div className="p-4 rounded-lg bg-(--color-surface) border border-(--color-border)">
              {/* Verifications remaining - top center */}
              <div className="text-center mb-4">
                <span className="text-(--color-gold) text-sm font-medium">
                  🔍 {room.verificationsRemaining} verifications available
                </span>
              </div>

              {/* Claims list */}
              <ClaimsList
                claims={filteredClaims}
                currentTurn={room.turn}
                isGod={isGod}
                canVerify={true}
                verificationsRemaining={room.verificationsRemaining}
                onVerify={onVerifyClaim}
              />
            </div>

            {selectedCell !== null && (
              <button
                onClick={handleAttack}
                className="w-full py-3 rounded-lg font-semibold uppercase tracking-wide transition-all border-2 bg-(--color-danger)/20 border-(--color-danger) text-(--color-danger) hover:bg-(--color-danger)/30"
              >
                ⚡ EXECUTE ATTACK
              </button>
            )}
          </div>
        )}

        {/* Deduction Phase - Mortal */}
        {room.phase === 'deduction' && isMortal && (
          <div className="flex flex-col gap-4">
            <StatusBanner
              defaultText={myPosition === null ? 'Watching from beyond...' : 'The God is deciding...'}
              lastAttack={lastAttack}
              showAttackMessage={showAttackMessage}
            />
            {/* Claims list for mortals */}
            <div className="p-4 rounded-lg bg-(--color-surface) border border-(--color-border)">
              <ClaimsList
                claims={filteredClaims}
                currentTurn={room.turn}
                isGod={false}
                canVerify={false}
                verificationsRemaining={room.verificationsRemaining}
                onVerify={onVerifyClaim}
              />
            </div>
          </div>
        )}

        {/* Claims list - only show for claiming phase */}
        {room.phase === 'claiming' && (
          <ClaimsList
            claims={filteredClaims}
            currentTurn={room.turn}
            isGod={isGod}
            canVerify={false}
            verificationsRemaining={room.verificationsRemaining}
            onVerify={onVerifyClaim}
          />
        )}
      </div>

    </div>
  );
}

// Claims list component
interface ClaimsListProps {
  claims: Claim[];
  currentTurn: number;
  isGod?: boolean;
  canVerify?: boolean;
  verificationsRemaining?: number;
  onVerify?: (claimId: string) => void;
}

function ClaimsList({ claims, currentTurn, isGod, canVerify, verificationsRemaining, onVerify }: ClaimsListProps) {
  if (claims.length === 0) return null;

  // Group claims by turn
  const currentTurnClaims = claims.filter(c => c.turn === currentTurn);
  const previousClaims = claims.filter(c => c.turn < currentTurn);

  const renderClaim = (claim: Claim, isPrevious: boolean = false) => (
    <div
      key={claim.id}
      className={clsx(
        'flex items-center justify-between px-3 py-2.5 rounded-lg border',
        isPrevious
          ? 'bg-(--color-surface)/50 border-(--color-border)/50'
          : 'bg-(--color-surface) border-(--color-border)'
      )}
    >
      <div className="flex-1 min-w-0">
        <span className="text-(--color-cyan) text-sm font-medium">
          {claim.playerName}
        </span>
        <span className="text-(--color-ink-muted) text-sm">
          {' → '}
        </span>
        <span className={clsx(
          'text-sm',
          isPrevious ? 'text-(--color-ink-muted)' : 'text-(--color-ink-secondary)'
        )}>
          {formatClaimText(claim.claimType, claim.claimValue, claim.targetPlayerName)}
        </span>
      </div>

      {claim.verified ? (
        <span className={clsx(
          'text-xs font-semibold px-2 py-1 rounded',
          claim.isTrue
            ? 'bg-(--color-cyan)/20 text-(--color-cyan)'
            : 'bg-(--color-danger)/20 text-(--color-danger)'
        )}>
          {claim.isTrue ? '✓ TRUE' : '✗ FALSE'}
        </span>
      ) : isGod && canVerify && verificationsRemaining && verificationsRemaining > 0 && onVerify ? (
        <button
          onClick={() => onVerify(claim.id)}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-(--color-gold)/20 text-(--color-gold) border border-(--color-gold) hover:bg-(--color-gold)/30 transition-all"
        >
          🔍 VERIFY
        </button>
      ) : (
        <span className="text-(--color-ink-muted) text-xs italic">
          unverified
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Current turn claims */}
      {currentTurnClaims.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-(--color-ink-muted) text-xs tracking-widest uppercase px-1">
            Turn {currentTurn} Claims
          </span>
          {currentTurnClaims.map(claim => renderClaim(claim, false))}
        </div>
      )}

      {/* Previous turns claims */}
      {previousClaims.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-(--color-ink-muted)/70 text-xs tracking-widest uppercase px-1">
            Previous Claims
          </span>
          {previousClaims.map(claim => renderClaim(claim, true))}
        </div>
      )}
    </div>
  );
}
