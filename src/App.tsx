import { useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { RoundTransition } from './components/RoundTransition';
import { ParticleBackground } from './components/ParticleBackground';

export default function App() {
  const autoJoinedRef = useRef(false);
  const {
    isConnected,
    room,
    currentPlayer,
    error,
    gameResult,
    lastAttack,
    blockchainResult,
    roundResult,
    createRoom,
    joinRoom,
    toggleReady,
    setRoundConfig,
    submitGodChoice,
    startGame,
    selectPosition,
    submitClaim,
    attackCell,
    verifyClaim,
    submitClaimBlockchain,
    clearBlockchainResult,
  } = useSocket();

  // Auto-join from URL params (for quick testing)
  useEffect(() => {
    if (autoJoinedRef.current || !isConnected || room) return;

    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const name = params.get('name');

    if (joinCode && name) {
      autoJoinedRef.current = true;
      joinRoom(joinCode, name);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isConnected, room, joinRoom]);

  // Not connected to server
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse text-[var(--color-gold)]">⚡</div>
          <p className="text-[var(--color-ink-muted)] text-sm tracking-widest uppercase">Connecting...</p>
        </div>
      </div>
    );
  }

  // In game (not lobby phase)
  const inGame = room && room.phase !== 'lobby' && currentPlayer;

  // Determine background variant based on player role
  const getBackgroundVariant = (): 'divine' | 'mortal' | 'default' => {
    if (!currentPlayer || !room || room.phase === 'lobby') {
      return 'default';
    }
    return currentPlayer.role === 'god' ? 'divine' : 'mortal';
  };

  // Format phase name for display
  const getPhaseDisplay = () => {
    if (!room) return null;
    const phaseNames: Record<string, string> = {
      lobby: 'LOBBY',
      setup: 'SETUP',
      claiming: 'CLAIMING',
      deduction: 'DEDUCTION',
      round_transition: 'TRANSITION',
      ended: 'ENDED',
    };
    return phaseNames[room.phase] || room.phase.toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background particles */}
      <ParticleBackground variant={getBackgroundVariant()} />

      {/* Header - only visible when in a room */}
      {room && (
        <header className="border-b border-(--color-border) py-4 animate-header-expand overflow-hidden">
          <div className="max-w-md mx-auto px-4 flex items-center justify-between">
            {/* Left: Title */}
            <h1 className="text-base font-bold flex items-center gap-2 font-[var(--font-display)]">
              <span className="text-(--color-gold)">⚡</span>
              <span className="text-(--color-gold) tracking-wide">DIVINE WRATH</span>
            </h1>

            {/* Center: Phase */}
            <span className="text-(--color-gold) text-sm font-semibold tracking-widest">
              {getPhaseDisplay()}
            </span>

            {/* Right: Room code (lobby) or Round/Turn (in game) */}
            <div className="text-right">
              {room.phase === 'lobby' ? (
                <span className="text-xs font-mono text-(--color-gold)">{room.code}</span>
              ) : (
                <div className="flex flex-col items-end text-xs">
                  <span className="text-(--color-ink-secondary)">
                    R<span className="text-(--color-gold) font-semibold">{room.currentRound}</span>/{room.totalRounds}
                  </span>
                  <span className="text-(--color-ink-muted)">
                    T<span className="text-(--color-ink-secondary)">{room.turn}</span>/3
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto px-4 py-6 w-full">
        {room?.phase === 'round_transition' && roundResult && currentPlayer ? (
          <RoundTransition
            room={room}
            currentPlayer={currentPlayer}
            roundResult={roundResult}
            onGodChoice={submitGodChoice}
          />
        ) : inGame ? (
          <Game
            room={room}
            currentPlayer={currentPlayer}
            lastAttack={lastAttack}
            gameResult={gameResult}
            blockchainResult={blockchainResult}
            onSelectPosition={selectPosition}
            onSubmitClaim={submitClaim}
            onAttackCell={attackCell}
            onVerifyClaim={verifyClaim}
            onSubmitClaimBlockchain={submitClaimBlockchain}
            onClearBlockchainResult={clearBlockchainResult}
          />
        ) : (
          <Lobby
            room={room}
            currentPlayer={currentPlayer}
            error={error}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onToggleReady={toggleReady}
            onStartGame={startGame}
            onSetRoundConfig={setRoundConfig}
          />
        )}
      </main>
    </div>
  );
}
