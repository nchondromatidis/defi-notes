export type FunctionData = {
  name: string;
  kind: 'function' | 'receive' | 'constructor' | 'fallback' | 'freeFunction';
  visibility: 'external' | 'public' | 'internal' | 'private';
  stateMutability: 'payable' | 'pure' | 'nonpayable' | 'view';
  functionSelector: string | undefined;
  src: string;
  lineStart: number;
  lineEnd: number;
  source: string;
  pc: number;
  parameterSlots: number;
  returnSlots: number;
};

export type ContractFQN = string;
export type FunctionName = string;
export type FunctionEntryIndexes = Record<ContractFQN, Array<FunctionData>>;
