/**
 * Divine Wrath Blockchain Service
 *
 * Servicio para interactuar con el contrato divine-wrath en Stellar.
 * Complementa el flujo de WebSockets con verificación on-chain de ZK proofs.
 */

import { Client as DivineWrathClient, type Game, type Groth16Proof, type VerifiedClaim } from './bindings';
import { NETWORK_PASSPHRASE, RPC_URL, DEFAULT_METHOD_OPTIONS, DEFAULT_AUTH_TTL_MINUTES } from '@/utils/constants';
import { contract } from '@stellar/stellar-sdk';
import { signAndSendViaLaunchtube } from '@/utils/transactionHelper';
import { calculateValidUntilLedger } from '@/utils/ledgerUtils';
import type { Groth16Proof as SnarkjsProof } from 'snarkjs';

type ClientOptions = contract.ClientOptions;
type Signer = Pick<ClientOptions, 'signTransaction' | 'signAuthEntry'>;

/**
 * Convierte un número decimal (string) a bytes big-endian de 32 bytes
 */
function decimalToBytes32(decimal: string): Uint8Array {
  const bytes = new Uint8Array(32);
  let num = BigInt(decimal);

  // Convertir a bytes big-endian (MSB first)
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(num & 0xFFn);
    num >>= 8n;
  }

  return bytes;
}

/**
 * Convierte un punto G1 de snarkjs (array de 3 strings) a 64 bytes
 * Formato: x (32 bytes) || y (32 bytes)
 */
function g1PointToBytes(point: string[]): Buffer {
  const x = decimalToBytes32(point[0]);
  const y = decimalToBytes32(point[1]);

  const result = new Uint8Array(64);
  result.set(x, 0);
  result.set(y, 32);

  return Buffer.from(result);
}

/**
 * Convierte un punto G2 de snarkjs a 128 bytes
 *
 * snarkjs formato: [[x_real, x_imag], [y_real, y_imag], [z_real, z_imag]]
 * Soroban formato: x_imag || x_real || y_imag || y_real (c1||c0 ordering)
 *
 * IMPORTANTE: Soroban usa ordenamiento imag||real, snarkjs usa real||imag
 */
function g2PointToBytes(point: string[][]): Buffer {
  // point[0] = [x_real, x_imag] (coordenada x en Fp2)
  // point[1] = [y_real, y_imag] (coordenada y en Fp2)

  const xReal = decimalToBytes32(point[0][0]);
  const xImag = decimalToBytes32(point[0][1]);
  const yReal = decimalToBytes32(point[1][0]);
  const yImag = decimalToBytes32(point[1][1]);

  // Ordenamiento Soroban: imag || real para cada coordenada
  const result = new Uint8Array(128);
  result.set(xImag, 0);   // x.c1 (imag)
  result.set(xReal, 32);  // x.c0 (real)
  result.set(yImag, 64);  // y.c1 (imag)
  result.set(yReal, 96);  // y.c0 (real)

  return Buffer.from(result);
}

/**
 * Convierte un proof de snarkjs al formato Groth16Proof del contrato
 */
export function convertSnarkjsProofToContract(proof: SnarkjsProof): Groth16Proof {
  return {
    a: g1PointToBytes(proof.pi_a),
    b: g2PointToBytes(proof.pi_b),
    c: g1PointToBytes(proof.pi_c),
  };
}

/**
 * Mapeo de claim types del frontend al contrato
 */
const CLAIM_TYPE_MAP = {
  row: 0,
  column: 1,
  adjacent: 2,
} as const;

export type ClaimTypeString = keyof typeof CLAIM_TYPE_MAP;

/**
 * Service para interactuar con el contrato Divine Wrath
 */
