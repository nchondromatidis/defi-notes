import { type Abi } from 'viem';

// tracing
export type TxId = Hex;

// hex types
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

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

// Helper types
export type Depth = number;
export type OpCodeName = string;
export type OpCodeIndex = number;
export type PC = number;
export type ContractFQN = string;

// pc location index
export type JumpType = 'i' | 'o' | '-';
export type Location = [startLine: number, endLine: number, sourceIndex: number];

export type LensPcLocationIndex = {
  contractFQN: ContractFQN;
  locationSources: Array<string>;
  pcLocations: Array<[PC, JumpType, Location, OpCodeName]>; // PcLocationReadable
};

export type PcLocationReadable = {
  pc: number;
  OpcodeName: string;
  jumpType: JumpType;
  startLine: number;
  endLine: number;
  sourceName: string;
};
