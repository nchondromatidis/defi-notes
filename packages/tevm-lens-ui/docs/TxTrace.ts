type External = 'EXTERNAL';
type InternalCallTypes = 'INTERNAL';
type ExternalCallTypes = 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2';
type Address = `0x${string}`;
type Hex = `0x${string}`;

export type FunctionCallEvent = {
  type: 'FunctionCallEvent';
  to: Address | undefined;
  from: Address | undefined;
  depth: number;
  rawData: Hex;
  value: bigint;
  callType: External | ExternalCallTypes | InternalCallTypes;
  precompile: boolean;
  implContractFQN?: string;
  implAddress?: Address;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
  args?: unknown;
  functionLineStart?: number;
  functionLineEnd?: number;
  functionSource?: string;
  functionCallLineStart?: number;
  functionCallLineEnd?: number;
  create2Salt?: Hex;
  createdContractFQN?: string;
  called?: Array<FunctionCallEvent>;
  result?: FunctionResultEvent;
};

export type FunctionResultEvent = {
  type: 'FunctionResultEvent';
  isError: boolean;
  returnValueRaw: unknown;
  isCreate: boolean;
  logs: Array<LensLog>;
  errorType?: unknown;
  errorName?: string;
  errorAbiItem?: unknown;
  errorArgs?: unknown;
  returnValue?: unknown;
  createdAddress?: Address;
  createdContractFQN?: string;
};

export type LensLog = {
  rawData: unknown;
  eventName?: string;
  args?: unknown;
  eventSignature?: string;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
};
