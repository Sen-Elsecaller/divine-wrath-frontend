import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, Claim, Attack, Room, ClaimTypeId, AvatarConfig, RoundResult, PlayerScore } from '../shared/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Re-export types for convenience
export type { Player, Claim, Attack, Room, ClaimTypeId, AvatarConfig, RoundResult, PlayerScore };

// Extended game result with ranking for final round
export interface GameResult {
  winner: string | null;  // playerId of winner
  ranking?: PlayerScore[];
  isFinalRound?: boolean;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [lastAttack, setLastAttack] = useState<Attack | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [blockchainResult, setBlockchainResult] = useState<{
    success: boolean;
    claimId: string;
    error?: string;
    transactionHash?: string;
  } | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setPlayerId(socket.id ?? null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room_created', ({ room }) => {
      setRoom(room);
      setError(null);
    });

    socket.on('room_updated', ({ room }) => {
      setRoom(room);
    });

    socket.on('game_started', ({ room }) => {
      setRoom(room);
    });

    socket.on('phase_changed', ({ room }) => {
      setRoom(room);
    });

    socket.on('claim_submitted', ({ room }) => {
      setRoom(room);
    });

    socket.on('claim_verified', ({ room }) => {
      setRoom(room);
    });

    socket.on('attack_result', ({ room, ...attack }) => {
      setRoom(room);
      setLastAttack(attack);
    });

    socket.on('game_ended', ({ winner, room, ranking, isFinalRound }) => {
      setRoom(room);
      setGameResult({ winner, ranking, isFinalRound });
      setRoundResult(null);
    });

    socket.on('round_ended', ({ room, winner, needsGodChoice, canStay, godPlayerId }) => {
      setRoom(room);
      setRoundResult({ winner, needsGodChoice, canStay, godPlayerId });
    });

    socket.on('round_started', ({ room }) => {
      setRoom(room);
      setRoundResult(null);
    });

    socket.on('player_left', ({ room }) => {
      setRoom(room);
    });

    socket.on('room_left', () => {
      setRoom(null);
      setError(null);
      setGameResult(null);
      setLastAttack(null);
      setRoundResult(null);
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    // Blockchain events
    socket.on('blockchain_result', (result) => {
      console.log('[Socket] Blockchain result:', result);
      setBlockchainResult(result);
    });

    socket.on('claim_verified_onchain', ({ claim, room }) => {
      console.log('[Socket] Claim verified on-chain:', claim);
      setRoom(room);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string, avatar?: AvatarConfig) => {
    socketRef.current?.emit('create_room', { playerName, avatar });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, avatar?: AvatarConfig) => {
    socketRef.current?.emit('join_room', { roomCode, playerName, avatar });
  }, []);

  const leaveRoom = useCallback(() => {
    if (room) {
      socketRef.current?.emit('leave_room', { roomCode: room.code });
    }
  }, [room]);

  const toggleReady = useCallback(() => {
    if (room) {
      socketRef.current?.emit('toggle_ready', { roomCode: room.code });
    }
  }, [room]);

  const setRoundConfig = useCallback((totalRounds: number) => {
    if (room) {
      socketRef.current?.emit('set_round_config', { roomCode: room.code, totalRounds });
    }
  }, [room]);

  const submitGodChoice = useCallback((choice: 'stay' | 'cede') => {
    if (room) {
      socketRef.current?.emit('god_choice', { roomCode: room.code, choice });
    }
  }, [room]);

  const readyForNextRound = useCallback(() => {
    if (room) {
      socketRef.current?.emit('ready_for_next_round', { roomCode: room.code });
    }
  }, [room]);

  const startGame = useCallback(() => {
    if (room) {
      socketRef.current?.emit('start_game', { roomCode: room.code });
    }
  }, [room]);

  const selectPosition = useCallback((position: number) => {
    if (room) {
      socketRef.current?.emit('select_position', { roomCode: room.code, position });
    }
  }, [room]);

  const submitClaim = useCallback((
    claimType: ClaimTypeId,
    claimValue: number | boolean,
    targetPlayerId: string,
    zkProof?: { proof: object; publicSignals: string[]; isTrue: boolean }
  ) => {
    if (room) {
      socketRef.current?.emit('submit_claim', {
        roomCode: room.code,
        claimType,
        claimValue,
        targetPlayerId,
        zkProof, // Include ZK proof for blockchain verification
      });
    }
  }, [room]);

  const attackCell = useCallback((cell: number) => {
    if (room) {
      socketRef.current?.emit('attack_cell', { roomCode: room.code, cell });
    }
  }, [room]);

  const selectGodCell = useCallback((cell: number | null) => {
    if (room) {
      socketRef.current?.emit('god_select_cell', { roomCode: room.code, cell });
    }
  }, [room]);

  const verifyClaim = useCallback((claimId: string) => {
    if (room) {
      socketRef.current?.emit('verify_claim', { roomCode: room.code, claimId });
    }
  }, [room]);

  // Submit claim with ZK proof to blockchain
  const submitClaimBlockchain = useCallback((
    claimId: string,
    proof: object,
    publicSignals: string[]
  ) => {
    if (room) {
      console.log('[Socket] Submitting claim to blockchain:', { claimId, proofSize: JSON.stringify(proof).length });
      socketRef.current?.emit('submit_claim_blockchain', {
        roomCode: room.code,
        claimId,
        proof,
        publicSignals,
      });
    }
  }, [room]);

  // Clear blockchain result (for UI feedback reset)
  const clearBlockchainResult = useCallback(() => {
    setBlockchainResult(null);
  }, []);

  const currentPlayer = room?.players.find(p => p.id === playerId) ?? null;

  return {
    isConnected,
    room,
    playerId,
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
  };
}
