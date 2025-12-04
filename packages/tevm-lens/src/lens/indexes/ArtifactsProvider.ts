import type { Hex, LensArtifact } from '../types/artifact.ts';
import { hardhatGetReferencesFQN } from '../../utils/hardhat.ts';
import type { Abi } from 'viem';

type Bytecode = Hex;
type ContractFQN = string;

export class ArtifactsProvider {
  protected bytecodeToContractFqnIndex: Map<Bytecode, ContractFQN> = new Map();
  protected contractFqnToArtifactIndex: Map<ContractFQN, LensArtifact> = new Map();

  // create indexes

  public async registerArtifacts(artifacts: Array<LensArtifact>) {
    artifacts.forEach((it) => {
      const contractFQN = it.sourceName + ':' + it.contractName;
      this.bytecodeToContractFqnIndex.set(it.bytecode, contractFQN);
      this.contractFqnToArtifactIndex.set(contractFQN, it);
    });
  }

  // query indexes

  public getContractFqnFromCallData(callData: Hex) {
    for (const [bytecode, contractFQN] of this.bytecodeToContractFqnIndex.entries()) {
      if (callData.startsWith(bytecode)) return { bytecode, newContractFQN: contractFQN };
    }
    return { bytecode: undefined, contractFQN: undefined };
  }

  public getArtifactFrom(contractFQN: ContractFQN): LensArtifact | undefined {
    return this.contractFqnToArtifactIndex.get(contractFQN);
  }

  public getArtifactAbi(contractFQN: ContractFQN | undefined): LensArtifact['abi'] | undefined {
    if (!contractFQN) return undefined;
    const contractArtifact = this.getArtifactFrom(contractFQN);
    return contractArtifact?.['abi'];
  }

  public getArtifactsRelatedTo(contractFQN: ContractFQN): {
    contractArtifact: LensArtifact | undefined;
    linkLibraries: { fqn: string | undefined; artifact: LensArtifact | undefined }[];
  } {
    const contractArtifact = this.contractFqnToArtifactIndex.get(contractFQN);
    const linkLibrariesFQNs = hardhatGetReferencesFQN(contractArtifact?.linkReferences);
    const linkLibraries = linkLibrariesFQNs.map((it) => ({
      fqn: it,
      artifact: this.contractFqnToArtifactIndex.get(it),
    }));
    return { contractArtifact, linkLibraries };
  }

  public getAllAbisRelatedTo(contractFQN: ContractFQN | undefined): {
    contractAbi: Abi | undefined;
    linkLibraries: { fqn: string | undefined; abi: Abi | undefined }[];
  } {
    if (!contractFQN) return { contractAbi: undefined, linkLibraries: [] };
    const { contractArtifact, linkLibraries } = this.getArtifactsRelatedTo(contractFQN);
    const linkLibrariesAbis = linkLibraries.map((it) => ({
      fqn: it.fqn,
      abi: it.artifact?.abi,
    }));
    return { contractAbi: contractArtifact?.['abi'], linkLibraries: linkLibrariesAbis };
  }
}
