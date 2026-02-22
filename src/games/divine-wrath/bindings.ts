import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CC3D5AH5B3DOGZPJIX2T52PIT3Q2Y6XT3XIAG2FYCK32SBVENIXJFYQZ",
  }
} as const


/**
 * Estado del juego
 */
export interface Game {
  attacked_cells: Array<u32>;
  claims: Array<VerifiedClaim>;
  current_turn: u32;
  ended: boolean;
  god: string;
  god_won: Option<boolean>;
  max_turns: u32;
  mortals: Array<MortalState>;
}

export const Errors = {
  1: {message:"GameNotFound"},
  2: {message:"NotAuthorized"},
  3: {message:"GameAlreadyEnded"},
  4: {message:"InvalidProof"},
  5: {message:"NotMortal"},
  6: {message:"NotGod"},
  7: {message:"InvalidClaimType"},
  8: {message:"MortalAlreadyDead"},
  9: {message:"InvalidCell"},
  10: {message:"MaxClaimsReached"}
}

/**
 * Storage keys
 */
export type DataKey = {tag: "Game", values: readonly [u32]} | {tag: "GameHubAddress", values: void} | {tag: "VerifierAddress", values: void} | {tag: "Admin", values: void};

/**
 * Tipos de claim que un mortal puede hacer
 */
export enum ClaimType {
  Row = 0,
  Column = 1,
  Adjacent = 2,
}


/**
 * Estado de un mortal
 */
export interface MortalState {
  address: string;
  is_alive: boolean;
}


/**
 * Un claim verificado
 */
export interface VerifiedClaim {
  claim_type: u32;
  claim_value: u32;
  mortal: string;
  result: boolean;
  turn: u32;
}

/**
 * Errores durante verificación de proofs Groth16.
 */
export const Groth16Error = {
  /**
   * El pairing check falló - proof inválido.
   */
  0: {message:"InvalidProof"},
  /**
   * Cantidad de public inputs no coincide con la verification key.
   */
  1: {message:"MalformedPublicInputs"},
  /**
   * Los bytes del proof están malformados.
   */
  2: {message:"MalformedProof"},
  /**
   * El contrato no fue inicializado.
   */
  3: {message:"NotInitialized"}
}


/**
 * Proof Groth16 compuesto por puntos A, B, C.
 * 
 * - A: punto en G1
 * - B: punto en G2 (usa ordenamiento c1||c0)
 * - C: punto en G1
 */
export interface Groth16Proof {
  /**
 * Punto A en G1
 */
a: Buffer;
  /**
 * Punto B en G2
 */
b: Buffer;
  /**
 * Punto C en G1
 */
c: Buffer;
}


/**
 * Verification Key para Groth16 en curva BN254 (formato bytes).
 * 
 * Los puntos G2 usan el ordenamiento de Soroban: c1||c0 (imaginario||real).
 * Esta estructura se genera a partir de `verification_key.json` de snarkjs.
 */
export interface VerificationKeyBytes {
  /**
 * Punto alpha en G1 (64 bytes: x || y)
 */
alpha: Buffer;
  /**
 * Punto beta en G2 (128 bytes)
 */
beta: Buffer;
  /**
 * Punto delta en G2 (128 bytes)
 */
delta: Buffer;
  /**
 * Punto gamma en G2 (128 bytes)
 */
gamma: Buffer;
  /**
 * Array de puntos IC en G1 (uno por cada public input + 1)
 */
ic: Array<Buffer>;
}

