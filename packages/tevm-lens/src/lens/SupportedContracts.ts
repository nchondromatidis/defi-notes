import { GenericError } from '../common/errors.ts';
import type { LensArtifactsMap, LensContractFQN, LensSourceFunctionIndexes } from './artifact.ts';

type Bytecode = string;
type FunctionName = string;
type Source = string;
type Location = { lineStart: number; lineEnd: number; source: string };

export class SupportedContracts<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  constructor() {}

  protected bytecodeToContractFqnIndex: Map<Bytecode, LensContractFQN<ArtifactMapT>> = new Map();
  protected contractFqnToArtifactIndex: Map<
    LensContractFQN<ArtifactMapT>,
    ArtifactMapT[LensContractFQN<ArtifactMapT>]
  > = new Map();
  protected sourceFunctionIndexes: Map<Source, Map<FunctionName, LensSourceFunctionIndexes[string][number]>> =
    new Map();

  // create indexes

  public async registerArtifacts(artifacts: Array<ArtifactMapT[LensContractFQN<ArtifactMapT>]>) {
    artifacts.forEach((it) => {
      const contractFQN = (it.sourceName + ':' + it.contractName) as LensContractFQN<ArtifactMapT>;
      this.bytecodeToContractFqnIndex.set(it.bytecode, contractFQN);
      this.contractFqnToArtifactIndex.set(contractFQN, it);
    });
  }

  public async registerFunctionIndexes(artifacts: LensSourceFunctionIndexes) {
    for (const [source, functionIndexes] of Object.entries(artifacts)) {
      const sourceFunctionIndexes: Map<FunctionName, LensSourceFunctionIndexes[string][number]> = new Map();
      this.sourceFunctionIndexes.set(source, sourceFunctionIndexes);
      for (const functionIndex of functionIndexes) {
        sourceFunctionIndexes.set(functionIndex.name, functionIndex);
      }
    }
  }

  // query indexes

  public getContractFqnFromBytecode(bytecode: string) {
    return this.bytecodeToContractFqnIndex.get(bytecode);
  }

  public getArtifactFrom<ContractFqnT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: ContractFqnT
  ): ArtifactMapT[ContractFqnT] {
    if (!this.contractFqnToArtifactIndex.has(contractFQN)) {
      throw new GenericError('Contract not supported', { name: contractFQN });
    }
    return this.contractFqnToArtifactIndex.get(contractFQN)! as ArtifactMapT[ContractFqnT];
  }

  public getArtifactPart<
    ContractFqnT extends LensContractFQN<ArtifactMapT>,
    ArtifactPartT extends keyof ArtifactMapT[ContractFqnT],
  >(contractFQN: ContractFqnT, artifactPart: ArtifactPartT): ArtifactMapT[ContractFqnT][ArtifactPartT] {
    const artifact = this.getArtifactFrom(contractFQN);
    return artifact[artifactPart];
  }

  public getFunctionLocation(contractFQN: LensContractFQN<ArtifactMapT>, functionName: string): Location | undefined {
    const source = contractFQN.split(':')[0];
    const { lineStart, lineEnd } = this.sourceFunctionIndexes.get(source)?.get(functionName) ?? {};
    return lineStart !== undefined && lineEnd !== undefined ? { lineStart, lineEnd, source } : undefined;
  }
}
