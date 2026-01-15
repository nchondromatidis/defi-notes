import { type Abi, isHex } from 'viem';

// tracing
export type TracingId = string;
export type TxId = Hex;

// hex types
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export function safeCastToHex(value: string): Hex {
  if (!isHex(value)) throw new Error(`Invalid hex string: ${value}`);
  return value;
}

// Artifact schema
export type LensArtifact = {
  readonly contractName: string;
  readonly sourceName: string;
  readonly abi: Abi;
  readonly bytecode: Hex;
  readonly deployedBytecode: Hex;
  readonly linkReferences: Record<string, Record<string, unknown>>;
};

// Object must be:
// - values satisfy LensArtifact type
// - key formated as `LensArtifact['sourceName']:LensArtifact['contractName']`
export type LensArtifactsMap<ArtifactMapT extends object> = {
  [K in keyof ArtifactMapT as ArtifactMapT[K] extends LensArtifact
    ? K extends `${ArtifactMapT[K]['sourceName']}:${ArtifactMapT[K]['contractName']}`
      ? K
      : never
    : never]: Extract<ArtifactMapT[K], LensArtifact>;
};

export type FunctionCallTypes = 'function' | 'constructor' | 'fallback' | 'receive' | 'freeFunction';

export type RawLog = [address: Hex, topics: Hex[], data: Hex];

// function index
export type LensFunctionIndex = {
  nameOrKind: string;
  name: string;
  kind: FunctionCallTypes;
  selector: string | undefined;
  humanReadableABI: string | undefined;
  functionLineStart: number;
  functionLineEnd: number;
  source: string;
  contractFQN: string;
  visibility: 'external' | 'public' | 'internal' | 'private';
  parameterSlots: number;
  returnSlots: number;
};

// pc location index
export type PC = number;
export type ContractFQN = string;
export type JumpType = 'i' | 'o' | '-';
export type Location = [startLine: number, endLine: number, sourceIndex: number];

export type LensPcLocationIndex = {
  contractFQN: ContractFQN;
  locationSources: Array<string>;
  pcLocations: Array<[PC, JumpType, Location]>;
};
