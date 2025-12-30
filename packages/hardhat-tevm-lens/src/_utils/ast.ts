import type { SourceUnit } from 'solidity-ast';
import { type ASTDereferencer, findAll } from 'solidity-ast/utils.js'; // force common.js
import { trySync } from './type-utils';

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
