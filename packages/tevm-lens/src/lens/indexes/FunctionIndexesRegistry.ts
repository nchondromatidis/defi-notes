import type { LensFunctionIndex } from '../types.ts';
import { NestedMap } from '../_common/NestedMap.ts';

export const QueryBy = {
  contractAndNameOrKind: (contractFQN: string, name: string, orKind: string) =>
    ({ type: 'index1', contractFQN, name, orKind }) as const,
  contractAndSelector: (contractFQN: string, functionSelector: string) =>
    ({ type: 'index2', contractFQN, functionSelector }) as const,
};
type Query = ReturnType<(typeof QueryBy)[keyof typeof QueryBy]>;

export class FunctionIndexesRegistry {
  protected index1 = new NestedMap<[contractFQN: string, functionNameOrKind: string], LensFunctionIndex>();
  protected index2 = new NestedMap<[contractFQN: string, functionSelector: string], LensFunctionIndex>();

  public async register(functionIndexes: LensFunctionIndex[]) {
    for (const fnIndex of functionIndexes) {
      // create index2
      this.index1.set(fnIndex.contractFQN, fnIndex.nameOrKind, fnIndex);

      // create index3
      if (fnIndex.selector) {
        this.index2.set(fnIndex.contractFQN, fnIndex.selector, fnIndex);
      }
    }
  }

  public getBy(query: ReturnType<typeof QueryBy.contractAndSelector>): LensFunctionIndex | undefined;
  public getBy(query: ReturnType<typeof QueryBy.contractAndNameOrKind>): LensFunctionIndex | undefined;
  public getBy(query: Query): LensFunctionIndex | LensFunctionIndex[] | undefined {
    if (query.type === 'index1') {
      const functionNameOrKind = query.name != '' ? query.name : query.orKind;
      return this.index1.get(query.contractFQN, functionNameOrKind);
    }
    if (query.type === 'index2') {
      return this.index2.get(query.contractFQN, query.functionSelector);
    }
    return undefined;
  }
}
