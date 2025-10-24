import type {
  LensArtifactsMap,
  LensContractFQN,
  LensProtocolsList,
  LensSourceFunctionIndexes,
} from '../../src/lens/artifact.ts';
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader<
  ArtifactMapT extends LensArtifactsMap<ArtifactMapT>,
  ProtocolsListT extends LensProtocolsList,
> implements IResourceLoader<ArtifactMapT, ProtocolsListT>
{
  artifactsPath = path.join(__dirname, '..', '..', '..', 'protocols', 'artifacts');
  contractFqnListFileName = 'contract-fqn-list.json';
  sourceFunctionIndexFileName = 'function-indexes.json';

  async getArtifact<LensContractFqnT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: LensContractFqnT
  ): Promise<ArtifactMapT[LensContractFqnT]> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.artifactsPath, _path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as ArtifactMapT[LensContractFqnT];
    } catch (error) {
      throw new Error(`Failed to load artifact from ${contractFQN}: ${error}`);
    }
  }

  async getArtifactPart<
    ContractFqnT extends LensContractFQN<ArtifactMapT>,
    ArtifactPartT extends keyof ArtifactMapT[ContractFqnT],
  >(contractFQN: ContractFqnT, artifactPart: ArtifactPartT): Promise<ArtifactMapT[ContractFqnT][ArtifactPartT]> {
    const artifact = await this.getArtifact(contractFQN);
    return artifact[artifactPart] as ArtifactMapT[ContractFqnT][ArtifactPartT];
  }

  async getArtifacts<LensContractFqnT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: LensContractFqnT[]
  ): Promise<Array<ArtifactMapT[LensContractFqnT]>> {
    return Promise.all(contractFQN.map((it) => this.getArtifact(it)));
  }

  async getProtocolContractsFqn(protocolName: ProtocolsListT): Promise<Array<LensContractFQN<ArtifactMapT>>> {
    const protocolListPath = path.join(this.artifactsPath, 'contracts', protocolName, this.contractFqnListFileName);
    const protocolListJson = await fs.readFile(protocolListPath, 'utf-8');
    return JSON.parse(protocolListJson) as LensContractFQN<ArtifactMapT>[];
  }

  async getProtocolArtifacts(
    protocolName: ProtocolsListT
  ): Promise<Array<ArtifactMapT[LensContractFQN<ArtifactMapT>]>> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }

  async getFunctionIndexes(protocolName: LensProtocolsList): Promise<LensSourceFunctionIndexes> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsPath,
      'contracts',
      protocolName,
      this.sourceFunctionIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as LensSourceFunctionIndexes;
  }
}
