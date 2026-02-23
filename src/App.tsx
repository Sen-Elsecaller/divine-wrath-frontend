import { useEffect, useRef, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAudio } from './hooks/useAudio';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { RoundTransition } from './components/RoundTransition';
import { ParticleBackground } from './components/ParticleBackground';
import { VolumeControl } from './components/VolumeControl';
import { SettingsMenu } from './components/SettingsMenu';

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
    leaveRoom,
    toggleReady,
    setRoundConfig,
    submitGodChoice,
    readyForNextRound,
    startGame,
    selectPosition,
    submitClaim,
    attackCell,
    selectGodCell,
    verifyClaim,
    submitClaimBlockchain,
    clearBlockchainResult,
  } = useSocket();

  const { playTrack, volume, setVolume, isMuted, toggleMute, tryResume } = useAudio();

  // Settings menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Effects volume (placeholder until useEffects is implemented)
  const [effectsVolume, setEffectsVolume] = useState(0.5);
  const [effectsMuted, setEffectsMuted] = useState(false);

  // Determine which track to play based on game state
  useEffect(() => {
    if (!room || room.phase === 'lobby') {
      playTrack('main-menu');
    } else if (room.phase === 'ended') {
      playTrack('endgame');
    } else if (room.currentRound <= 2) {
      playTrack('earlygame');
    } else {
      playTrack('endgame');
    }
  }, [room?.phase, room?.currentRound, playTrack]);

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
    <div className="min-h-screen flex flex-col relative" onClick={tryResume}>
      {/* Background particles */}
      <ParticleBackground variant={getBackgroundVariant()} />


      {/* Settings menu - outside header for proper z-index */}
      {room && (
        <SettingsMenu
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          musicVolume={volume}
          musicMuted={isMuted}
          onMusicVolumeChange={setVolume}
          onMusicMuteToggle={toggleMute}
          effectsVolume={effectsVolume}
          effectsMuted={effectsMuted}
          onEffectsVolumeChange={setEffectsVolume}
          onEffectsMuteToggle={() => setEffectsMuted(prev => !prev)}
        />
      )}

      {/* Header - only visible when in a room */}
      {room && (
        <header className="border-b border-(--color-border) py-3 animate-header-expand relative">
          <div className="max-w-md mx-auto px-4 flex items-center justify-between relative">
            {/* Left: Title (clickable to open settings) */}
            <button
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className="flex items-center gap-1.5 font-[var(--font-display)] bg-transparent border-none p-0 cursor-pointer"
            >
              <span className="text-(--color-gold) text-lg">⚡</span>
              <div className="flex flex-col leading-none">
                <span className="text-(--color-gold) text-xs font-bold tracking-wider">DIVINE</span>
                <span className="text-(--color-gold) text-xs font-bold tracking-wider">WRATH</span>
              </div>
            </button>

            {/* Center: Phase (absolute centered) - hidden when settings open */}
            {!isSettingsOpen && (
              <span className="absolute left-1/2 -translate-x-1/2 text-(--color-gold) text-sm font-semibold tracking-widest">
                {getPhaseDisplay()}
              </span>
            )}

            {/* Right: Room code (lobby only) */}
            {room.phase === 'lobby' && !isSettingsOpen && (
              <span className="text-xs font-mono text-(--color-gold)">{room.code}</span>
            )}
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto px-4 py-6 w-full relative">
        {/* Volume control when no room (main menu) - inside content container */}
        {!room && (
          <div className="absolute top-2 right-0 z-10">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setVolume}
            />
          </div>
        )}
        {room?.phase === 'round_transition' && roundResult && currentPlayer ? (
          <RoundTransition
            room={room}
            currentPlayer={currentPlayer}
            roundResult={roundResult}
            onGodChoice={submitGodChoice}
            onReady={readyForNextRound}
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
            onSelectGodCell={selectGodCell}
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
            onLeaveRoom={leaveRoom}
            onToggleReady={toggleReady}
            onStartGame={startGame}
            onSetRoundConfig={setRoundConfig}
          />
        )}
      </main>
    </div>
  );
}
