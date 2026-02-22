import type { ReadOnlyFunctionCallEvent } from '../lens/call-tracer/CallTrace.ts';

export function getContractName(contractFQN?: string) {
  if (!contractFQN) return undefined;
  const [, contractName] = contractFQN.split(':');
  return contractName;
}

export function getSourceContractFqQN(event: ReadOnlyFunctionCallEvent) {
  let contractFqn = event.implContractFQN || event.contractFQN;
  if (event.callType === 'CREATE' || event.callType === 'CREATE2') {
    contractFqn = event.createdContractFQN;
  }
  if (event.callType === 'DELEGATECALL') {
    contractFqn = event.implContractFQN;
  }
  return contractFqn;
}
