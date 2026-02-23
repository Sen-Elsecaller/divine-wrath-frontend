import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import type { Room, Player, AvatarConfig } from '../hooks/useSocket';
import { usePlayerData } from '../hooks/usePlayerData';
import { Avatar, AvatarCustomizer } from './Avatar';

interface LobbyProps {
  room: Room | null;
  currentPlayer: Player | null;
  error: string | null;
  onCreateRoom: (playerName: string, avatar?: AvatarConfig) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar?: AvatarConfig) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onSetRoundConfig: (totalRounds: number) => void;
}

// Animation duration in ms
const TRANSITION_DURATION = 250;

export function Lobby({
  room,
  currentPlayer,
  error,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onStartGame,
  onSetRoundConfig,
}: LobbyProps) {
  const { playerData, isLoaded, setName, updateAvatar } = usePlayerData();
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [isExiting, setIsExiting] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Handle transition with exit animation
  const transitionTo = (action: () => void) => {
    setIsExiting(true);
    pendingActionRef.current = action;
    setTimeout(() => {
      action();
      setIsExiting(false);
    }, TRANSITION_DURATION);
  };

  const handleCreate = () => {
    if (playerData.name.trim()) {
      transitionTo(() => onCreateRoom(playerData.name.trim(), playerData.avatar));
    }
  };

  const handleJoin = () => {
    if (playerData.name.trim() && roomCode.trim()) {
      transitionTo(() => onJoinRoom(roomCode.trim(), playerData.name.trim(), playerData.avatar));
    }
  };

  const handleModeChange = (newMode: 'menu' | 'join') => {
    transitionTo(() => setMode(newMode));
  };

  // Wait for localStorage to load
  if (!isLoaded) {
    return null;
  }

  // If in a room, show waiting room with 2x2 grid
  if (room) {
    const allReady = room.players.every(p => p.isReady);
    const canStart = currentPlayer?.isHost && room.players.length === 4 && allReady;

    // Create array of 4 slots (players + empty)
    const slots = [...room.players];
    while (slots.length < 4) {
      slots.push(null as unknown as Player);
    }

    return (
      <div className="flex flex-col gap-6 animate-slide-in-from-top">
        {/* Room header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-(--color-surface) border border-(--color-border)">
            <span className="text-xs text-(--color-ink-muted)">ROOM</span>
            <span className="text-sm font-mono text-(--color-gold)">{room.code}</span>
          </div>
          {room.players.length < 4 && (
            <button
              onClick={() => {
                const needed = 4 - room.players.length;
                for (let i = 0; i < needed; i++) {
                  const name = `Bot${String.fromCharCode(65 + i)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
                  window.open(`${window.location.pathname}?join=${room.code}&name=${name}`, '_blank');
                }
              }}
              className="mt-3 block mx-auto text-xs text-(--color-gold) hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Open {4 - room.players.length} bot tabs for testing
            </button>
          )}
        </div>

        {/* Round config (host only) */}
        {currentPlayer?.isHost && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-(--color-ink-muted) uppercase tracking-widest">
              Rounds:
            </span>
            {[3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onSetRoundConfig(n)}
                className={clsx(
                  'w-10 h-10 rounded-lg font-mono font-semibold transition-all border',
                  'flex items-center justify-center',
                  room.totalRounds === n
                    ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold)'
                    : 'bg-(--color-surface) border-(--color-border) text-(--color-ink-muted) hover:border-(--color-gold)/50'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Show round count for non-host */}
        {!currentPlayer?.isHost && (
          <div className="text-center text-xs text-(--color-ink-muted)">
            <span className="uppercase tracking-widest">Rounds: </span>
            <span className="text-(--color-gold) font-mono">{room.totalRounds}</span>
          </div>
        )}

        {/* Players grid 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {slots.map((player, index) => (
            <div
              key={player?.id || `empty-${index}`}
              className={clsx(
                'flex flex-col items-center justify-center p-6 rounded-xl border',
                player
                  ? 'bg-(--color-surface) border-(--color-border)'
                  : 'border-dashed border-(--color-border)'
              )}
            >
              {player ? (
                <>
                  {/* Player avatar */}
                  <Avatar
                    config={player.avatar || playerData.avatar}
                    size="md"
                    className="mb-2"
                  />
                  {/* Player name */}
                  <span className="text-(--color-ink) font-medium text-sm">
                    {player.name}
                  </span>
                  {/* Host badge */}
                  {player.isHost && (
                    <span className="text-[10px] bg-(--color-gold) text-(--color-bg) px-1.5 py-0.5 rounded font-semibold uppercase mt-1">
                      Host
                    </span>
                  )}
                  {/* Ready status */}
                  <span className={clsx(
                    'text-xs font-medium mt-2',
                    player.isReady ? 'text-(--color-cyan)' : 'text-(--color-ink-muted)'
                  )}>
                    {player.isReady ? '✓ READY' : 'waiting'}
                  </span>
                </>
              ) : (
                <>
                  {/* Empty slot placeholder */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-(--color-border) mb-2 opacity-30" />
                  <span className="text-(--color-ink-muted) text-xs">
                    Waiting...
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onToggleReady}
            className={clsx(
              'flex-1 py-3 rounded-lg font-semibold uppercase tracking-wide transition-all border-2',
              currentPlayer?.isReady
                ? 'bg-transparent border-(--color-border) text-(--color-ink-muted)'
                : 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold)'
            )}
          >
            {currentPlayer?.isReady ? 'Cancel' : 'Ready'}
          </button>

          {currentPlayer?.isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={clsx(
                'flex-1 py-3 rounded-lg font-semibold uppercase tracking-wide transition-all border-2',
                canStart
                  ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold) hover:bg-(--color-gold)/30'
                  : 'bg-transparent border-(--color-border) text-(--color-ink-muted) cursor-not-allowed'
              )}
            >
              Start
            </button>
          )}
        </div>

        {!canStart && currentPlayer?.isHost && (
          <p className="text-center text-(--color-ink-muted) text-xs">
            {room.players.length < 4
              ? `Need ${4 - room.players.length} more player(s)`
              : 'Waiting for all players to be ready'}
          </p>
        )}

        {/* Leave room button */}
        <button
          onClick={() => transitionTo(onLeaveRoom)}
          className="px-4 py-2 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-ink-muted) hover:border-(--color-danger)/50 hover:text-(--color-danger) text-sm transition-all self-center"
        >
          Leave Room
        </button>
      </div>
    );
  }

  // Join room form
  if (mode === 'join') {
    return (
      <div className={clsx(
        'flex flex-col gap-6',
        isExiting ? 'animate-slide-out-to-bottom' : 'animate-slide-in-from-top'
      )}>
        <h2 className="text-xl font-bold text-center uppercase tracking-wider">
          Join Room
        </h2>

        {error && (
          <div className="p-3 rounded-lg bg-(--color-danger)/10 border border-(--color-danger)">
            <p className="text-(--color-danger) text-sm text-center">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-(--color-ink-muted) text-xs uppercase tracking-widest mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-gold) placeholder:text-(--color-ink-muted) focus:border-(--color-gold) focus:outline-none transition-colors uppercase tracking-widest font-mono text-center"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!playerData.name.trim() || !roomCode.trim()}
            className={clsx(
              'w-full py-4 rounded-lg font-semibold uppercase tracking-wide transition-all border-2',
              playerData.name.trim() && roomCode.trim()
                ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold) hover:bg-(--color-gold)/30'
                : 'bg-transparent border-(--color-border) text-(--color-ink-muted) cursor-not-allowed'
            )}
          >
            Join
          </button>

          {!playerData.name.trim() && (
            <p className="text-center text-(--color-danger) text-xs">
              Please set your name first
            </p>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => handleModeChange('menu')}
          className="px-4 py-2 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-ink-muted) hover:border-(--color-danger)/50 hover:text-(--color-danger) text-sm transition-all self-center"
        >
          Back
        </button>
      </div>
    );
  }

  // Main menu
  return (
    <div className={clsx(
      'flex flex-col gap-6',
      isExiting ? 'animate-slide-out-to-bottom' : 'animate-fade-in'
    )}>
      {/* Title */}
      <div className="text-center">
        <div className="text-6xl mb-4 text-(--color-gold)">⚡</div>
        <h2 className="text-2xl font-bold text-(--color-ink) uppercase tracking-wider mb-2">
          Divine Wrath
        </h2>
        <p className="text-(--color-ink-muted) text-sm">
          1 God vs 3 Mortals
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleCreate}
          disabled={!playerData.name.trim() || isExiting}
          className={clsx(
            'w-full py-4 rounded-lg font-semibold uppercase tracking-wide transition-all border-2',
            playerData.name.trim()
              ? 'bg-(--color-gold)/20 border-(--color-gold) text-(--color-gold) hover:bg-(--color-gold)/30'
              : 'bg-transparent border-(--color-border) text-(--color-ink-muted) cursor-not-allowed'
          )}
        >
          Create Room
        </button>
        <button
          onClick={() => handleModeChange('join')}
          disabled={isExiting}
          className="w-full py-4 rounded-lg font-semibold uppercase tracking-wide transition-all border-2 bg-transparent border-(--color-border) text-(--color-ink-secondary) hover:border-(--color-gold)/50"
        >
          Join Room
        </button>
      </div>

      {/* Avatar customization */}
      <AvatarCustomizer
        name={playerData.name}
        avatar={playerData.avatar}
        onNameChange={setName}
        onAvatarChange={updateAvatar}
      />

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-(--color-danger)/10 border border-(--color-danger)">
          <p className="text-(--color-danger) text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