export class DivineWrathBlockchainService {
  private baseClient: DivineWrathClient;
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.baseClient = new DivineWrathClient({
      contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    });
  }

  /**
   * Crea un cliente con capacidad de firma
   */
  private createSigningClient(publicKey: string, signer: Signer): DivineWrathClient {
    return new DivineWrathClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey,
      ...signer,
    });
  }

  /**
   * Obtiene el estado de una partida
   */
  async getGame(sessionId: number): Promise<Game | null> {
    try {
      const tx = await this.baseClient.get_game({ session_id: sessionId });
      const result = await tx.simulate();

      if (result.result.isOk()) {
        return result.result.unwrap();
      }
      return null;
    } catch (err) {
      console.log('[getGame] Error:', err);
      return null;
    }
  }

  /**
   * Obtiene los claims de una partida
   */
  async getClaims(sessionId: number): Promise<VerifiedClaim[] | null> {
    try {
      const tx = await this.baseClient.get_claims({ session_id: sessionId });
      const result = await tx.simulate();

      if (result.result.isOk()) {
        return result.result.unwrap();
      }
      return null;
    } catch (err) {
      console.log('[getClaims] Error:', err);
      return null;
    }
  }

  /**
   * Inicia una nueva partida on-chain
   *
   * NOTA: Requiere firma de los 4 jugadores (god + 3 mortales)
   * El contrato usa require_auth() para todos ellos.
   *
   * @param sessionId - ID único de la partida (puede ser hash del room code)
   * @param godAddress - Dirección del God
   * @param mortalAddresses - Direcciones de los 3 mortales
   * @param callerAddress - Quién envía la transacción
   * @param signer - Firmante
   */
  async startGame(
    sessionId: number,
    godAddress: string,
    mortalAddresses: string[],
    callerAddress: string,
    signer: Signer,
  ): Promise<void> {
    if (mortalAddresses.length !== 3) {
      throw new Error('Exactly 3 mortals required');
    }

    const client = this.createSigningClient(callerAddress, signer);

    const tx = await client.start_game({
      session_id: sessionId,
      god: godAddress,
      mortals: mortalAddresses,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedger = await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    await signAndSendViaLaunchtube(
      tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      validUntilLedger,
    );
  }

  /**
   * Envía un claim con ZK proof al contrato
   *
   * @param sessionId - ID de la partida
   * @param mortalAddress - Dirección del mortal que hace el claim
   * @param claimType - Tipo de claim (row, column, adjacent)
   * @param claimValue - Valor del claim (0-2 para row/col, 1-9 para adjacent)
   * @param expectedResult - Lo que el mortal afirma (true/false)
   * @param snarkjsProof - Proof generado por snarkjs
   * @param signer - Firmante
   */
  async submitClaim(
    sessionId: number,
    mortalAddress: string,
    claimType: ClaimTypeString,
    claimValue: number,
    expectedResult: boolean,
    snarkjsProof: SnarkjsProof,
    signer: Signer,
  ): Promise<boolean> {
    const client = this.createSigningClient(mortalAddress, signer);

    // Convertir proof al formato del contrato
    const proof = convertSnarkjsProofToContract(snarkjsProof);

    const tx = await client.submit_claim({
      session_id: sessionId,
      mortal: mortalAddress,
      claim_type: CLAIM_TYPE_MAP[claimType],
      claim_value: claimValue,
      expected_result: expectedResult,
      proof,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedger = await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    const sentTx = await signAndSendViaLaunchtube(
      tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      validUntilLedger,
    );

    // El resultado es el expectedResult si el proof es válido
    const result = sentTx.result;
    if (result.isOk()) {
      return result.unwrap();
    }
    throw new Error('Claim rejected: invalid proof');
  }

  /**
   * God ataca una celda
   *
   * @param sessionId - ID de la partida
   * @param godAddress - Dirección del God
   * @param cell - Celda a atacar (1-9)
   * @param hitMortal - Dirección del mortal que fue golpeado (off-chain)
   * @param signer - Firmante
   */
  async attack(
    sessionId: number,
    godAddress: string,
    cell: number,
    hitMortal: string | null,
    signer: Signer,
  ): Promise<boolean> {
    if (cell < 1 || cell > 9) {
      throw new Error('Cell must be between 1 and 9');
    }

    const client = this.createSigningClient(godAddress, signer);

    const tx = await client.attack({
      session_id: sessionId,
      cell,
      hit_mortal: hitMortal ?? undefined,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedger = await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    const sentTx = await signAndSendViaLaunchtube(
      tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      validUntilLedger,
    );

    const result = sentTx.result;
    if (result.isOk()) {
      return result.unwrap();
    }
    throw new Error('Attack failed');
  }

  /**
   * Envía un claim con ZK proof usando el relayer (admin)
   *
   * Esta función permite que el servidor envíe claims en nombre de los mortales.
   * El mortal no necesita tener wallet conectada.
   *
   * @param sessionId - ID de la partida
   * @param mortalAddress - Dirección del mortal (solo registro, no firma)
   * @param claimType - Tipo de claim (row, column, adjacent)
   * @param claimValue - Valor del claim
   * @param expectedResult - Lo que el mortal afirma (true/false)
   * @param snarkjsProof - Proof generado por snarkjs
   * @param adminAddress - Dirección del admin (relayer)
   * @param adminSigner - Firmante del admin
   */
  async submitClaimRelayed(
    sessionId: number,
    mortalAddress: string,
    claimType: ClaimTypeString,
    claimValue: number,
    expectedResult: boolean,
    snarkjsProof: SnarkjsProof,
    adminAddress: string,
    adminSigner: Signer,
  ): Promise<boolean> {
    const client = this.createSigningClient(adminAddress, adminSigner);

    // Convertir proof al formato del contrato
    const proof = convertSnarkjsProofToContract(snarkjsProof);

    const tx = await client.submit_claim_relayed({
      session_id: sessionId,
      mortal: mortalAddress,
      claim_type: CLAIM_TYPE_MAP[claimType],
      claim_value: claimValue,
      expected_result: expectedResult,
      proof,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedger = await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    const sentTx = await signAndSendViaLaunchtube(
      tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      validUntilLedger,
    );

    const result = sentTx.result;
    if (result.isOk()) {
      return result.unwrap();
    }
    throw new Error('Claim rejected: invalid proof');
  }
}

// Singleton para uso global (se puede instanciar con el contract ID correcto)
let serviceInstance: DivineWrathBlockchainService | null = null;

export function getDivineWrathBlockchainService(contractId: string): DivineWrathBlockchainService {
  if (!serviceInstance || serviceInstance['contractId'] !== contractId) {
    serviceInstance = new DivineWrathBlockchainService(contractId);
  }
  return serviceInstance;
}
