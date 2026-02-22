declare module 'snarkjs' {
  export interface Groth16Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export interface VK {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
  }

  export interface FullProveResult {
    proof: Groth16Proof;
    publicSignals: string[];
  }

  export const groth16: {
    fullProve(
      input: Record<string, number | string | bigint>,
      wasmFile: string,
      zkeyFile: string
    ): Promise<FullProveResult>;

    verify(
      vk: VK,
      publicSignals: string[],
      proof: Groth16Proof
    ): Promise<boolean>;
  };
}
