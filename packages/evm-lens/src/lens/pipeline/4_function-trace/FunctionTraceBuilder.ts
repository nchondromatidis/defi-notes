import { InvariantError } from '../../../_common/errors.ts';
import type { Address, Hex } from '../../types.ts';
import type { DeepReadonly } from '../../../_common/type-utils.ts';

type External = 'EXTERNAL';
type InternalCallTypes = 'INTERNAL';
type ExternalCallTypes = 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2';
// TODO: conditional types: eg FunctionCallEvent.to is only undefined when callType equals ('CREATE' || 'CREATE2')
export type FunctionTraceCall = {
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
  called?: Array<FunctionTraceCall>;
  result?: FunctionTraceResult;
};

export type FunctionTraceResult = {
  type: 'FunctionResultEvent';
  isError: boolean;
  returnValueRaw: Hex;
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

export type FunctionTraceEntry = FunctionTraceCall | FunctionTraceResult;

export type LensLog = {
  rawData: unknown;
  eventName?: string;
  args?: unknown;
  eventSignature?: string;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
};

export type ReadOnlyFunctionCallEvent = DeepReadonly<FunctionTraceCall>;

export class FunctionTraceBuilder {
  public rootFunction?: FunctionTraceCall;
  private stack: FunctionTraceCall[] = [];

  public addFunctionCall(functionTraceCallEntry: FunctionTraceCall) {
    // Ensure functionTraceCallEntry shape and defaults
    functionTraceCallEntry.called = functionTraceCallEntry.called ?? [];
    functionTraceCallEntry.result = functionTraceCallEntry.result ?? undefined;

    const parent = this.getLatestFunctionCallEvent();

    if (!this.rootFunction) {
      this.rootFunction = functionTraceCallEntry;
    } else if (parent) {
      parent.called!.push(functionTraceCallEntry);
    }

    this.stack.push(functionTraceCallEntry);
  }

  public addResult(functionTraceResultEntry: FunctionTraceResult) {
    const current = this.getLatestFunctionCallEvent();
    if (!current) {
      throw new InvariantError('Result functionTraceResultEntry raised without function call');
    }
    if (current.result) {
      throw new InvariantError('Result already exists');
    }

    current.result = functionTraceResultEntry;
    this.stack.pop();
  }

  public getLatestFunctionCallEvent(): FunctionTraceCall | undefined {
    if (this.stack.length === 0) return undefined;
    return this.stack[this.stack.length - 1];
  }
}
