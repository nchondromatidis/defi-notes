import type { FunctionCallTypes, LensFunctionIndex, LensSourceFunctionIndexes } from '../types/artifact.ts';
import { InvariantError } from '../../common/errors.ts';

type FunctionNameOrKind = string;
type ContractFQN = string;

export class FunctionIndexesRegistry {
  protected index1: Map<ContractFQN, Array<LensFunctionIndex>> = new Map();
  protected index2: Map<ContractFQN, Map<FunctionNameOrKind, LensFunctionIndex>> = new Map();

  public async registerFunctionIndexes(functionIndexes: LensSourceFunctionIndexes) {
    for (const fnIndex of functionIndexes) {
      // index1
      if (!this.index1.get(fnIndex.contractFQN)) this.index1.set(fnIndex.contractFQN, []);
      this.index1.get(fnIndex.contractFQN)!.push(fnIndex);

      // index2
      if (!this.index2.get(fnIndex.contractFQN)) this.index2.set(fnIndex.contractFQN, new Map());
      if (this.index2.get(fnIndex.contractFQN)!.has(fnIndex.name)) {
        throw new InvariantError('Two function indexes per contractFQN/function_name', {
          contractFQN: fnIndex.contractFQN,
          functionNameOrKind: fnIndex.nameOrKind,
        });
      }
      this.index2.get(fnIndex.contractFQN)!.set(fnIndex.nameOrKind, fnIndex);
    }
  }

  public getFunctionDataBy(contractFQN: ContractFQN, functionName: string, type: FunctionCallTypes) {
    const functionNameOrKind = functionName ? functionName : type;
    return this.index2.get(contractFQN)?.get(functionNameOrKind);
  }
}
