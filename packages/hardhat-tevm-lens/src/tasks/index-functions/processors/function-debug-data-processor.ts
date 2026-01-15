import type { CompilerOutputBytecode } from 'hardhat/types/solidity';
import { type ASTDereferencer, findAll, isNodeType } from 'solidity-ast/utils.js';
import { astDereferencer, srcDecoder, type SrcDecoder } from 'solidity-ast/utils.js';
import type { ContractDefinition, SourceUnit } from 'solidity-ast';
import { findAstById, findContractDefinition, toFunctionSelector, toHumanReadableAbi } from '../../../_utils/ast';
import { getSrcLocation } from '../../../_utils/source-location';
import type { FunctionIndex, FunctionIndexes } from '../types';
import type { Debugger } from 'debug';
import { isNotUndefined } from '../../../_utils/type-utils';
import type { BuildInfoPair } from '../../../_utils/build-info';
import { toUserSource } from '../../../_utils/hardhat';

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

//*************************************** PREPARE ***************************************//

/**
 * @deprecated
 * functionDebugData: only available on solidity >= 0.8.0
 *
 * Note: Initially tried to combine creating function index with entry pc, now function PC is a different task
 */
export function createFunctionDataIndexes(
  buildInfoPair: BuildInfoPair,
  functionIndexes: FunctionIndexes, // mutates
  debug: Debugger
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

      const contractFQNSourceUnit = buildInfoOutput.output.sources![inputSourceName]?.ast as SourceUnit;
      const contractFQNContractAst = findContractDefinition(contractFQNSourceUnit, contractName);

      debug(`Indexing contract: ${contractFQN}`);

      const deployedBytecodeFunctionData = convertToFunctionIndex2(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.deployedBytecode?.functionDebugData,
        decodeSrc,
        deref,
        debug
      );

      const bytecodeFunctionData = convertToFunctionIndex2(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.bytecode?.functionDebugData,
        decodeSrc,
        deref,
        debug
      );

      if (deployedBytecodeFunctionData) functionIndexes.push(...deployedBytecodeFunctionData);
      if (bytecodeFunctionData) functionIndexes.push(...bytecodeFunctionData);
    }
  }
}

//*************************************** INDEX ***************************************//

export function convertToFunctionIndex2(
  contractFQN: string,
  contractFqnAst: ContractDefinition,
  functionDebugData: CompilerOutputBytecode['functionDebugData'],
  decodeSrc: SrcDecoder,
  deref: ASTDereferencer,
  debug: Debugger
) {
  if (!functionDebugData) return undefined;

  return Object.entries(functionDebugData)
    .filter(([functionName]) => functionName.startsWith('@'))
    .flatMap(([_functionName, functionData]) => {
      const result = findAstById(deref, functionData.id);
      if (!result.ok) {
        const msg = (result.error as any).message;
        console.warn(`Failed to find ast.id: ${msg}`);
        return undefined;
      }

      const { node } = result.value;

      if (isNodeType('FunctionDefinition', node)) {
        const fnDef = node;
        const srcLocation = getSrcLocation(node.src, decodeSrc, debug);

        const functionHumanReadableABI = toHumanReadableAbi(fnDef, deref);
        let functionSelector = fnDef.functionSelector;
        if (!functionSelector && (fnDef.visibility === 'external' || fnDef.visibility === 'public')) {
          functionSelector = toFunctionSelector(fnDef);
        }
        // inheritance: the bytecode is embedded in parent's opcode, but the source lives in the child's contract
        const result = findAstById(deref, fnDef.id);
        if (!result.ok) throw new Error(`Failed to find ast.id: ${result.error}`);

        const { sourceUnit: fnDefContractDefSourceUnit } = result.value;

        const sourceUnitsContractDefs = Array.from(findAll('ContractDefinition', fnDefContractDefSourceUnit));

        const functionIndexes: FunctionIndex[] = [];

        for (const sourceUnitContractDef of sourceUnitsContractDefs) {
          // inheritance: we register the child's embedded code linearization order in the parent's contract context
          const linearizationOrderNumber = contractFqnAst.linearizedBaseContracts.indexOf(sourceUnitContractDef.id);
          if (linearizationOrderNumber == -1) continue;

          const nameOrKind = fnDef.name ? fnDef.name : fnDef.kind;
          const functionIndex: FunctionIndex = {
            nameOrKind,
            name: fnDef.name,
            kind: fnDef.kind,
            visibility: fnDef.visibility,
            stateMutability: fnDef.stateMutability,
            humanReadableABI: functionHumanReadableABI,
            selector: functionSelector,
            src: fnDef.src,
            functionLineStart: srcLocation?.lineStart ?? -2,
            functionLineEnd: srcLocation?.lineEnd ?? -2,
            source: srcLocation?.userSource ?? '',
            contractFQN,
            // jumpDestPc: functionData.entryPoint,
            parameterSlots: functionData.parameterSlots,
            returnSlots: functionData.returnSlots,
            // linearizationOrderNumber,
          };
          functionIndexes.push(functionIndex);
        }

        return functionIndexes;
      }

      // expected and ignored generated public variable getters
      console.warn(`FunctionData: Ignoring function call from: ast.id ${node.id}, type is ${node.nodeType}`);
      return undefined;
    })
    .filter(isNotUndefined);
}
