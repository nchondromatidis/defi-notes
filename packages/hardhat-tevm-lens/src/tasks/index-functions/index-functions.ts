import type { BuildInfoPair } from './build-info-pairs';
import type { FunctionData, FunctionEntryIndexes } from './types';
import {
  type ASTDereferencer,
  astDereferencer,
  findAll,
  isNodeType,
  type SrcDecoder,
  srcDecoder,
} from 'solidity-ast/utils.js'; // force common.js
import { hardhatConvertFromSourceInputToContractFQN, isNotUndefined, trySync } from '../../utils';
import {
  type ContractDefinition,
  type FunctionDefinition,
  type SourceUnit,
  type VariableDeclaration,
} from 'solidity-ast';
import type { CompilerOutputBytecode } from 'hardhat/types/solidity';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { debug } from './_debug';

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

export function createFunctionIndexes(
  buildInfoPair: BuildInfoPair,
  functionEntryIndexes: FunctionEntryIndexes // mutates
) {
  const { buildInfoInput, buildInfoOutput } = buildInfoPair;
  const contracts = buildInfoOutput.output.contracts;
  if (!contracts) return undefined;

  const deref = astDereferencer(buildInfoOutput.output);

  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  for (const [inputSourceName, contractsData] of Object.entries(contracts)) {
    for (const [contractName, contractData] of Object.entries(contractsData)) {
      const contractFQN = hardhatConvertFromSourceInputToContractFQN(`${inputSourceName}:${contractName}`);

      const contractFQNSourceUnit = buildInfoOutput.output.sources?.[inputSourceName]?.ast as SourceUnit | undefined;
      if (!contractFQNSourceUnit) throw new Error(`No SourceUnit for sourceName ${inputSourceName}`);
      const contractFQNContractAst = findContractDefinition(contractFQNSourceUnit, contractName);

      debug(`Indexing contract: ${contractFQN}`);

      const deployedBytecodeFunctionData = convertToFunctionData(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.deployedBytecode?.functionDebugData,
        decodeSrc,
        deref
      );

      const bytecodeFunctionData = convertToFunctionData(
        contractFQN,
        contractFQNContractAst,
        contractData.evm?.bytecode?.functionDebugData,
        decodeSrc,
        deref
      );

      if (deployedBytecodeFunctionData) functionEntryIndexes.push(...deployedBytecodeFunctionData);
      if (bytecodeFunctionData) functionEntryIndexes.push(...bytecodeFunctionData);
    }
  }
}

function convertToFunctionData(
  contractFQN: string,
  contractFQNContractAst: ContractDefinition,
  functionDebugData: CompilerOutputBytecode['functionDebugData'],
  decodeSrc: SrcDecoder,
  deref: ASTDereferencer
) {
  if (!functionDebugData) return undefined;

  return Object.entries(functionDebugData)
    .filter(([functionName]) => functionName.startsWith('@'))
    .map(([_functionName, functionData]) => {
      const result = findAstById(deref, functionData.id);
      if (!result.ok) {
        const msg = (result.error as any).message;
        console.warn(`Failed to find ast.id: ${msg}`);
        return undefined;
      }

      const { node } = result.value;
      const { lineStart, lineEnd, source } = getLines(node.src, decodeSrc);

      if (isNodeType('FunctionDefinition', node)) {
        const fnDef = node;

        const functionHumanReadableABI = toHumanReadableAbi(fnDef, deref);
        let functionSelector = fnDef.functionSelector;
        if (!functionSelector && (fnDef.visibility === 'external' || fnDef.visibility === 'public')) {
          functionSelector = toFunctionSelector(toFunctionSignature(fnDef));
        }
        const result = findAstById(deref, fnDef.id);
        if (!result.ok) throw new Error(`Failed to find ast.id: ${result.error}`);

        const { sourceUnit: fnDefContractDefSourceUnit } = result.value;

        const fnDefContractDefs = Array.from(findAll('ContractDefinition', fnDefContractDefSourceUnit));

        if (fnDefContractDefs.length !== 1) {
          throw new Error(
            `Expected one ContractDefinition for fnDef.id=${fnDef.id}, found ${fnDefContractDefs.length}, freeFunction not supported yet`
          );
        }

        const fnDefContractDef = fnDefContractDefs[0];
        const linearizationOrderNumber =
          contractFQNContractAst.linearizedBaseContracts.indexOf(fnDefContractDef.id) + 1;

        const nameOrKind = fnDef.name ? fnDef.name : fnDef.kind;
        const newFunctionData: FunctionData = {
          nameOrKind,
          name: fnDef.name,
          kind: fnDef.kind,
          visibility: fnDef.visibility,
          stateMutability: fnDef.stateMutability,
          functionHumanReadableABI,
          functionSelector,
          src: fnDef.src,
          lineStart,
          lineEnd,
          source,
          contractFQN,
          pc: functionData.entryPoint,
          parameterSlots: functionData.parameterSlots,
          returnSlots: functionData.returnSlots,
          linearizationOrderNumber,
        };

        return newFunctionData;
      }

      // expected and ignored generated public variable getters
      console.warn(`Ignoring function call from: ast.id ${node.id}, type is ${node.nodeType}`);
      return undefined;
    })
    .filter(isNotUndefined);
}

