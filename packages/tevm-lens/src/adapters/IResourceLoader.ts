import type { LensArtifactsMap, LensContractFQN, LensProtocolsList } from '../lens/artifact.ts';

export interface IResourceLoader<TMap extends LensArtifactsMap<TMap>, PList extends LensProtocolsList> {
  getArtifact<LensContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: LensContractFqnT
  ): Promise<TMap[LensContractFqnT]>;
  getArtifactPart<ContractFqnT extends LensContractFQN<TMap>, ArtifactPartT extends keyof TMap[ContractFqnT]>(
    contractFQN: ContractFqnT,
    artifactPart: ArtifactPartT
  ): Promise<TMap[ContractFqnT][ArtifactPartT]>;
  getArtifacts<LensContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: LensContractFqnT[]
  ): Promise<Array<TMap[LensContractFqnT]>>;
  getProtocolContractsFqn(protocolName: PList): Promise<Array<LensContractFQN<TMap>>>;
  getProtocolArtifacts(protocolName: PList): Promise<Array<TMap[LensContractFQN<TMap>]>>;
}
