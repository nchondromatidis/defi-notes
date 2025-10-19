import type { ProtocolsContractsMapD, LensArtifactsMap, LensContractFQN } from '../../src/lens/artifact.ts';
import { protocolsContractsMap } from '../../src/lens/artifact.ts' with { type: 'json' };
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader<TMap extends LensArtifactsMap<TMap>> implements IResourceLoader<TMap> {
  constructor(private readonly basePath: string) {}

  async getArtifact<LensContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: LensContractFqnT
  ): Promise<TMap[LensContractFqnT]> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.basePath, _path);
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

  async getProtocolContractsFqn(protocolName: keyof ProtocolsContractsMapD): Promise<Array<LensContractFQN<TMap>>> {
    const protocolContractsMaps = protocolsContractsMap as ProtocolsContractsMapD;
    return protocolContractsMaps[protocolName] as LensContractFQN<TMap>[];
  }

  async getProtocolArtifacts(protocolName: keyof ProtocolsContractsMapD): Promise<Array<TMap[LensContractFQN<TMap>]>> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }
}
