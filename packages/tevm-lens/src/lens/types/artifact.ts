import { type Abi, isHex } from 'viem';

// hex types
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export function safeCastToHex(value: string): Hex {
  if (!isHex(value)) throw new Error(`Invalid hex string: ${value}`);
  return value;
}

// artifact schema
export type LensArtifact = {
  readonly contractName: string;
  readonly sourceName: string;
  readonly abi: Abi;
  readonly bytecode: Hex;
  readonly deployedBytecode: Hex;
  readonly linkReferences: Record<string, Record<string, unknown>>;
};

// T object must be:
// - key formated as `LensArtifact['sourceName']:LensArtifact['contractName']`
// - values satisfy LensArtifact type
export type LensArtifactsMap<T extends Record<string, LensArtifact>> = {
  [K in keyof T]: T[K] extends LensArtifact
    ? K extends `${T[K]['sourceName']}:${T[K]['contractName']}`
      ? T[K]
      : never
    : never;
};

export type LensContractFQN<T extends Record<string, LensArtifact>> = keyof LensArtifactsMap<T> & string;
export type LensProtocolsList = string;

export type FunctionCallTypes = 'function' | 'constructor' | 'fallback' | 'receive' | 'freeFunction';

// function index schema
export type LensFunctionIndex = {
  nameOrKind: string;
  name: string;
  kind: FunctionCallTypes;
  lineStart: number;
  lineEnd: number;
  source: string;
  contractFQN: string;
};

export type LensSourceFunctionIndexes = Array<LensFunctionIndex>;

export type RawLog = [address: Hex, topics: Hex[], data: Hex];