function toFunctionSignature(node: FunctionDefinition | undefined) {
  if (!node) return undefined;

  const functionName = node.name;
  const functionSignatureParams = node.parameters.parameters
    .map((it) => {
      let paramSignature = it.typeDescriptions.typeString;
      paramSignature += it.storageLocation === 'storage' ? ' ' + it.storageLocation : '';
      return paramSignature;
    })
    .join(',');
  const functionSignature = functionName + '(' + functionSignatureParams + ')';
  if (functionName) return functionSignature;
}

function toFunctionSelector(functionSignature: string | undefined) {
  if (!functionSignature) return undefined;
  const hash = keccak_256(utf8ToBytes(functionSignature));
  return bytesToHex(hash).slice(0, 8);
}

function getLines(location: string, decodeSrc: SrcDecoder) {
  const [start, length, fileIndex] = location.split(':').map(Number);
  const endSrc = `${start + length}:0:${fileIndex}`;
  try {
    const start = decodeSrc({ src: location });
    const end = decodeSrc({ src: endSrc });

    const source1 = start.split(':')[0];
    const source2 = end.split(':')[0];
    if (source1 != source2) throw new Error(`Source does not match: ${start}, ${end}`);

    const source = hardhatConvertFromSourceInputToContractFQN(source1);

    const lineStart = Number(start.split(':')[1]);
    const lineEnd = Number(end.split(':')[1]);

    return { lineStart, lineEnd, source };
  } catch (e: unknown) {
    debug(`Location not found: ${location}: ${e}`);
    return { lineStart: -1, lineEnd: -1, source: '' };
  }
}

function toHumanReadableAbi(node: FunctionDefinition | undefined, deref: ASTDereferencer) {
  if (!node) return undefined;
  const functionNameOrKind = node.name == '' ? node.kind : node.name;

  const functionParams: string[] = [];
  node.parameters.parameters.forEach((varDeclaration) => {
    // replace storage variables with uint256
    if (varDeclaration.storageLocation === 'storage') {
      const param = `uint256 ${varDeclaration.name}`;
      functionParams.push(param);
    } else {
      const param = getParametersForFunctionInterface(varDeclaration, deref);
      functionParams.push(param);
    }
  });

  const functionReturn: string[] = [];
  node.returnParameters.parameters.forEach((varDeclaration) => {
    const param = getParametersForFunctionInterface(varDeclaration, deref);
    functionReturn.push(param);
  });

  let returns = '';
  if (functionReturn.length > 0) {
    returns = ` returns (${functionReturn.join(', ')})`;
  }

  return `function ${functionNameOrKind}(${functionParams.join(', ')})${returns}`;
}

function getParametersForFunctionInterface(params: VariableDeclaration, deref: ASTDereferencer): string {
  const returnParams: string[] = [];

  function formatType(typeNode: any): string {
    if (!typeNode) return 'unknown';

    switch (typeNode.nodeType) {
      case 'ElementaryTypeName':
        return typeNode.name;

      case 'ArrayTypeName': {
        const base = formatType(typeNode.baseType);
        let suffix = '[]';
        if (typeNode.length) {
          if (typeNode.length.nodeType === 'NumberLiteral' && typeNode.length.number !== undefined) {
            suffix = `[${typeNode.length.number}]`;
          } else if (typeNode.length.value !== undefined) {
            suffix = `[${typeNode.length.value}]`;
          }
        }
        return `${base}${suffix}`;
      }

      case 'UserDefinedTypeName': {
        const ref = deref('*', typeNode.referencedDeclaration);

        if (!ref) return 'tuple';

        if (ref.nodeType === 'StructDefinition') {
          const members = ref.members
            .map((m: any) => {
              const t = formatType(m.typeName);
              return `${t}${m.name ? ` ${m.name}` : ''}`;
            })
            .join(', ');
          return `(${members})`;
        }

        if (ref.nodeType === 'EnumDefinition') {
          return 'uint8';
        }

        return 'tuple';
      }

      case 'TupleTypeName': {
        const comps = (typeNode.components || [])
          .map((c: any) => {
            const t = formatType(c.typeName);
            return `${t}${c.name ? ` ${c.name}` : ''}`;
          })
          .join(', ');
        return `(${comps})`;
      }

      default:
        if (typeNode.typeDescriptions?.typeString) {
          return typeNode.typeDescriptions.typeString;
        }
        return 'unknown';
    }
  }

  // --- build the parameter string ---
  const typeStr = formatType(params.typeName);
  returnParams.push(typeStr);

  if (params.storageLocation && params.storageLocation !== 'default') {
    returnParams.push(params.storageLocation);
  }

  if (params.name !== '') {
    returnParams.push(params.name);
  }

  return returnParams.join(' ');
}

// AST

function findAstById(deref: ASTDereferencer, astId: number) {
  return trySync(() => deref.withSourceUnit('*', astId));
}

function findContractDefinition(contractFQNSourceUnit: SourceUnit, contractName: string) {
  const contractFQNContractAst = Array.from(findAll('ContractDefinition', contractFQNSourceUnit)).find(
    (c) => c.name === contractName
  );
  if (!contractFQNContractAst) {
    throw new Error(`No ContractDefinition for contractName=${contractName}, freeFunction not supported yet`);
  }
  return contractFQNContractAst;
}
