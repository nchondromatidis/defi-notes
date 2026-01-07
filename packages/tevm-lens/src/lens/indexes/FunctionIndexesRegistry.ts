import type { LensFunctionIndex } from '../types/artifact.ts';
import { NestedMap } from '../../common/NestedMap.ts';

export const QueryBy = {
  contractFqnAndPC: (contractFQN: string, pc: number) => ({ type: 'index1', contractFQN, pc }) as const,
  contractAndNameOrKind: (contractFQN: string, name: string, orKind: string, linearizationOrderNumber: number) =>
    ({ type: 'index2', contractFQN, name, orKind, linearizationOrderNumber }) as const,
  contractAndSelector: (contractFQN: string, functionSelector: string, linearizationOrderNumber: number) =>
    ({ type: 'index3', contractFQN, functionSelector, linearizationOrderNumber }) as const,
};
type Query = ReturnType<(typeof QueryBy)[keyof typeof QueryBy]>;

export class FunctionIndexesRegistry {
  protected index1 = new NestedMap<[contractFQN: string, pc: number], LensFunctionIndex>();
  protected index2 = new NestedMap<
    [contractFQN: string, functionNameOrKind: string, linearizationOrderNumber: number],
    LensFunctionIndex
  >();
  protected index3 = new NestedMap<
    [contractFQN: string, functionSelector: string, linearizationOrderNumber: number],
    LensFunctionIndex
  >();

  public async registerFunctionIndexes(functionIndexes: LensFunctionIndex[]) {
    for (const fnIndex of functionIndexes) {
      // create index1
      if (fnIndex.jumpDestPc) {
        this.index1.setNotDuplicate(fnIndex.contractFQN, fnIndex.jumpDestPc, fnIndex);
      }

      // create index2
      this.index2.setNotDuplicate(fnIndex.contractFQN, fnIndex.nameOrKind, fnIndex.linearizationOrderNumber, fnIndex);

      // create index3
      if (fnIndex.selector) {
        this.index3.setNotDuplicate(fnIndex.contractFQN, fnIndex.selector, fnIndex.linearizationOrderNumber, fnIndex);
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
