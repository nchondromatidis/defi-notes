import type { LensFunctionIndex, LensSourceFunctionIndexes } from '../types/artifact.ts';
import { InvariantError } from '../../common/errors.ts';

type FunctionNameOrKind = string;
type ContractFQN = string;
type FunctionSelector = string;

export const QueryBy = {
  contractAndNameOrKind: (contractFQN: ContractFQN, name: FunctionNameOrKind, orKind: FunctionNameOrKind) =>
    ({ type: 'index2', contractFQN, name, orKind }) as const,
  contractAndSelector: (contractFQN: ContractFQN, functionSelector: FunctionSelector) =>
    ({ type: 'index3', contractFQN, functionSelector }) as const,
};
type Query = ReturnType<(typeof QueryBy)[keyof typeof QueryBy]>;

export class FunctionIndexesRegistry {
  protected index2: Map<ContractFQN, Map<FunctionNameOrKind, LensFunctionIndex>> = new Map();
  protected index3: Map<FunctionSelector, Map<FunctionSelector, LensFunctionIndex>> = new Map();

  public async registerFunctionIndexes(functionIndexes: LensSourceFunctionIndexes) {
    for (const fnIndex of functionIndexes) {
      // index2
      if (!this.index2.get(fnIndex.contractFQN)) this.index2.set(fnIndex.contractFQN, new Map());
      if (this.index2.get(fnIndex.contractFQN)!.has(fnIndex.name)) {
        throw new InvariantError('Two same function names per contractFQN', {
          contractFQN: fnIndex.contractFQN,
          functionNameOrKind: fnIndex.nameOrKind,
        });
      }
      this.index2.get(fnIndex.contractFQN)!.set(fnIndex.nameOrKind, fnIndex);

      // index3
      if (!this.index3.get(fnIndex.contractFQN)) this.index3.set(fnIndex.contractFQN, new Map());
      if (fnIndex.functionSelector) {
        if (this.index3.get(fnIndex.contractFQN)!.has(fnIndex.functionSelector)) {
          throw new InvariantError('Two same function selectors per contractFQN/function_name', {
            contractFQN: fnIndex.contractFQN,
            functionNameOrKind: fnIndex.nameOrKind,
            selector: fnIndex.functionSelector,
          });
        }
        this.index3.get(fnIndex.contractFQN)!.set(fnIndex.functionSelector, fnIndex);
      }
    }
  }

  public getBy(query: ReturnType<typeof QueryBy.contractAndSelector>): LensFunctionIndex | undefined;
  public getBy(query: ReturnType<typeof QueryBy.contractAndNameOrKind>): LensFunctionIndex | undefined;
  public getBy(query: Query): LensFunctionIndex | LensFunctionIndex[] | undefined {
    if (query.type === 'index2') {
      const functionNameOrKind = query.name != '' ? query.name : query.orKind;
      return this.index2.get(query.contractFQN)?.get(functionNameOrKind);
    }
    if (query.type === 'index3') return this.index3.get(query.contractFQN)?.get(query.functionSelector);
    return undefined;
  }
}
