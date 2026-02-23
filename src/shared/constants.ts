// Claim types available in the game
export const CLAIM_TYPES = {
  ROW: 'row',
  COLUMN: 'column',
  ADJACENT: 'adjacent',
} as const;

export type ClaimType = (typeof CLAIM_TYPES)[keyof typeof CLAIM_TYPES];

// Claim type definitions with metadata
export const CLAIM_TYPE_CONFIG: Record<
  ClaimType,
  {
    id: ClaimType;
    label: string;
    needsValue: boolean;
    values: number[];
    formatClaim: (target: string, value?: number) => string;
  }
> = {
  [CLAIM_TYPES.ROW]: {
    id: 'row',
    label: 'Row',
    needsValue: true,
    values: [1, 2, 3],
    formatClaim: (target, value) => `${target} is in row ${value}`,
  },
  [CLAIM_TYPES.COLUMN]: {
    id: 'column',
    label: 'Column',
    needsValue: true,
    values: [1, 2, 3],
    formatClaim: (target, value) => `${target} is in column ${value}`,
  },
  [CLAIM_TYPES.ADJACENT]: {
    id: 'adjacent',
    label: 'Adjacent to me',
    needsValue: false,
    values: [],
    formatClaim: (target) => `${target} is adjacent to me`,
  },
};

// Game phases
export const PHASES = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  CLAIMING: 'claiming',
  DEDUCTION: 'deduction',
  ROUND_TRANSITION: 'round_transition',
  ENDED: 'ended',
} as const;

export type Phase = (typeof PHASES)[keyof typeof PHASES];

// Player roles
export const ROLES = {
  GOD: 'god',
  MORTAL: 'mortal',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Grid adjacency map
export const ADJACENCY_MAP: Record<number, number[]> = {
  1: [2, 4],
  2: [1, 3, 5],
  3: [2, 6],
  4: [1, 5, 7],
  5: [2, 4, 6, 8],
  6: [3, 5, 9],
  7: [4, 8],
  8: [5, 7, 9],
  9: [6, 8],
};

// Round configuration
export const ROUND_OPTIONS = [3, 4, 5] as const;
export const DEFAULT_ROUNDS = 3;
export const TURNS_PER_ROUND = 3;

// Scoring system
export const POINTS = {
  MORTAL_SURVIVES_TURN: 20,
  TRUE_SELF_CLAIM: 20,
  GOD_FINDS_MORTAL: 40,
  GOD_PENALTY_MISS: -20,
  GOD_PENALTY_HIT_BONUS: 15, // Additional to GOD_FINDS_MORTAL (total 55)
} as const;

// God consecutive limit
export const MAX_CONSECUTIVE_GOD_ROUNDS = 2;
