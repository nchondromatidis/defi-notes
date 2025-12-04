import type { FunctionCallTypes, LensSourceFunctionIndexes } from '../types/artifact.ts';

type FunctionName = string;
type Source = string;
type ContractFQN = string;

type Location = { lineStart: number; lineEnd: number; source: string };

export class FunctionIndexesRegistry {
  protected sourceFunctionNameFunctionIndexes: Map<
    Source,
    Map<FunctionName, LensSourceFunctionIndexes[string][number]>
  > = new Map();
  protected sourceFunctionIndexes: Map<Source, LensSourceFunctionIndexes[string]> = new Map();

  public async registerFunctionIndexes(artifacts: LensSourceFunctionIndexes) {
    for (const [contractFQN, functionIndexes] of Object.entries(artifacts)) {
      this.sourceFunctionIndexes.set(contractFQN, functionIndexes);
      const sourceFunctionIndexes: Map<FunctionName, LensSourceFunctionIndexes[string][number]> = new Map();
      this.sourceFunctionNameFunctionIndexes.set(contractFQN, sourceFunctionIndexes);
      for (const functionIndex of functionIndexes) {
        sourceFunctionIndexes.set(functionIndex.name, functionIndex);
      }
    }
  }

  // query

  public getAbiFunctionNameLocation(contractFQN: ContractFQN, functionName: string): Location | undefined {
    const { lineStart, lineEnd, source } =
      this.sourceFunctionNameFunctionIndexes.get(contractFQN)?.get(functionName) ?? {};
    return lineStart !== undefined && lineEnd !== undefined && source !== undefined
      ? { lineStart, lineEnd, source }
      : undefined;
  }

  public getAbiTypeLocation(contractFQN: ContractFQN, type: FunctionCallTypes): Location | undefined {
    const sourceFunctionIndexes = this.sourceFunctionIndexes.get(contractFQN) ?? [];
    const functionIndex = sourceFunctionIndexes.find((it) => it.kind === type);
    if (!functionIndex) return undefined;
    return {
      lineStart: functionIndex.lineStart,
      lineEnd: functionIndex.lineEnd,
      source: functionIndex.source,
    };
  }
  public getFunctionCallLocation(
    contractFQN: ContractFQN,
    functionName: string,
    type: FunctionCallTypes
  ): Location | undefined {
    if (functionName !== '') return this.getAbiFunctionNameLocation(contractFQN, functionName);
    if (functionName === '') return this.getAbiTypeLocation(contractFQN, type);
    return undefined;
  }
}
