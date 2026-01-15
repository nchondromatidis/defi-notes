import type { LensArtifact, LensFunctionIndex, LensPcLocationIndex } from '../../src/lens/types.ts';
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader implements IResourceLoader {
  artifactsPath = path.join(__dirname, 'artifacts');
  artifactsContractsPath;
  contractFqnListFileName = 'contract-fqn-list.json';
  sourceFunctionIndexFileName = 'function-indexes.json';
  pcLocationsIndexFileName = 'pc-locations-indexes.json';

  constructor(root: string) {
    this.artifactsContractsPath = path.join(__dirname, 'artifacts', root);
  }

  async getArtifact(contractFQN: string): Promise<LensArtifact> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.artifactsPath, _path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as LensArtifact;
    } catch (error) {
      throw new Error(`Failed to load artifact from ${contractFQN}: ${error}`);
    }
  }

  async getArtifacts(contractFQN: string[]): Promise<LensArtifact[]> {
    return Promise.all(contractFQN.map((it) => this.getArtifact(it)));
  }

  async getProtocolContractsFqn(protocolName: string): Promise<string[]> {
    const protocolListPath = path.join(this.artifactsContractsPath, protocolName, this.contractFqnListFileName);
    const protocolListJson = await fs.readFile(protocolListPath, 'utf-8');
    return JSON.parse(protocolListJson) as string[];
  }

  async getProtocolArtifacts(protocolName: string): Promise<LensArtifact[]> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }

  async getFunctionIndexes(protocolName: string): Promise<LensFunctionIndex[]> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsContractsPath,
      protocolName,
      this.sourceFunctionIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as LensFunctionIndex[];
  }

  async getPcLocationIndexes(protocolName: string): Promise<LensPcLocationIndex[]> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsContractsPath,
      protocolName,
      this.pcLocationsIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as LensPcLocationIndex[];
  }
}
