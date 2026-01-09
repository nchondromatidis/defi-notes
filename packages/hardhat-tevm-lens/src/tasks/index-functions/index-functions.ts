import type { BuildInfoPair } from '../../_utils/build-info';
import type { FunctionIndexes } from './types';
import { astDereferencer, srcDecoder } from 'solidity-ast/utils.js'; // force common.js
import { toUserSource } from '../../_utils/hardhat';
import { type SourceUnit } from 'solidity-ast';
import { debug } from './_debug';
import { findContractDefinition } from '../../_utils/ast';
import { convertToFunctionIndex2 } from './processors/function-data-processor';

//*************************************** TYPES ***************************************//

// CompilerOutputBytecode types miss functionDebugData
declare module 'hardhat/types/solidity' {
  export interface CompilerOutputBytecode {
    functionDebugData?: {
      [internalFunctionName: string]: {
        entryPoint: number; // Byte offset into the bytecode where the function starts (optional)
        id: number; // AST ID of the function definition or null for compiler-internal functions (optional)
        parameterSlots: number; // Number of EVM stack slots for the function parameters (optional)
        returnSlots: number; // Number of EVM stack slots for the return values (optional)
      };
    };
  }
}

//*************************************** INDEXES ***************************************//

export function createFunctionDataIndexes(
  buildInfoPair: BuildInfoPair,
  functionIndexes: FunctionIndexes // mutates
) {
  const { buildInfoInput, buildInfoOutput, buildInfoOutputPath } = buildInfoPair;
  const contracts = buildInfoOutput.output.contracts;
  if (!contracts) {
    throw new Error(`No contracts found in build info output: ${buildInfoOutputPath}`);
  }

  const deref = astDereferencer(buildInfoOutput.output);

  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  for (const [inputSourceName, contractsData] of Object.entries(contracts)) {
    for (const [contractName, contractData] of Object.entries(contractsData)) {
      const contractFQN = toUserSource(`${inputSourceName}:${contractName}`);

      const contractFQNSourceUnit = buildInfoOutput.output.sources?.[inputSourceName]?.ast as SourceUnit | undefined;
      if (!contractFQNSourceUnit) throw new Error(`No SourceUnit for sourceName ${inputSourceName}`);
      const contractFQNContractAst = findContractDefinition(contractFQNSourceUnit, contractName);

      debug(`Indexing contract: ${contractFQN}`);

      const deployedBytecodeFunctionData = convertToFunctionIndex2(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.deployedBytecode?.functionDebugData,
        decodeSrc,
        deref
      );

      const bytecodeFunctionData = convertToFunctionIndex2(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.bytecode?.functionDebugData,
        decodeSrc,
        deref
      );

      if (deployedBytecodeFunctionData) functionIndexes.push(...deployedBytecodeFunctionData);
      if (bytecodeFunctionData) functionIndexes.push(...bytecodeFunctionData);
    }
  }
}
