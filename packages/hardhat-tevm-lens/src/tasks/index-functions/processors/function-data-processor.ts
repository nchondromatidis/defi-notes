import type { CompilerOutputBytecode } from 'hardhat/types/solidity';
import { type ASTDereferencer, findAll, isNodeType } from 'solidity-ast/utils.js';
import type { SrcDecoder } from 'solidity-ast/utils';
import type { ContractDefinition } from 'solidity-ast';
import { findAstById, toFunctionSelector, toHumanReadableAbi } from '../../../_utils/ast';
import { getSrcLocation } from '../../../_utils/source-location';
import type { FunctionIndex } from '../types';
import type { Debugger } from 'debug';
import { isNotUndefined } from '../../../_utils/type-utils';

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

/** @deprecated obsolete: cannot determine function exit/callsite pc + only available on solidity >= 0.8.0 */
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
        const sourceLine = getSrcLocation(node.src, decodeSrc, debug);

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
            functionLineStart: sourceLine?.lineStart ?? -2,
            functionLineEnd: sourceLine?.lineEnd ?? -2,
            source: sourceLine?.source ?? '',
            contractFQN,
            jumpDestPc: functionData.entryPoint,
            parameterSlots: functionData.parameterSlots,
            returnSlots: functionData.returnSlots,
            linearizationOrderNumber,
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
