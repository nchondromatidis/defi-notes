import type { LensFunctionIndex, LensSourceFunctionIndexes } from '../types/artifact.ts';
import { InvariantError } from '../../common/errors.ts';

type FunctionNameOrKind = string;
type ContractFQN = string;
type FunctionSelector = string;

export const QueryBy = {
  selector: (selector: FunctionSelector) => ({ type: 'index1', selector }) as const,
  contractAndName: (contractFQN: ContractFQN, name: FunctionNameOrKind, orKind: FunctionNameOrKind) =>
    ({ type: 'index2', contractFQN, name, orKind }) as const,
  contract: (contractFQN: ContractFQN) => ({ type: 'index3', contractFQN }) as const,
};
type Query = ReturnType<(typeof QueryBy)[keyof typeof QueryBy]>;

export class FunctionIndexesRegistry {
  protected index1: Map<ContractFQN, Array<LensFunctionIndex>> = new Map();
  protected index2: Map<ContractFQN, Map<FunctionNameOrKind, LensFunctionIndex>> = new Map();
  protected index3: Map<FunctionSelector, LensFunctionIndex> = new Map();

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

      // index3
      if (fnIndex.functionSelector) this.index3.set(fnIndex.functionSelector, fnIndex);
    }
  }

  public getBy(query: ReturnType<typeof QueryBy.contract>): LensFunctionIndex[] | undefined;
  public getBy(query: ReturnType<typeof QueryBy.contractAndName>): LensFunctionIndex | undefined;
  public getBy(query: ReturnType<typeof QueryBy.selector>): LensFunctionIndex | undefined;
  public getBy(query: Query): LensFunctionIndex | LensFunctionIndex[] | undefined {
    if (query.type === 'index1') return this.index3.get(query.selector);
    if (query.type === 'index2') {
      const functionNameOrKind = query.name != '' ? query.name : query.orKind;
      return this.index2.get(query.contractFQN)?.get(functionNameOrKind);
    }
    if (query.type === 'index3') return this.index1.get(query.contractFQN);
    return undefined;
  }
}
