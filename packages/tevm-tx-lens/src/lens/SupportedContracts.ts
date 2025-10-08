import type { IResourceLoader } from './IResourceLoader.ts';
import type { ContractFQN, Option } from '../common/utils.ts';
import { GenericError } from '../common/errors.ts';

export class SupportedContracts {
  constructor(private readonly resourceLoader: IResourceLoader) {}

  protected bytecodeToContractFqnIndex: Map<string, ContractFQN> = new Map();

  public async register(contractFQN: Array<ContractFQN>) {
    const fetchedArtifacts = await this.resourceLoader.getContractArtifacts(contractFQN);

    const fetchedArtifactsFilter = fetchedArtifacts.map((it) => ({
      deployedBytecode: it.deployedBytecode,
      fqn: it.sourceName as ContractFQN,
    }));
    fetchedArtifactsFilter.forEach((it) => this.bytecodeToContractFqnIndex.set(it.deployedBytecode, it.fqn));
  }

  public getContractFqnFrom(bytecode: string): Option<ContractFQN> {
    return this.bytecodeToContractFqnIndex.get(bytecode);
  }

  public async getContractArtifact(contractFQN: ContractFQN) {
    if (!this.bytecodeToContractFqnIndex.has(contractFQN)) {
      throw new GenericError('Contract not supported', { name: contractFQN });
    }
    return await this.resourceLoader.getContractArtifact(contractFQN);
  }
}
