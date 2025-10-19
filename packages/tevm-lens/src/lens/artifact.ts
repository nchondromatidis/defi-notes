import { type Abi, isHex } from 'viem';

// hex types

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export function safeCastToHex(value: string): Hex {
  if (!isHex(value)) throw new Error(`Invalid hex string: ${value}`);
  return value;
}

// artifacts types

export interface LensArtifactSchema {
  readonly contractName: string;
  readonly sourceName: string;
  readonly abi: Abi;
  readonly bytecode: Hex;
  readonly deployedBytecode: Hex;
}

// T object must be:
// - compatible with LensArtifact
// - each key must be named `LensArtifact['sourceName']:LensArtifact['contractName']`
export type LensArtifactsMap<T extends Record<string, LensArtifactSchema>> = {
  [K in keyof T]: T[K] extends LensArtifactSchema
    ? K extends `${T[K]['sourceName']}:${T[K]['contractName']}`
      ? T[K]
      : never
    : never;
};

export type LensContractFQN<T extends Record<string, LensArtifactSchema>> = keyof LensArtifactsMap<T> & string;
export type LensProtocolsList = string;
