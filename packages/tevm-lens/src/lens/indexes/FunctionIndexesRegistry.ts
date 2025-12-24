import type { LensFunctionIndex, LensSourceFunctionIndexes } from '../types/artifact.ts';
import { NestedMap } from '../../common/NestedMap.ts';

type FunctionNameOrKind = string;
type ContractFQN = string;
type FunctionSelector = string;
type PC = number;
type LinearizationOrderNumber = number;

export const QueryBy = {
  contractFqnAndPC: (contractFQN: ContractFQN, pc: PC) => ({ type: 'index1', contractFQN, pc }) as const,
  contractAndNameOrKind: (
    contractFQN: ContractFQN,
    name: FunctionNameOrKind,
    orKind: FunctionNameOrKind,
    linearizationOrderNumber: LinearizationOrderNumber
  ) => ({ type: 'index2', contractFQN, name, orKind, linearizationOrderNumber }) as const,
  contractAndSelector: (
    contractFQN: ContractFQN,
    functionSelector: FunctionSelector,
    linearizationOrderNumber: LinearizationOrderNumber
  ) => ({ type: 'index3', contractFQN, functionSelector, linearizationOrderNumber }) as const,
};
type Query = ReturnType<(typeof QueryBy)[keyof typeof QueryBy]>;

export class FunctionIndexesRegistry {
  protected index1 = new NestedMap<[x: ContractFQN, y: PC], LensFunctionIndex>();
  protected index2 = new NestedMap<
    [x: ContractFQN, y: FunctionNameOrKind, y: LinearizationOrderNumber],
    LensFunctionIndex
  >();
  protected index3 = new NestedMap<
    [x: ContractFQN, y: FunctionSelector, y: LinearizationOrderNumber],
    LensFunctionIndex
  >();

  public async registerFunctionIndexes(functionIndexes: LensSourceFunctionIndexes) {
    for (const fnIndex of functionIndexes) {
      // create index1
      if (fnIndex.pc) {
        this.index1.setNotDuplicate(fnIndex.contractFQN, fnIndex.pc, fnIndex);
      }

      // create index2
      this.index2.setNotDuplicate(fnIndex.contractFQN, fnIndex.nameOrKind, fnIndex.linearizationOrderNumber, fnIndex);

      // create index3
      if (fnIndex.functionSelector) {
        this.index3.setNotDuplicate(
          fnIndex.contractFQN,
          fnIndex.functionSelector,
          fnIndex.linearizationOrderNumber,
          fnIndex
        );
      }
    }
  }

  public getBy(query: ReturnType<typeof QueryBy.contractFqnAndPC>): LensFunctionIndex | undefined;
  public getBy(query: ReturnType<typeof QueryBy.contractAndSelector>): LensFunctionIndex | undefined;
  public getBy(query: ReturnType<typeof QueryBy.contractAndNameOrKind>): LensFunctionIndex | undefined;
  public getBy(query: Query): LensFunctionIndex | LensFunctionIndex[] | undefined {
    if (query.type === 'index1') {
      return this.index1.get(query.contractFQN, query.pc);
    }
    if (query.type === 'index2') {
      const functionNameOrKind = query.name != '' ? query.name : query.orKind;
      return this.index2.get(query.contractFQN, functionNameOrKind, query.linearizationOrderNumber);
    }
    if (query.type === 'index3') {
      return this.index3.get(query.contractFQN, query.functionSelector, query.linearizationOrderNumber);
    }
    return undefined;
  }
}