export interface Client {
  /**
   * Construct and simulate a attack transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * God ataca una celda.
   * 
   * # Arguments
   * * `session_id` - ID de la partida
   * * `cell` - Celda a atacar (1-9)
   * 
   * # Returns
   * * `true` si mató a un mortal, `false` si falló
   * 
   * NOTA: En esta versión simplificada, el resultado del ataque
   * se determina off-chain y se reporta aquí. En una versión completa,
   * los mortales comitirían hashes de sus posiciones y se revelarían
   * con ZK proofs.
   */
  attack: ({session_id, cell, hit_mortal}: {session_id: u32, cell: u32, hit_mortal: Option<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Obtiene el estado de una partida.
   */
  get_game: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Game>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_claims transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Obtiene los claims de una partida.
   */
  get_claims: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<VerifiedClaim>>>>

  /**
   * Construct and simulate a start_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Inicia una nueva partida.
   * 
   * # Arguments
   * * `session_id` - ID único de la partida
   * * `god` - Dirección del God
   * * `mortals` - Direcciones de los 3 Mortales
   */
  start_game: ({session_id, god, mortals}: {session_id: u32, god: string, mortals: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_verifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_verifier: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_verifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_verifier: ({new_verifier}: {new_verifier: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a submit_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Envía un claim con ZK proof.
   * 
   * # Arguments
   * * `session_id` - ID de la partida
   * * `mortal` - Dirección del mortal que hace el claim
   * * `claim_type` - 0=row, 1=column, 2=adjacent
   * * `claim_value` - Valor del claim (0-2 para row/col, 1-9 para adjacent)
   * * `expected_result` - true/false (lo que el mortal afirma)
   * * `proof` - ZK proof generado por snarkjs
   */
  submit_claim: ({session_id, mortal, claim_type, claim_value, expected_result, proof}: {session_id: u32, mortal: string, claim_type: u32, claim_value: u32, expected_result: boolean, proof: Groth16Proof}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a submit_claim_relayed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Envía un claim con ZK proof usando un relayer.
   * 
   * Esta función permite que un servidor actúe como intermediario,
   * enviando claims en nombre de los mortales. Útil cuando los
   * mortales no tienen wallets conectadas.
   * 
   * # Arguments
   * * `session_id` - ID de la partida
   * * `mortal` - Dirección del mortal (solo para registro, no firma)
   * * `claim_type` - 0=row, 1=column, 2=adjacent
   * * `claim_value` - Valor del claim
   * * `expected_result` - true/false
   * * `proof` - ZK proof generado en el browser
   * 
   * # Security
   * Solo el admin puede llamar esta función. El proof ZK garantiza
   * que el claim es válido independientemente de quién lo envíe.
   */
  submit_claim_relayed: ({session_id, mortal, claim_type, claim_value, expected_result, proof}: {session_id: u32, mortal: string, claim_type: u32, claim_value: u32, expected_result: boolean, proof: Groth16Proof}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, game_hub, verifier}: {admin: string, game_hub: string, verifier: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, game_hub, verifier}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAABBFc3RhZG8gZGVsIGp1ZWdvAAAAAAAAAARHYW1lAAAACAAAAAAAAAAOYXR0YWNrZWRfY2VsbHMAAAAAA+oAAAAEAAAAAAAAAAZjbGFpbXMAAAAAA+oAAAfQAAAADVZlcmlmaWVkQ2xhaW0AAAAAAAAAAAAADGN1cnJlbnRfdHVybgAAAAQAAAAAAAAABWVuZGVkAAAAAAAAAQAAAAAAAAADZ29kAAAAABMAAAAAAAAAB2dvZF93b24AAAAD6AAAAAEAAAAAAAAACW1heF90dXJucwAAAAAAAAQAAAAAAAAAB21vcnRhbHMAAAAD6gAAB9AAAAALTW9ydGFsU3RhdGUA",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACgAAAAAAAAAMR2FtZU5vdEZvdW5kAAAAAQAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAAAIAAAAAAAAAEEdhbWVBbHJlYWR5RW5kZWQAAAADAAAAAAAAAAxJbnZhbGlkUHJvb2YAAAAEAAAAAAAAAAlOb3RNb3J0YWwAAAAAAAAFAAAAAAAAAAZOb3RHb2QAAAAAAAYAAAAAAAAAEEludmFsaWRDbGFpbVR5cGUAAAAHAAAAAAAAABFNb3J0YWxBbHJlYWR5RGVhZAAAAAAAAAgAAAAAAAAAC0ludmFsaWRDZWxsAAAAAAkAAAAAAAAAEE1heENsYWltc1JlYWNoZWQAAAAK",
        "AAAAAgAAAAxTdG9yYWdlIGtleXMAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAEAAAAAAAAABEdhbWUAAAABAAAABAAAAAAAAAAAAAAADkdhbWVIdWJBZGRyZXNzAAAAAAAAAAAAAAAAAA9WZXJpZmllckFkZHJlc3MAAAAAAAAAAAAAAAAFQWRtaW4AAAA=",
        "AAAAAwAAAChUaXBvcyBkZSBjbGFpbSBxdWUgdW4gbW9ydGFsIHB1ZWRlIGhhY2VyAAAAAAAAAAlDbGFpbVR5cGUAAAAAAAADAAAAAAAAAANSb3cAAAAAAAAAAAAAAAAGQ29sdW1uAAAAAAABAAAAAAAAAAhBZGphY2VudAAAAAI=",
        "AAAAAQAAABNFc3RhZG8gZGUgdW4gbW9ydGFsAAAAAAAAAAALTW9ydGFsU3RhdGUAAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAhpc19hbGl2ZQAAAAE=",
        "AAAAAQAAABNVbiBjbGFpbSB2ZXJpZmljYWRvAAAAAAAAAAANVmVyaWZpZWRDbGFpbQAAAAAAAAUAAAAAAAAACmNsYWltX3R5cGUAAAAAAAQAAAAAAAAAC2NsYWltX3ZhbHVlAAAAAAQAAAAAAAAABm1vcnRhbAAAAAAAEwAAAAAAAAAGcmVzdWx0AAAAAAABAAAAAAAAAAR0dXJuAAAABA==",
        "AAAAAAAAAXRHb2QgYXRhY2EgdW5hIGNlbGRhLgoKIyBBcmd1bWVudHMKKiBgc2Vzc2lvbl9pZGAgLSBJRCBkZSBsYSBwYXJ0aWRhCiogYGNlbGxgIC0gQ2VsZGEgYSBhdGFjYXIgKDEtOSkKCiMgUmV0dXJucwoqIGB0cnVlYCBzaSBtYXTDsyBhIHVuIG1vcnRhbCwgYGZhbHNlYCBzaSBmYWxsw7MKCk5PVEE6IEVuIGVzdGEgdmVyc2nDs24gc2ltcGxpZmljYWRhLCBlbCByZXN1bHRhZG8gZGVsIGF0YXF1ZQpzZSBkZXRlcm1pbmEgb2ZmLWNoYWluIHkgc2UgcmVwb3J0YSBhcXXDrS4gRW4gdW5hIHZlcnNpw7NuIGNvbXBsZXRhLApsb3MgbW9ydGFsZXMgY29taXRpcsOtYW4gaGFzaGVzIGRlIHN1cyBwb3NpY2lvbmVzIHkgc2UgcmV2ZWxhcsOtYW4KY29uIFpLIHByb29mcy4AAAAGYXR0YWNrAAAAAAADAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAAAAAARjZWxsAAAABAAAAAAAAAAKaGl0X21vcnRhbAAAAAAD6AAAABMAAAABAAAD6QAAAAEAAAAD",
        "AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAACFPYnRpZW5lIGVsIGVzdGFkbyBkZSB1bmEgcGFydGlkYS4AAAAAAAAIZ2V0X2dhbWUAAAABAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAQAAA+kAAAfQAAAABEdhbWUAAAAD",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAACJPYnRpZW5lIGxvcyBjbGFpbXMgZGUgdW5hIHBhcnRpZGEuAAAAAAAKZ2V0X2NsYWltcwAAAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAEAAAPpAAAD6gAAB9AAAAANVmVyaWZpZWRDbGFpbQAAAAAAAAM=",
        "AAAAAAAAAJhJbmljaWEgdW5hIG51ZXZhIHBhcnRpZGEuCgojIEFyZ3VtZW50cwoqIGBzZXNzaW9uX2lkYCAtIElEIMO6bmljbyBkZSBsYSBwYXJ0aWRhCiogYGdvZGAgLSBEaXJlY2Npw7NuIGRlbCBHb2QKKiBgbW9ydGFsc2AgLSBEaXJlY2Npb25lcyBkZSBsb3MgMyBNb3J0YWxlcwAAAApzdGFydF9nYW1lAAAAAAADAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAAAAAANnb2QAAAAAEwAAAAAAAAAHbW9ydGFscwAAAAPqAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAAMZ2V0X3ZlcmlmaWVyAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAMc2V0X3ZlcmlmaWVyAAAAAQAAAAAAAAAMbmV3X3ZlcmlmaWVyAAAAEwAAAAA=",
        "AAAAAAAAAVtFbnbDrWEgdW4gY2xhaW0gY29uIFpLIHByb29mLgoKIyBBcmd1bWVudHMKKiBgc2Vzc2lvbl9pZGAgLSBJRCBkZSBsYSBwYXJ0aWRhCiogYG1vcnRhbGAgLSBEaXJlY2Npw7NuIGRlbCBtb3J0YWwgcXVlIGhhY2UgZWwgY2xhaW0KKiBgY2xhaW1fdHlwZWAgLSAwPXJvdywgMT1jb2x1bW4sIDI9YWRqYWNlbnQKKiBgY2xhaW1fdmFsdWVgIC0gVmFsb3IgZGVsIGNsYWltICgwLTIgcGFyYSByb3cvY29sLCAxLTkgcGFyYSBhZGphY2VudCkKKiBgZXhwZWN0ZWRfcmVzdWx0YCAtIHRydWUvZmFsc2UgKGxvIHF1ZSBlbCBtb3J0YWwgYWZpcm1hKQoqIGBwcm9vZmAgLSBaSyBwcm9vZiBnZW5lcmFkbyBwb3Igc25hcmtqcwAAAAAMc3VibWl0X2NsYWltAAAABgAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGbW9ydGFsAAAAAAATAAAAAAAAAApjbGFpbV90eXBlAAAAAAAEAAAAAAAAAAtjbGFpbV92YWx1ZQAAAAAEAAAAAAAAAA9leHBlY3RlZF9yZXN1bHQAAAAAAQAAAAAAAAAFcHJvb2YAAAAAAAfQAAAADEdyb3RoMTZQcm9vZgAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAAAAAKRJbmljaWFsaXphIGVsIGNvbnRyYXRvLgoKIyBBcmd1bWVudHMKKiBgYWRtaW5gIC0gQWRtaW5pc3RyYWRvciBkZWwgY29udHJhdG8KKiBgZ2FtZV9odWJgIC0gRGlyZWNjacOzbiBkZWwgR2FtZSBIdWIKKiBgdmVyaWZpZXJgIC0gRGlyZWNjacOzbiBkZWwgdmVyaWZpY2Fkb3IgR3JvdGgxNgAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhnYW1lX2h1YgAAABMAAAAAAAAACHZlcmlmaWVyAAAAEwAAAAA=",
        "AAAAAAAAAm1FbnbDrWEgdW4gY2xhaW0gY29uIFpLIHByb29mIHVzYW5kbyB1biByZWxheWVyLgoKRXN0YSBmdW5jacOzbiBwZXJtaXRlIHF1ZSB1biBzZXJ2aWRvciBhY3TDumUgY29tbyBpbnRlcm1lZGlhcmlvLAplbnZpYW5kbyBjbGFpbXMgZW4gbm9tYnJlIGRlIGxvcyBtb3J0YWxlcy4gw5p0aWwgY3VhbmRvIGxvcwptb3J0YWxlcyBubyB0aWVuZW4gd2FsbGV0cyBjb25lY3RhZGFzLgoKIyBBcmd1bWVudHMKKiBgc2Vzc2lvbl9pZGAgLSBJRCBkZSBsYSBwYXJ0aWRhCiogYG1vcnRhbGAgLSBEaXJlY2Npw7NuIGRlbCBtb3J0YWwgKHNvbG8gcGFyYSByZWdpc3Rybywgbm8gZmlybWEpCiogYGNsYWltX3R5cGVgIC0gMD1yb3csIDE9Y29sdW1uLCAyPWFkamFjZW50CiogYGNsYWltX3ZhbHVlYCAtIFZhbG9yIGRlbCBjbGFpbQoqIGBleHBlY3RlZF9yZXN1bHRgIC0gdHJ1ZS9mYWxzZQoqIGBwcm9vZmAgLSBaSyBwcm9vZiBnZW5lcmFkbyBlbiBlbCBicm93c2VyCgojIFNlY3VyaXR5ClNvbG8gZWwgYWRtaW4gcHVlZGUgbGxhbWFyIGVzdGEgZnVuY2nDs24uIEVsIHByb29mIFpLIGdhcmFudGl6YQpxdWUgZWwgY2xhaW0gZXMgdsOhbGlkbyBpbmRlcGVuZGllbnRlbWVudGUgZGUgcXVpw6luIGxvIGVudsOtZS4AAAAAAAAUc3VibWl0X2NsYWltX3JlbGF5ZWQAAAAGAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAAAAAAZtb3J0YWwAAAAAABMAAAAAAAAACmNsYWltX3R5cGUAAAAAAAQAAAAAAAAAC2NsYWltX3ZhbHVlAAAAAAQAAAAAAAAAD2V4cGVjdGVkX3Jlc3VsdAAAAAABAAAAAAAAAAVwcm9vZgAAAAAAB9AAAAAMR3JvdGgxNlByb29mAAAAAQAAA+kAAAABAAAAAw==",
        "AAAABAAAADBFcnJvcmVzIGR1cmFudGUgdmVyaWZpY2FjacOzbiBkZSBwcm9vZnMgR3JvdGgxNi4AAAAAAAAADEdyb3RoMTZFcnJvcgAAAAQAAAAqRWwgcGFpcmluZyBjaGVjayBmYWxsw7MgLSBwcm9vZiBpbnbDoWxpZG8uAAAAAAAMSW52YWxpZFByb29mAAAAAAAAAD5DYW50aWRhZCBkZSBwdWJsaWMgaW5wdXRzIG5vIGNvaW5jaWRlIGNvbiBsYSB2ZXJpZmljYXRpb24ga2V5LgAAAAAAFU1hbGZvcm1lZFB1YmxpY0lucHV0cwAAAAAAAAEAAAAnTG9zIGJ5dGVzIGRlbCBwcm9vZiBlc3TDoW4gbWFsZm9ybWFkb3MuAAAAAA5NYWxmb3JtZWRQcm9vZgAAAAAAAgAAACBFbCBjb250cmF0byBubyBmdWUgaW5pY2lhbGl6YWRvLgAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAw==",
        "AAAAAQAAAHlQcm9vZiBHcm90aDE2IGNvbXB1ZXN0byBwb3IgcHVudG9zIEEsIEIsIEMuCgotIEE6IHB1bnRvIGVuIEcxCi0gQjogcHVudG8gZW4gRzIgKHVzYSBvcmRlbmFtaWVudG8gYzF8fGMwKQotIEM6IHB1bnRvIGVuIEcxAAAAAAAAAAAAAAxHcm90aDE2UHJvb2YAAAADAAAADVB1bnRvIEEgZW4gRzEAAAAAAAABYQAAAAAAA+4AAABAAAAADVB1bnRvIEIgZW4gRzIAAAAAAAABYgAAAAAAA+4AAACAAAAADVB1bnRvIEMgZW4gRzEAAAAAAAABYwAAAAAAA+4AAABA",
        "AAAAAQAAANJWZXJpZmljYXRpb24gS2V5IHBhcmEgR3JvdGgxNiBlbiBjdXJ2YSBCTjI1NCAoZm9ybWF0byBieXRlcykuCgpMb3MgcHVudG9zIEcyIHVzYW4gZWwgb3JkZW5hbWllbnRvIGRlIFNvcm9iYW46IGMxfHxjMCAoaW1hZ2luYXJpb3x8cmVhbCkuCkVzdGEgZXN0cnVjdHVyYSBzZSBnZW5lcmEgYSBwYXJ0aXIgZGUgYHZlcmlmaWNhdGlvbl9rZXkuanNvbmAgZGUgc25hcmtqcy4AAAAAAAAAAAAUVmVyaWZpY2F0aW9uS2V5Qnl0ZXMAAAAFAAAAJFB1bnRvIGFscGhhIGVuIEcxICg2NCBieXRlczogeCB8fCB5KQAAAAVhbHBoYQAAAAAAA+4AAABAAAAAHFB1bnRvIGJldGEgZW4gRzIgKDEyOCBieXRlcykAAAAEYmV0YQAAA+4AAACAAAAAHVB1bnRvIGRlbHRhIGVuIEcyICgxMjggYnl0ZXMpAAAAAAAABWRlbHRhAAAAAAAD7gAAAIAAAAAdUHVudG8gZ2FtbWEgZW4gRzIgKDEyOCBieXRlcykAAAAAAAAFZ2FtbWEAAAAAAAPuAAAAgAAAADhBcnJheSBkZSBwdW50b3MgSUMgZW4gRzEgKHVubyBwb3IgY2FkYSBwdWJsaWMgaW5wdXQgKyAxKQAAAAJpYwAAAAAD6gAAA+4AAABA" ]),
      options
    )
  }
  public readonly fromJSON = {
    attack: this.txFromJSON<Result<boolean>>,
        upgrade: this.txFromJSON<null>,
        get_game: this.txFromJSON<Result<Game>>,
        get_admin: this.txFromJSON<string>,
        set_admin: this.txFromJSON<null>,
        get_claims: this.txFromJSON<Result<Array<VerifiedClaim>>>,
        start_game: this.txFromJSON<Result<void>>,
        get_verifier: this.txFromJSON<string>,
        set_verifier: this.txFromJSON<null>,
        submit_claim: this.txFromJSON<Result<boolean>>,
        submit_claim_relayed: this.txFromJSON<Result<boolean>>
  }
}