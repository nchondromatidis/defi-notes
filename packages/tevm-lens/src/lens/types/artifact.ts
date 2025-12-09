import { type Abi, isHex } from 'viem';

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
// - `LensArtifact['sourceName']` formated as  `${RootT}/${ProjectT}/contracts/`
export type LensArtifactsMap<
  ArtifactMapT extends object,
  ProjectsT extends LensProjects,
  ProjectT extends ProjectsT,
  RootT extends string,
> = {
  [K in keyof ArtifactMapT as ArtifactMapT[K] extends LensArtifact
    ? K extends `${ArtifactMapT[K]['sourceName']}:${ArtifactMapT[K]['contractName']}`
      ? ArtifactMapT[K]['sourceName'] extends `${RootT}/${ProjectT}/${string}`
        ? K
        : never
      : never
    : never]: Extract<ArtifactMapT[K], LensArtifact>;
};

export type LensContractFQN<
  ArtifactMapT extends object,
  ProjectsT extends LensProjects,
  ProjectT extends ProjectsT,
  RootT extends string,
> = keyof LensArtifactsMap<ArtifactMapT, ProjectsT, ProjectT, RootT> & string;
export type LensProjects = string;

export type FunctionCallTypes = 'function' | 'constructor' | 'fallback' | 'receive' | 'freeFunction';

// function index schema
export type LensFunctionIndex = {
  nameOrKind: string;
  name: string;
  kind: FunctionCallTypes;
  functionSelector: string | undefined;
  lineStart: number;
  lineEnd: number;
  source: string;
  contractFQN: string;
};

export type LensSourceFunctionIndexes = Array<LensFunctionIndex>;

export type RawLog = [address: Hex, topics: Hex[], data: Hex];
