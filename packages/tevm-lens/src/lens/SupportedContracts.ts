import { GenericError } from '../common/errors.ts';
import type { LensArtifactsMap, LensContractFQN } from './artifact.ts';

export class SupportedContracts<TMap extends LensArtifactsMap<TMap>> {
  constructor() {}

  protected bytecodeToContractFqnIndex: Map<string, LensContractFQN<TMap>> = new Map();
  protected contractFqnToArtifactIndex: Map<LensContractFQN<TMap>, TMap[LensContractFQN<TMap>]> = new Map();

  public async registerArtifacts(artifacts: Array<TMap[LensContractFQN<TMap>]>) {
    artifacts.forEach((it) => {
      const contractFQN = (it.sourceName + ':' + it.contractName) as LensContractFQN<TMap>;
      this.bytecodeToContractFqnIndex.set(it.bytecode, contractFQN);
      this.contractFqnToArtifactIndex.set(contractFQN, it);
    });
  }

  public async registerContractSources() {}

  public async getContractFqnFromBytecode(bytecode: string) {
    return this.bytecodeToContractFqnIndex.get(bytecode);
  }

  public async getArtifactFrom<ContractFqnT extends LensContractFQN<TMap>>(
    contractFQN: ContractFqnT
  ): Promise<TMap[ContractFqnT]> {
    if (!this.contractFqnToArtifactIndex.has(contractFQN)) {
      throw new GenericError('Contract not supported', { name: contractFQN });
    }
    return this.contractFqnToArtifactIndex.get(contractFQN)! as TMap[ContractFqnT];
  }

  public async getArtifactPart<
    ContractFqnT extends LensContractFQN<TMap>,
    ArtifactPartT extends keyof TMap[ContractFqnT],
  >(contractFQN: ContractFqnT, artifactPart: ArtifactPartT): Promise<TMap[ContractFqnT][ArtifactPartT]> {
    const artifact = await this.getArtifactFrom(contractFQN);
    return artifact[artifactPart];
  }
}
