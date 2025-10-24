import type {
  LensArtifactsMap,
  LensContractFQN,
  LensProtocolsList,
  LensSourceFunctionIndexes,
} from '../lens/artifact.ts';

export interface IResourceLoader<
  ArtifactMapT extends LensArtifactsMap<ArtifactMapT>,
  ProtocolsListT extends LensProtocolsList,
> {
  getArtifact<LensContractFqnT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: LensContractFqnT
  ): Promise<ArtifactMapT[LensContractFqnT]>;
  getArtifactPart<
    ContractFqnT extends LensContractFQN<ArtifactMapT>,
    ArtifactPartT extends keyof ArtifactMapT[ContractFqnT],
  >(
    contractFQN: ContractFqnT,
    artifactPart: ArtifactPartT
  ): Promise<ArtifactMapT[ContractFqnT][ArtifactPartT]>;
  getArtifacts<LensContractFqnT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: LensContractFqnT[]
  ): Promise<Array<ArtifactMapT[LensContractFqnT]>>;
  getProtocolContractsFqn(protocolName: ProtocolsListT): Promise<Array<LensContractFQN<ArtifactMapT>>>;
  getProtocolArtifacts(protocolName: ProtocolsListT): Promise<Array<ArtifactMapT[LensContractFQN<ArtifactMapT>]>>;
  getFunctionIndexes(protocolName: ProtocolsListT): Promise<LensSourceFunctionIndexes>;
}
