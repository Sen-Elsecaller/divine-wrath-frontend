/**
 * ZK Proof utilities for Divine Wrath
 *
 * Genera proofs en el browser usando Circom/Groth16 via snarkjs
 * El proof demuestra que un claim es verdadero/falso sin revelar la posicion
 */

import * as snarkjs from 'snarkjs';

// Tipos para los claims
export type ClaimType = 'row' | 'column' | 'adjacent';

// Mapeo de claim types a numeros (como en el circuito)
const CLAIM_TYPE_MAP: Record<ClaimType, number> = {
  row: 0,
  column: 1,
  adjacent: 2,
};

// Paths a los artifacts del circuito
const WASM_PATH = '/circuits/divine_wrath.wasm';
const ZKEY_PATH = '/circuits/divine_wrath_final.zkey';
const VK_PATH = '/circuits/verification_key.json';

// Cache de la verification key
let vkCache: snarkjs.VK | null = null;

/**
 * Carga la verification key (con cache)
 */
async function loadVerificationKey(): Promise<snarkjs.VK> {
  if (vkCache) {
    return vkCache;
  }

  const response = await fetch(VK_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load verification key: ${response.statusText}`);
  }
  vkCache = await response.json();
  return vkCache!;
}

/**
 * Verifica un claim localmente (sin generar proof)
 * Util para validar antes de generar el proof costoso
 */
export function verifyClaimLocally(
  position: number,
  claimType: ClaimType,
  claimValue: number
): boolean {
  // Validar posicion
  if (position < 1 || position > 9) {
    throw new Error('Position must be between 1 and 9');
  }

  const row = Math.floor((position - 1) / 3);
  const col = (position - 1) % 3;

  switch (claimType) {
    case 'row':
      return row === claimValue;
    case 'column':
      return col === claimValue;
    case 'adjacent': {
      // Calcular si son adyacentes (no diagonal)
      const otherRow = Math.floor((claimValue - 1) / 3);
      const otherCol = (claimValue - 1) % 3;
      const rowDiff = Math.abs(row - otherRow);
      const colDiff = Math.abs(col - otherCol);
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    default:
      return false;
  }
}

/**
 * Genera un ZK proof para un claim
 *
 * @param position - Posicion secreta del mortal (1-9)
 * @param claimType - Tipo de claim (row, column, adjacent)
 * @param claimValue - Valor del claim (fila 0-2, columna 0-2, o celda 1-9 para adjacent)
 * @returns Proof y public inputs serializados
 */
export async function generateClaimProof(
  position: number,
  claimType: ClaimType,
  claimValue: number
): Promise<{
  proof: snarkjs.Groth16Proof;
  publicSignals: string[];
  isTrue: boolean;
}> {
  console.log('[ZK] Generating proof for claim:', { position, claimType, claimValue });

  // Verificar localmente primero
  const isTrue = verifyClaimLocally(position, claimType, claimValue);
  console.log('[ZK] Local verification result:', isTrue);

  // Preparar inputs para el circuito
  const inputs = {
    position: position,
    claimType: CLAIM_TYPE_MAP[claimType],
    claimValue: claimValue,
    expectedResult: isTrue ? 1 : 0,
  };

  console.log('[ZK] Circuit inputs:', inputs);

  // Generar proof
  console.log('[ZK] Generating proof (this may take a few seconds)...');
  const proofStart = performance.now();

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    WASM_PATH,
    ZKEY_PATH
  );

  const proofTime = ((performance.now() - proofStart) / 1000).toFixed(2);
  console.log(`[ZK] Proof generated in ${proofTime}s`);

  console.log('[ZK] Proof generated successfully');
  console.log('[ZK] Public signals:', publicSignals);

  return {
    proof,
    publicSignals,
    isTrue,
  };
}

/**
 * Verifica un proof localmente (para testing)
 * En produccion, esto lo haria el contrato Soroban
 */
export async function verifyProof(
  proof: snarkjs.Groth16Proof,
  publicSignals: string[]
): Promise<boolean> {
  console.log('[ZK] Verifying proof...');

  const vk = await loadVerificationKey();
  const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof);

  console.log('[ZK] Proof verification result:', isValid);
  return isValid;
}

/**
 * Serializa un proof para enviar al servidor
 */
export function serializeProof(proof: snarkjs.Groth16Proof): string {
  return JSON.stringify(proof);
}

/**
 * Deserializa un proof recibido
 */
export function deserializeProof(serialized: string): snarkjs.Groth16Proof {
  return JSON.parse(serialized);
}

/**
 * Genera y verifica un proof (helper para testing)
 */
export async function generateAndVerifyProof(
  position: number,
  claimType: ClaimType,
  claimValue: number
): Promise<{
  proof: snarkjs.Groth16Proof;
  publicSignals: string[];
  isTrue: boolean;
  verified: boolean;
}> {
  const { proof, publicSignals, isTrue } = await generateClaimProof(
    position,
    claimType,
    claimValue
  );

  const verified = await verifyProof(proof, publicSignals);

  return { proof, publicSignals, isTrue, verified };
}
