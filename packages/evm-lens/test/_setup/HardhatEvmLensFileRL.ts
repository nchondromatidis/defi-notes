import type { LensArtifact, LensFunctionIndex, LensPcLocationIndex } from '../../src/lens/types.ts';
import { promises as fs } from 'fs';
import path from 'node:path';
import { BaseHardhatEvmLensRL } from '../../src/adapters/resource-loader/BaseHardhatEvmLensRL.ts';

export const TEST_RESOURCES_PATH = path.join(__dirname);
export const PROTOCOLS_RESOURCES_PATH = path.join(__dirname, '..', '..', '..', 'protocols');

export class HardhatEvmLensFileRL extends BaseHardhatEvmLensRL {
  constructor(
    protected resourcesUri: string,
    contractsFolder: string
  ) {
    super();
    this.artifactsUri = path.join(this.resourcesUri, 'artifacts');
    this.artifactsContractUri = path.join(this.artifactsUri, contractsFolder);
  }

  async getProtocols(): Promise<string[]> {
    const protocolsListPath = path.join(this.artifactsUri, this.protocolsListFileName);
    const protocolListJson = await fs.readFile(protocolsListPath, 'utf-8');
    return JSON.parse(protocolListJson) as string[];
  }

  async getSource(contractFqnOrUserSource: string): Promise<string> {
    const userSourceFileName = contractFqnOrUserSource.split(':')[0];
    const userSourcePath = path.join(this.resourcesUri, userSourceFileName);
    return await fs.readFile(userSourcePath, 'utf-8');
  }

  async getArtifact(contractFQN: string): Promise<LensArtifact> {
    const _path = contractFQN.replace(':', '/') + '.json';
    const fullPath = path.join(this.artifactsUri, _path);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content) as LensArtifact;
  }

  async getArtifacts(contractFQN: string[]): Promise<LensArtifact[]> {
    return Promise.all(contractFQN.map((it) => this.getArtifact(it)));
  }

  async getProtocolContractsFqn(protocolName: string): Promise<string[]> {
    const protocolListPath = path.join(this.artifactsContractUri, protocolName, this.contractFqnListFileName);
    const protocolListJson = await fs.readFile(protocolListPath, 'utf-8');
    return JSON.parse(protocolListJson) as string[];
  }

  async getProtocolArtifacts(protocolName: string): Promise<LensArtifact[]> {
    const protocolContracts = await this.getProtocolContractsFqn(protocolName);
    return this.getArtifacts(protocolContracts);
  }

  async getFunctionIndexes(protocolName: string): Promise<LensFunctionIndex[]> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsContractUri,
      protocolName,
      this.sourceFunctionIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as LensFunctionIndex[];
  }

  async getPcLocationIndexes(protocolName: string): Promise<LensPcLocationIndex[]> {
    const sourceFunctionIndexFilePath = path.join(
      this.artifactsContractUri,
      protocolName,
      this.pcLocationsIndexFileName
    );
    const sourceFunctionIndexJson = await fs.readFile(sourceFunctionIndexFilePath, 'utf-8');
    return JSON.parse(sourceFunctionIndexJson) as LensPcLocationIndex[];
  }
}
