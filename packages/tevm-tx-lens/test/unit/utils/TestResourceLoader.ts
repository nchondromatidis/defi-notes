import type { ContractFQN } from '../../../src/common/utils.ts';
import type { ProtocolArtifact } from '@defi-notes/protocols/types';
import { promises as fs } from 'fs';
import type { IResourceLoader } from '../../../src/lens/IResourceLoader.ts';
import * as path from 'node:path';

export class TestResourceLoader implements IResourceLoader {
  constructor(private readonly basePath: string) {}

  async getContractArtifact(contractFQN: ContractFQN): Promise<ProtocolArtifact> {
    try {
      const _path = contractFQN.replace(':', '/') + '.json';
      const fullPath = path.join(this.basePath, _path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as ProtocolArtifact;
    } catch (error) {
      throw new Error(`Failed to load artifact from ${contractFQN}: ${error}`);
    }
  }

  async getContractArtifacts(contractFQN: ContractFQN[]): Promise<ProtocolArtifact[]> {
    return Promise.all(contractFQN.map((it) => this.getContractArtifact(it)));
  }
}
