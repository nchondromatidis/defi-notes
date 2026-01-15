import type { ContractDefinition, FunctionDefinition, SourceUnit, VariableDeclaration } from 'solidity-ast';
import { type ASTDereferencer, findAll } from 'solidity-ast/utils.js'; // force common.js
import { trySync } from './type-utils';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { toUserSource } from './hardhat';

// ast

export function findAstById(deref: ASTDereferencer, astId: number) {
  return trySync(() => deref.withSourceUnit('*', astId));
}

export function findContractDefinition(contractFQNSourceUnit: SourceUnit, contractName: string) {
  const contractFQNContractAst = Array.from(findAll('ContractDefinition', contractFQNSourceUnit)).find(
    (c) => c.name === contractName
  );
  if (!contractFQNContractAst) {
    throw new Error(`No ContractDefinition for contractName=${contractName}, freeFunction not supported yet`);
  }
  return contractFQNContractAst;
}

export function getLinearizedBaseContractFQNs(contractDef: ContractDefinition, deref: ASTDereferencer): string[] {
  const linearizedBaseContractFQNs: string[] = [];
  for (const baseContractAstId of contractDef.linearizedBaseContracts) {
    const result = findAstById(deref, baseContractAstId);
    if (!result.ok) throw new Error(`Could not contract def ast if, ${baseContractAstId}`);

    const baseUserSourceName = toUserSource(result.value.sourceUnit.absolutePath);
    const baseContractDef = result.value.node as ContractDefinition;
    const caseContractFQN = `${baseUserSourceName}:${baseContractDef.name}`;

    linearizedBaseContractFQNs.push(caseContractFQN);
  }
  return linearizedBaseContractFQNs;
}

// function selector

export function toFunctionSelector(node: FunctionDefinition | undefined) {
  const functionSignature = toFunctionSignature(node);
  if (!functionSignature) return undefined;

  const hash = keccak_256(utf8ToBytes(functionSignature));
  return bytesToHex(hash).slice(0, 8);
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

// HumanReadableAbi

export function toHumanReadableAbi(node: FunctionDefinition | undefined, deref: ASTDereferencer) {
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
