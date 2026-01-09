// import { type ASTDereferencer, findAll, type SrcDecoder } from 'solidity-ast/utils';
// import type { ContractDefinition, FunctionDefinition } from 'solidity-ast';
// import { findAstById, toFunctionSelector, toHumanReadableAbi } from '../../../_utils/ast';
// import type { FunctionIndex } from '../types';
// import { getSrcLocation } from '../../../_utils/source-location';
// import type { Debugger } from 'debug';
//
// export function convertToFunctionIndex4(
//   contractFQN: string,
//   contractFqnAst: ContractDefinition,
//   fnDefs: FunctionDefinition[],
//   decodeSrc: SrcDecoder,
//   deref: ASTDereferencer,
//   debug: Debugger
// ) {
//   const functionIndexes: FunctionIndex[] = [];
//
//   for (const fnDef of fnDefs) {
//     const functionHumanReadableABI = toHumanReadableAbi(fnDef, deref);
//     let functionSelector = fnDef.functionSelector;
//     if (!functionSelector && (fnDef.visibility === 'external' || fnDef.visibility === 'public')) {
//       functionSelector = toFunctionSelector(fnDef);
//     }
//     const result = findAstById(deref, fnDef.id);
//     if (!result.ok) throw new Error(`Failed to find ast.id: ${result.error}`);
//
//     const { sourceUnit: fnDefContractDefSourceUnit } = result.value;
//
//     const fnDefContractDefs = Array.from(findAll('ContractDefinition', fnDefContractDefSourceUnit));
//     const functionLocation = getSrcLocation(fnDef.src, decodeSrc, debug);
//
//     // one source may contain multiple ContractDefinitions
//     for (const fnDefContractDef of fnDefContractDefs) {
//       const linearizationOrderNumber = contractFqnAst.linearizedBaseContracts.indexOf(fnDefContractDef.id) + 1;
//
//       const nameOrKind = fnDef.name ? fnDef.name : fnDef.kind;
//       const functionIndex: FunctionIndex = {
//         nameOrKind,
//         name: fnDef.name,
//         kind: fnDef.kind,
//         visibility: fnDef.visibility,
//         stateMutability: fnDef.stateMutability,
//         humanReadableABI: functionHumanReadableABI,
//         selector: functionSelector,
//         src: fnDef.src,
//         functionLineStart: functionLocation?.lineStart ?? -2,
//         functionLineEnd: functionLocation?.lineEnd ?? -2,
//         source: functionLocation?.source ?? '-2',
//         contractFQN,
//         jumpDestPc: functionData.entryPoint,
//         parameterSlots: functionData.parameterSlots,
//         returnSlots: functionData.returnSlots,
//         linearizationOrderNumber,
//       };
//       functionIndexes.push(functionIndex);
//     }
//   }
//
//   return functionIndexes;
// }
