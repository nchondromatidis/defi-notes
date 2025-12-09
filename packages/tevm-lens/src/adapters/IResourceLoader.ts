import type { LensArtifactsMap, LensProjects, LensSourceFunctionIndexes } from '../lens/types/artifact.ts';

export interface IResourceLoader<
  ArtifactMapT extends object,
  ProjectsT extends LensProjects,
  ProjectT extends ProjectsT,
  FunctionIndexesT extends LensSourceFunctionIndexes,
  RootT extends string,
  LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT, ProjectsT, ProjectT, RootT>,
> {
  getArtifact<LensContractFqnT extends keyof LensArtifactsMapT & string>(
    contractFQN: LensContractFqnT
  ): Promise<LensArtifactsMapT[LensContractFqnT]>;

  getArtifacts<LensContractFqnT extends keyof LensArtifactsMapT & string>(
    contractFQN: LensContractFqnT[]
  ): Promise<LensArtifactsMapT[LensContractFqnT][]>;

  getArtifactPart<
    ContractFqnT extends keyof LensArtifactsMapT & string,
    ArtifactPartT extends keyof LensArtifactsMapT[ContractFqnT],
  >(
    contractFQN: ContractFqnT,
    artifactPart: ArtifactPartT
  ): Promise<LensArtifactsMapT[ContractFqnT][ArtifactPartT]>;

  getProtocolContractsFqn(protocolName: ProjectsT): Promise<Array<keyof LensArtifactsMapT & string>>;

  getProtocolArtifacts(protocolName: ProjectsT): Promise<Array<LensArtifactsMapT[keyof LensArtifactsMapT & string]>>;

  getFunctionIndexes(protocolName: ProjectsT): Promise<FunctionIndexesT>;
}
