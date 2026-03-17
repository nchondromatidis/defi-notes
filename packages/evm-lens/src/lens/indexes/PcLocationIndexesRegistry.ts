import type { LensFunctionIndex, LensPcLocationIndex, PcLocationReadable } from '../types.ts';
import { NestedMap } from '../../_common/NestedMap.ts';

export class PcLocationIndexesRegistry {
  protected contractFunctions = new NestedMap<[contractFQN: string], LensFunctionIndex[]>();
  protected contractOpcodes = new NestedMap<
    [contractFQN: string, pc: number],
    LensPcLocationIndex['pcLocations'][number]
  >();
  protected contractLocationSources = new NestedMap<[contractFQN: string, locationSourceIndex: number], string>();

  // manage

  public async register(lensFunctionIndexes: LensFunctionIndex[], pcLocationIndexes: LensPcLocationIndex[]) {
    // contractFunctions index
    const functionsPerSource = new Map<string, LensFunctionIndex[]>();
    for (const lensFunctionIndex of lensFunctionIndexes) {
      const existingFunctions = functionsPerSource.get(lensFunctionIndex.source) ?? [];
      existingFunctions.push(lensFunctionIndex);
      functionsPerSource.set(lensFunctionIndex.source, existingFunctions);
    }

    for (const pcLocationIndex of pcLocationIndexes) {
      const contractFQNFunctions: LensFunctionIndex[] = [];
      for (const locationSource of pcLocationIndex.locationSources) {
        contractFQNFunctions.push(...(functionsPerSource.get(locationSource) ?? []));
      }
      this.contractFunctions.set(pcLocationIndex.contractFQN, contractFQNFunctions);
    }

    // contractOpcodes index
    for (const pcLocationIndex of pcLocationIndexes) {
      for (const pcLocation of pcLocationIndex.pcLocations) {
        this.contractOpcodes.set(pcLocationIndex.contractFQN, pcLocation[0], pcLocation);
      }
    }

    // contractLocationSources index
    for (const pcLocationIndex of pcLocationIndexes) {
      for (const [index, locationSource] of pcLocationIndex.locationSources.entries()) {
        this.contractLocationSources.set(pcLocationIndex.contractFQN, index, locationSource);
      }
    }
  }

  reset() {
    this.contractFunctions.clear();
    this.contractOpcodes.clear();
    this.contractLocationSources.clear();
  }

  // query

  public getFunctionIndex(contractFQN: string, pc: number): LensFunctionIndex | undefined {
    const pcLocationIndex = this.getPcLocationIndex(contractFQN, pc);
    if (!pcLocationIndex) return undefined;
    const { startLine, sourceName } = pcLocationIndex;

    const contractFunctions = this.contractFunctions.get(contractFQN);
    if (!contractFunctions) return undefined;

    return contractFunctions.find((it) => {
      return it.source == sourceName && startLine >= it.functionLineStart && startLine <= it.functionLineEnd;
    });
  }

  public getPcLocationIndex(contractFQN: string, pc: number): PcLocationReadable | undefined {
    const pcLocation = this.contractOpcodes.get(contractFQN, pc);
    if (!pcLocation) return undefined;

    const sourceIndex = pcLocation[2][2];
    const sourceName = this.contractLocationSources.get(contractFQN, sourceIndex);
    if (!sourceName) return undefined;

    return {
      pc: pcLocation[0],
      OpcodeName: pcLocation[3],
      jumpType: pcLocation[1],
      startLine: pcLocation[2][0],
      endLine: pcLocation[2][1],
      sourceName: sourceName,
    };
  }
}
