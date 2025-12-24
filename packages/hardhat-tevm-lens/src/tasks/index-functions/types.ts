export type FunctionData = {
  nameOrKind: string;
  name: string;
  kind: 'function' | 'receive' | 'constructor' | 'fallback' | 'freeFunction';
  visibility: 'external' | 'public' | 'internal' | 'private';
  stateMutability: 'payable' | 'pure' | 'nonpayable' | 'view';
  functionHumanReadableABI: string | undefined;
  functionSelector: string | undefined;
  src: string;
  lineStart: number;
  lineEnd: number;
  source: string;
  contractFQN: string;
  pc: number;
  parameterSlots: number;
  returnSlots: number;
  linearizationOrderNumber: number;
};

export type ContractFQN = string;
export type FunctionEntryIndexes = Array<FunctionData>;
