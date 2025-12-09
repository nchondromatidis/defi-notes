import type { LensArtifactsMap, LensProjects, LensSourceFunctionIndexes } from '../../src/lens/types/artifact.ts';
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader<
  ArtifactMapT extends object,
  ProjectsT extends LensProjects,
  ProjectT extends ProjectsT,
  RootT extends string,
  FunctionIndexesT extends LensSourceFunctionIndexes,
  LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT, ProjectsT, ProjectT, RootT> = LensArtifactsMap<
    ArtifactMapT,
    ProjectsT,
    ProjectT,
    RootT
  >,
> implements IResourceLoader<ArtifactMapT, ProjectsT, ProjectT, FunctionIndexesT, RootT, LensArtifactsMapT>
{
  artifactsPath = path.join(__dirname, 'artifacts');
  artifactsContractsPath;
  contractFqnListFileName = 'contract-fqn-list.json';
  sourceFunctionIndexFileName = 'function-indexes.json';

  constructor(root: string) {
    this.artifactsContractsPath = path.join(__dirname, 'artifacts', root);
  }

  async getArtifact<LensContractFqnT extends keyof LensArtifactsMapT & string>(
    contractFQN: LensContractFqnT
  ): Promise<LensArtifactsMapT[LensContractFqnT]> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.artifactsPath, _path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as LensArtifactsMapT[LensContractFqnT];
    } catch (error) {
      throw new Error(`Failed to load artifact from ${contractFQN}: ${error}`);
    }
  }

  async getArtifacts<LensContractFqnT extends keyof LensArtifactsMapT & string>(
    contractFQN: LensContractFqnT[]
  ): Promise<LensArtifactsMapT[LensContractFqnT][]> {
    return Promise.all(contractFQN.map((it) => this.getArtifact(it)));
  }

  async getArtifactPart<
    ContractFqnT extends keyof LensArtifactsMapT & string,
    ArtifactPartT extends keyof LensArtifactsMapT[ContractFqnT],
  >(contractFQN: ContractFqnT, artifactPart: ArtifactPartT): Promise<LensArtifactsMapT[ContractFqnT][ArtifactPartT]> {
    const artifact = await this.getArtifact(contractFQN);
    return artifact[artifactPart] as LensArtifactsMapT[ContractFqnT][ArtifactPartT];
  }

  async getProtocolContractsFqn(protocolName: ProjectsT): Promise<Array<keyof LensArtifactsMapT & string>> {
    const protocolListPath = path.join(this.artifactsContractsPath, protocolName, this.contractFqnListFileName);
    const protocolListJson = await fs.readFile(protocolListPath, 'utf-8');
    return JSON.parse(protocolListJson) as Array<keyof LensArtifactsMapT & string>;
  }

  async getProtocolArtifacts(
    protocolName: ProjectsT
  ): Promise<Array<LensArtifactsMapT[keyof LensArtifactsMapT & string]>> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }

  async getFunctionIndexes(protocolName: LensProjects): Promise<FunctionIndexesT> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsContractsPath,
      protocolName,
      this.sourceFunctionIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as FunctionIndexesT;
  }
}
