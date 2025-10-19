import type { LensArtifactsMap, LensContractFQN, ProtocolsContractsMapD } from '../lens/artifact.ts';

export interface IResourceLoader<TMap extends LensArtifactsMap<TMap>> {
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
  getProtocolContractsFqn(protocolName: keyof ProtocolsContractsMapD): Promise<Array<LensContractFQN<TMap>>>;
  getProtocolArtifacts(protocolName: keyof ProtocolsContractsMapD): Promise<Array<TMap[LensContractFQN<TMap>]>>;
}
