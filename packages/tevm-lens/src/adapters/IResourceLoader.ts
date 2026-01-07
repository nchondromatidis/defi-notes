import type { LensArtifact, LensFunctionIndex } from '../lens/types/artifact.ts';

export interface IResourceLoader {
  getArtifact(contractFQN: string): Promise<LensArtifact>;

  getArtifacts(contractFQN: string[]): Promise<LensArtifact[]>;

  getProtocolContractsFqn(protocolName: string): Promise<string[]>;

  getProtocolArtifacts(protocolName: string): Promise<LensArtifact[]>;

  getFunctionIndexes(protocolName: string): Promise<LensFunctionIndex[]>;
}
