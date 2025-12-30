export type FunctionIndex = {
  nameOrKind: string;
  name: string;
  kind: 'function' | 'receive' | 'constructor' | 'fallback' | 'freeFunction';
  visibility: 'external' | 'public' | 'internal' | 'private';
  stateMutability: 'payable' | 'pure' | 'nonpayable' | 'view';
  humanReadableABI: string | undefined;
  selector: string | undefined;
  src: string;
  functionLineStart: number;
  functionLineEnd: number;
  source: string;
  contractFQN: string;
  jumpDestPc: number;
  parameterSlots: number;
  returnSlots: number;
  linearizationOrderNumber: number;
};

export type FunctionIndexes = Array<FunctionIndex>;
