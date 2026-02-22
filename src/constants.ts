import type { ClaimTypeId } from './hooks/useSocket';

export interface ClaimTypeConfig {
  id: ClaimTypeId;
  label: string;
  needsValue: boolean;
  values: number[];
}

export const CLAIM_TYPES: Record<ClaimTypeId, ClaimTypeConfig> = {
  row: {
    id: 'row',
    label: 'Row',
    needsValue: true,
    values: [1, 2, 3],
  },
  column: {
    id: 'column',
    label: 'Column',
    needsValue: true,
    values: [1, 2, 3],
  },
  adjacent: {
    id: 'adjacent',
    label: 'Adjacent to me',
    needsValue: false,
    values: [],
  },
};

export const CLAIM_TYPE_LIST = Object.values(CLAIM_TYPES);

// Helper to format a claim for display
export function formatClaimText(
  claimType: ClaimTypeId | string,
  claimValue: number | boolean,
  targetName: string
): string {
  switch (claimType) {
    case 'row':
      return `${targetName} is in row ${claimValue}`;
    case 'column':
      return `${targetName} is in column ${claimValue}`;
    case 'adjacent':
      return `${targetName} is adjacent to me`;
    default:
      return `${targetName}: unknown claim`;
  }
}

// Helper to check if a claim already exists
export function isClaimTaken(
  claims: { targetPlayerId: string; claimType: ClaimTypeId; claimValue: number | boolean }[],
  targetPlayerId: string,
  claimType: ClaimTypeId,
  claimValue: number | boolean
): boolean {
  return claims.some(
    c =>
      c.targetPlayerId === targetPlayerId &&
      c.claimType === claimType &&
      c.claimValue === claimValue
  );
}
