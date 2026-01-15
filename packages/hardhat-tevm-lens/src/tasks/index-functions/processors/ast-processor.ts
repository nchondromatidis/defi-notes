import { type ASTDereferencer, findAll, type SrcDecoder } from 'solidity-ast/utils.js';
import type { ContractDefinition } from 'solidity-ast';
import { toFunctionSelector, toHumanReadableAbi } from '../../../_utils/ast';
import type { FunctionIndex, FunctionIndexes } from '../types';
import { getSrcLocation } from '../../../_utils/source-location';
import type { Debugger } from 'debug';
import type { BuildInfoPair } from '../../../_utils/build-info';
import { astDereferencer, srcDecoder } from 'solidity-ast/utils.js';
import { toUserSource } from '../../../_utils/hardhat';

//*************************************** PREPARE ***************************************//

export function createFunctionDataIndexes(
  buildInfoPair: BuildInfoPair,
  functionIndexes: FunctionIndexes, // mutates
  debug: Debugger
) {
  const { buildInfoInput, buildInfoOutput } = buildInfoPair;

  const deref = astDereferencer(buildInfoOutput.output);
  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  for (const [inputSourceName, inputSource] of Object.entries(buildInfoOutput.output.sources)) {
    const contractDefs = Array.from(findAll('ContractDefinition', inputSource.ast));
    for (const contractDef of contractDefs) {
      const contractName = contractDef.name;
      const contractFQN = toUserSource(`${inputSourceName}:${contractName}`);

      debug(`Indexing contract: ${contractFQN}`);
      const deployedBytecodeFunctionData = convertToFunctionIndex(contractFQN, contractDef, decodeSrc, deref, debug);
      functionIndexes.push(...deployedBytecodeFunctionData);
    }
  }
}

//*************************************** INDEX ***************************************//

function convertToFunctionIndex(
  contractFQN: string,
  contractFqnAst: ContractDefinition,
  decodeSrc: SrcDecoder,
  deref: ASTDereferencer,
  debug: Debugger
) {
  const functionIndexes: FunctionIndex[] = [];

  const fnDefs = Array.from(findAll('FunctionDefinition', contractFqnAst));

  for (const fnDef of fnDefs) {
    const functionHumanReadableABI = toHumanReadableAbi(fnDef, deref);
    let functionSelector = fnDef.functionSelector;
    if (!functionSelector && (fnDef.visibility === 'external' || fnDef.visibility === 'public')) {
      functionSelector = toFunctionSelector(fnDef);
    }

    const functionLocation = getSrcLocation(fnDef.src, decodeSrc, debug);
    const parameterSlots = fnDef.parameters.parameters.length;
    const returnSlots = fnDef.returnParameters.parameters.length;

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
      functionLineStart: functionLocation?.lineStart ?? -2,
      functionLineEnd: functionLocation?.lineEnd ?? -2,
      source: functionLocation?.userSource ?? '-2',
      contractFQN,
      parameterSlots,
      returnSlots,
    };
    functionIndexes.push(functionIndex);
  }

  return functionIndexes;
}
