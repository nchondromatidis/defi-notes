import { InvariantError } from '../../common/errors.ts';
import type { Address, Hex } from '../types/artifact.ts';

type Unknown = 'UNKNOWN';
type CallTypes = 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2';
// TODO: conditional types: eg FunctionCallEvent.to is only undefined when callType equals ('CREATE' || 'CREATE2')
export type FunctionCallEvent = {
  type: 'FunctionCallEvent';
  to: Address | undefined;
  from: Address | undefined;
  depth: number;
  rawData: Hex;
  value: bigint;
  callType: Unknown | CallTypes;
  precompile: boolean;
  implContractFQN?: string;
  implAddress?: Address;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
  args?: unknown;
  lineStart?: number;
  lineEnd?: number;
  source?: string;
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

export class LensCallTracerResult {
  public rootFunction?: FunctionCallEvent;
  private stack: FunctionCallEvent[] = [];

  public addFunctionCall(event: FunctionCallEvent) {
    // Ensure event shape and defaults
    event.called = event.called ?? [];
    event.result = event.result ?? undefined;

    const parent = this.stack[this.stack.length - 1];

    if (!this.rootFunction) {
      this.rootFunction = event;
    } else if (parent) {
      parent.called!.push(event);
    }

    this.stack.push(event);
  }

  public addResult(event: FunctionResultEvent) {
    const current = this.stack[this.stack.length - 1];
    if (!current) {
      throw new InvariantError('Result event raised without function call');
    }
    if (current.result) {
      throw new InvariantError('Result already exists');
    }

    current.result = event;
    this.stack.pop();
  }

  public getCurrentFunctionCallEvent(): FunctionCallEvent {
    return this.stack[this.stack.length - 1];
  }
}
