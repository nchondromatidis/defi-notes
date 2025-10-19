import type { LensArtifactsMap, LensContractFQN, LensProtocolsList } from '../../src/lens/artifact.ts';
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader<TMap extends LensArtifactsMap<TMap>, PList extends LensProtocolsList>
  implements IResourceLoader<TMap, PList>
{
  constructor(private readonly artifactsPath: string) {}

  async getArtifact<LensContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: LensContractFqnT
  ): Promise<TMap[LensContractFqnT]> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.artifactsPath, _path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as TMap[LensContractFqnT];
    } catch (error) {
      throw new Error(`Failed to load artifact from ${contractFQN}: ${error}`);
    }
  }

  async getArtifactPart<ContractFqnT extends LensContractFQN<TMap>, ArtifactPartT extends keyof TMap[ContractFqnT]>(
    contractFQN: ContractFqnT,
    artifactPart: ArtifactPartT
  ): Promise<TMap[ContractFqnT][ArtifactPartT]> {
    const artifact = await this.getArtifact(contractFQN);
    return artifact[artifactPart] as TMap[ContractFqnT][ArtifactPartT];
  }

  async getArtifacts<LensContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: LensContractFqnT[]
  ): Promise<Array<TMap[LensContractFqnT]>> {
    return Promise.all(contractFQN.map((it) => this.getArtifact(it)));
  }

  async getProtocolContractsFqn(protocolName: PList): Promise<Array<LensContractFQN<TMap>>> {
    const protocolListPath = path.join(this.artifactsPath, 'contracts', protocolName, 'contract-fqn-list.json');
    const protocolListJson = await fs.readFile(protocolListPath, 'utf-8');
    return JSON.parse(protocolListJson) as LensContractFQN<TMap>[];
  }

  async getProtocolArtifacts(protocolName: PList): Promise<Array<TMap[LensContractFQN<TMap>]>> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }
}
