import type { LensArtifact, LensFunctionIndex, LensPcLocationIndex } from '../lens/types.ts';

export interface IResourceLoader {
  getArtifact(contractFQN: string): Promise<LensArtifact>;

  getArtifacts(contractFQN: string[]): Promise<LensArtifact[]>;

  getProtocolContractsFqn(protocolName: string): Promise<string[]>;

  getProtocolArtifacts(protocolName: string): Promise<LensArtifact[]>;

  getFunctionIndexes(protocolName: string): Promise<LensFunctionIndex[]>;

  getPcLocationIndexes(protocolName: string): Promise<LensPcLocationIndex[]>;
}
